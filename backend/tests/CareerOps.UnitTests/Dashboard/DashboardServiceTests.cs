using CareerOps.Application.Common;
using CareerOps.Application.Dashboard;
using CareerOps.Domain.Applications;
using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Interviews;
using CareerOps.Domain.JobLeads;
using CareerOps.Domain.ResumeVariants;
using CareerOps.Domain.UserProfiles;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using DomainApplication = CareerOps.Domain.Applications.Application;

namespace CareerOps.UnitTests.Dashboard;

public class DashboardServiceTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 21, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 21);
    }

    private sealed class ClockAt(DateTime utcNow) : IClock
    {
        public DateTime UtcNow => utcNow;
        public DateOnly Today => DateOnly.FromDateTime(utcNow);
    }

    private static readonly FixedClock Clock = new();

    // Shared root so two contexts opened on the same database name see each other's data —
    // required for the stale-by-UpdatedAtUtc test, which seeds via a past-clock context.
    private static readonly InMemoryDatabaseRoot Root = new();

    private static CareerOpsDbContext Db(string name, IClock clock) =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>().UseInMemoryDatabase(name, Root).Options, clock);

    private static string NewName() => $"careerops-{Guid.NewGuid()}";

    private static async Task<(int companyId, int variantId)> SeedRefsAsync(CareerOpsDbContext db)
    {
        var company = new Company { Name = "Equinor" }; db.Companies.Add(company);
        var variant = new ResumeVariant { Name = "Backend .NET", IsDefault = true }; db.ResumeVariants.Add(variant);
        await db.SaveChangesAsync();
        return (company.Id, variant.Id);
    }

    private static async Task<int> AddLeadAsync(CareerOpsDbContext db, int companyId, JobLeadStatus status, Priority priority)
    {
        var lead = new JobLead { CompanyId = companyId, Title = $"Role {status}-{priority}", Status = status, Priority = priority };
        db.JobLeads.Add(lead); await db.SaveChangesAsync();
        return lead.Id;
    }

    private static async Task<int> AddAppAsync(CareerOpsDbContext db, int leadId, int variantId,
        ApplicationStatus status, ApplicationStage stage, DateTime? nextActionAtUtc)
    {
        var app = new DomainApplication
        {
            JobLeadId = leadId, ResumeVariantId = variantId, AppliedAtUtc = Clock.UtcNow,
            CurrentStage = stage, Status = status, NextActionAtUtc = nextActionAtUtc,
        };
        db.Applications.Add(app); await db.SaveChangesAsync();
        return app.Id;
    }

    [Fact]
    public async Task Empty_database_returns_zeroes_and_empty_lists()
    {
        using var db = Db(NewName(), Clock);
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal(0, summary.ActiveApplicationCount);
        Assert.Empty(summary.LeadsByStatus);
        Assert.Empty(summary.ApplicationsByStage);
        Assert.Empty(summary.FollowUpsDue);
        Assert.Empty(summary.OverdueFollowUps);
        Assert.Empty(summary.UpcomingInterviews);
        Assert.Empty(summary.HighPriorityLeads);
        Assert.Empty(summary.StaleApplications);
        Assert.Null(summary.SearchDeadline);
    }

    [Fact]
    public async Task ActiveApplicationCount_counts_only_active()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, variantId) = await SeedRefsAsync(db);
        var l1 = await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.Medium);
        var l2 = await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.Medium);
        await AddAppAsync(db, l1, variantId, ApplicationStatus.Active, ApplicationStage.Applied, null);
        await AddAppAsync(db, l2, variantId, ApplicationStatus.Rejected, ApplicationStage.Rejected, null);
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal(1, summary.ActiveApplicationCount);
    }

    [Fact]
    public async Task LeadsByStatus_groups_and_counts()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, _) = await SeedRefsAsync(db);
        await AddLeadAsync(db, companyId, JobLeadStatus.Discovered, Priority.Low);
        await AddLeadAsync(db, companyId, JobLeadStatus.Discovered, Priority.Low);
        await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.Low);
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal(2, summary.LeadsByStatus.Single(s => s.Status == JobLeadStatus.Discovered).Count);
        Assert.Equal(1, summary.LeadsByStatus.Single(s => s.Status == JobLeadStatus.Applied).Count);
    }

    [Fact]
    public async Task ApplicationsByStage_groups_and_counts()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, variantId) = await SeedRefsAsync(db);
        var l1 = await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.Medium);
        var l2 = await AddLeadAsync(db, companyId, JobLeadStatus.Interviewing, Priority.Medium);
        await AddAppAsync(db, l1, variantId, ApplicationStatus.Active, ApplicationStage.Applied, null);
        await AddAppAsync(db, l2, variantId, ApplicationStatus.Active, ApplicationStage.TechnicalScreen, null);
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal(1, summary.ApplicationsByStage.Single(s => s.Stage == ApplicationStage.Applied).Count);
        Assert.Equal(1, summary.ApplicationsByStage.Single(s => s.Stage == ApplicationStage.TechnicalScreen).Count);
    }

    [Fact]
    public async Task FollowUps_partitioned_into_due_today_and_overdue()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        db.FollowUpTasks.AddRange(
            new FollowUpTask { Title = "overdue", DueAtUtc = new DateTime(2026, 6, 20, 9, 0, 0, DateTimeKind.Utc), Status = FollowUpStatus.Pending, Priority = Priority.Medium },
            new FollowUpTask { Title = "today", DueAtUtc = new DateTime(2026, 6, 21, 8, 0, 0, DateTimeKind.Utc), Status = FollowUpStatus.Pending, Priority = Priority.Medium },
            new FollowUpTask { Title = "future", DueAtUtc = new DateTime(2026, 6, 22, 8, 0, 0, DateTimeKind.Utc), Status = FollowUpStatus.Pending, Priority = Priority.Medium },
            new FollowUpTask { Title = "done", DueAtUtc = new DateTime(2026, 6, 21, 8, 0, 0, DateTimeKind.Utc), Status = FollowUpStatus.Completed, Priority = Priority.Medium });
        await db.SaveChangesAsync();
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal("today", Assert.Single(summary.FollowUpsDue).Title);
        Assert.Equal("overdue", Assert.Single(summary.OverdueFollowUps).Title);
    }

    [Fact]
    public async Task Upcoming_interviews_within_seven_days()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, variantId) = await SeedRefsAsync(db);
        var leadId = await AddLeadAsync(db, companyId, JobLeadStatus.Interviewing, Priority.Medium);
        var appId = await AddAppAsync(db, leadId, variantId, ApplicationStatus.Active, ApplicationStage.TechnicalScreen, null);
        db.Interviews.AddRange(
            new Interview { ApplicationId = appId, RoundType = InterviewRoundType.Technical, ScheduledAtUtc = Clock.UtcNow.AddDays(3), Status = InterviewStatus.Scheduled },
            new Interview { ApplicationId = appId, RoundType = InterviewRoundType.Technical, ScheduledAtUtc = Clock.UtcNow.AddDays(10), Status = InterviewStatus.Scheduled },
            new Interview { ApplicationId = appId, RoundType = InterviewRoundType.Technical, ScheduledAtUtc = Clock.UtcNow.AddHours(-2), Status = InterviewStatus.Scheduled });
        await db.SaveChangesAsync();
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Single(summary.UpcomingInterviews);
    }

    [Fact]
    public async Task HighPriorityLeads_match_priority_and_status_rule()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, _) = await SeedRefsAsync(db);
        await AddLeadAsync(db, companyId, JobLeadStatus.Discovered, Priority.High);     // in
        await AddLeadAsync(db, companyId, JobLeadStatus.Interested, Priority.Critical); // in
        await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.High);        // out (status)
        await AddLeadAsync(db, companyId, JobLeadStatus.Discovered, Priority.Low);      // out (priority)
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal(2, summary.HighPriorityLeads.Count);
    }

    [Fact]
    public async Task Stale_includes_active_with_no_next_action_and_old_update()
    {
        var name = NewName();
        using (var past = Db(name, new ClockAt(Clock.UtcNow.AddDays(-10))))
        {
            var (companyId, variantId) = await SeedRefsAsync(past);
            var leadId = await AddLeadAsync(past, companyId, JobLeadStatus.Applied, Priority.Medium);
            await AddAppAsync(past, leadId, variantId, ApplicationStatus.Active, ApplicationStage.Applied, null);
        }
        using var db = Db(name, Clock);
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Single(summary.StaleApplications);
    }

    [Fact]
    public async Task Stale_includes_active_with_past_next_action()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, variantId) = await SeedRefsAsync(db);
        var leadId = await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.Medium);
        await AddAppAsync(db, leadId, variantId, ApplicationStatus.Active, ApplicationStage.Applied, Clock.UtcNow.AddDays(-1));
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Single(summary.StaleApplications);
    }

    [Fact]
    public async Task Stale_excludes_active_with_future_next_action_and_recent_update()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        var (companyId, variantId) = await SeedRefsAsync(db);
        var leadId = await AddLeadAsync(db, companyId, JobLeadStatus.Applied, Priority.Medium);
        await AddAppAsync(db, leadId, variantId, ApplicationStatus.Active, ApplicationStage.Applied, Clock.UtcNow.AddDays(3));
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Empty(summary.StaleApplications);
    }

    [Fact]
    public async Task Stale_excludes_non_active()
    {
        var name = NewName();
        using (var past = Db(name, new ClockAt(Clock.UtcNow.AddDays(-10))))
        {
            var (companyId, variantId) = await SeedRefsAsync(past);
            var leadId = await AddLeadAsync(past, companyId, JobLeadStatus.Rejected, Priority.Medium);
            await AddAppAsync(past, leadId, variantId, ApplicationStatus.Rejected, ApplicationStage.Rejected, null);
        }
        using var db = Db(name, Clock);
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Empty(summary.StaleApplications);
    }

    [Fact]
    public async Task SearchDeadline_counts_whole_days_remaining()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        db.UserProfiles.Add(new UserProfile { SearchDeadlineUtc = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc) });
        await db.SaveChangesAsync();
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.NotNull(summary.SearchDeadline);
        Assert.Equal(10, summary.SearchDeadline!.DaysRemaining);
    }

    [Fact]
    public async Task SearchDeadline_negative_when_passed()
    {
        var name = NewName();
        using var db = Db(name, Clock);
        db.UserProfiles.Add(new UserProfile { SearchDeadlineUtc = new DateTime(2026, 6, 18, 0, 0, 0, DateTimeKind.Utc) });
        await db.SaveChangesAsync();
        var summary = await new DashboardService(db, Clock).GetSummaryAsync();
        Assert.Equal(-3, summary.SearchDeadline!.DaysRemaining);
    }
}
