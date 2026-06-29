using CareerOps.Application.Dashboard;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using CareerOps.Infrastructure.Persistence;
using CareerOps.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Xunit;

namespace CareerOps.UnitTests.Dashboard;

public sealed class DashboardServiceTests
{
    private sealed class FixedClock(DateTime utcNow) : CareerOps.Application.Common.IClock
    {
        public DateTime UtcNow => utcNow;
        public DateOnly Today => DateOnly.FromDateTime(utcNow);
    }

    private static readonly InMemoryDatabaseRoot Root = new();

    private static CareerOpsDbContext Db(string name, FixedClock clock)
    {
        var opts = new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase(name, Root).Options;
        return new CareerOpsDbContext(opts, clock);
    }

    private static async Task<int> SeedCompany(CareerOpsDbContext db)
    {
        var c = new CareerOps.Domain.Companies.Company { Name = "Acme", CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.Companies.Add(c);
        await db.SaveChangesAsync();
        return c.Id;
    }

    [Fact]
    public async Task StaleJob_NoUpdateIn7Days_NullNextAction_IsStale()
    {
        var dbName = nameof(StaleJob_NoUpdateIn7Days_NullNextAction_IsStale);
        var now = new DateTime(2026, 6, 25, 12, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        // Seed with a past clock so UpdatedAtUtc gets stamped 8 days ago
        var pastClock = new FixedClock(now.AddDays(-8));
        await using (var db = Db(dbName, pastClock))
        {
            var companyId = await SeedCompany(db);
            var job = new Job
            {
                CompanyId = companyId,
                Title = "Old Job",
                Status = JobStatus.Applied,
                Priority = Priority.Medium,
                NextActionAtUtc = null
            };
            db.Jobs.Add(job);
            await db.SaveChangesAsync();
        }

        await using var db2 = Db(dbName, clock);
        var svc = new DashboardService(new DashboardReadRepository(db2), new UserProfileRepository(db2), clock);
        var summary = await svc.GetSummaryAsync();

        Assert.Contains(summary.StaleJobs, s => s.Title == "Old Job");
    }

    [Fact]
    public async Task StaleJob_OverdueNextAction_IsStale()
    {
        var dbName = nameof(StaleJob_OverdueNextAction_IsStale);
        var now = new DateTime(2026, 6, 25, 12, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var companyId = await SeedCompany(db);
        var job = new Job
        {
            CompanyId = companyId,
            Title = "Overdue Job",
            Status = JobStatus.Interested,
            Priority = Priority.Medium,
            CreatedAtUtc = now.AddDays(-3),
            UpdatedAtUtc = now.AddDays(-1),
            NextActionAtUtc = now.AddDays(-2)
        };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();

        var svc = new DashboardService(new DashboardReadRepository(db), new UserProfileRepository(db), clock);
        var summary = await svc.GetSummaryAsync();

        Assert.Contains(summary.StaleJobs, s => s.Id == job.Id);
    }

    [Fact]
    public async Task ClosedStatus_ExcludedFromActiveCountsAndStale()
    {
        var dbName = nameof(ClosedStatus_ExcludedFromActiveCountsAndStale);
        var now = new DateTime(2026, 6, 25, 12, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var companyId = await SeedCompany(db);
        var rejected = new Job
        {
            CompanyId = companyId,
            Title = "Rejected",
            Status = JobStatus.Rejected,
            Priority = Priority.Low,
            CreatedAtUtc = now.AddDays(-20),
            UpdatedAtUtc = now.AddDays(-15),
            NextActionAtUtc = null
        };
        db.Jobs.Add(rejected);
        await db.SaveChangesAsync();

        var svc = new DashboardService(new DashboardReadRepository(db), new UserProfileRepository(db), clock);
        var summary = await svc.GetSummaryAsync();

        Assert.DoesNotContain(summary.StaleJobs, s => s.Id == rejected.Id);
        Assert.False(summary.ActiveJobsByStatus.ContainsKey(JobStatus.Rejected));
    }

    [Fact]
    public async Task Summary_CountsDueTodayAndOverdueFollowUps()
    {
        var dbName = nameof(Summary_CountsDueTodayAndOverdueFollowUps);
        var now = new DateTime(2026, 6, 25, 12, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        db.FollowUpTasks.Add(new FollowUpTask { Title = "today", DueAtUtc = new DateTime(2026, 6, 25, 15, 0, 0, DateTimeKind.Utc), Status = FollowUpStatus.Pending, Priority = Priority.Medium });
        db.FollowUpTasks.Add(new FollowUpTask { Title = "overdue", DueAtUtc = new DateTime(2026, 6, 24, 9, 0, 0, DateTimeKind.Utc), Status = FollowUpStatus.Pending, Priority = Priority.Medium });
        db.FollowUpTasks.Add(new FollowUpTask { Title = "future", DueAtUtc = new DateTime(2026, 6, 27, 9, 0, 0, DateTimeKind.Utc), Status = FollowUpStatus.Pending, Priority = Priority.Medium });
        db.FollowUpTasks.Add(new FollowUpTask { Title = "done-today", DueAtUtc = new DateTime(2026, 6, 25, 8, 0, 0, DateTimeKind.Utc), Status = FollowUpStatus.Completed, Priority = Priority.Medium });
        await db.SaveChangesAsync();

        var svc = new DashboardService(new DashboardReadRepository(db), new UserProfileRepository(db), clock);
        var summary = await svc.GetSummaryAsync();

        Assert.Equal(1, summary.FollowUpsDueToday);
        Assert.Equal(1, summary.OverdueFollowUps);
    }

    [Fact]
    public async Task Summary_ListsUpcomingActivitiesAndOfferDeadlines()
    {
        var dbName = nameof(Summary_ListsUpcomingActivitiesAndOfferDeadlines);
        var now = new DateTime(2026, 6, 25, 12, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var companyId = await SeedCompany(db);
        var job = new Job { CompanyId = companyId, Title = "Dev", Status = JobStatus.Interviewing, Priority = Priority.Medium };
        var offered = new Job { CompanyId = companyId, Title = "Lead", Status = JobStatus.Offered, Priority = Priority.Medium, OfferDeadlineAtUtc = now.AddDays(3) };
        db.Jobs.Add(job);
        db.Jobs.Add(offered);
        await db.SaveChangesAsync();
        db.JobActivities.Add(new JobActivity { JobId = job.Id, Label = "Round 1", Type = JobActivityType.Interview, Status = JobActivityStatus.Scheduled, Outcome = JobActivityOutcome.Unknown, ScheduledAtUtc = now.AddDays(2) });
        await db.SaveChangesAsync();

        var svc = new DashboardService(new DashboardReadRepository(db), new UserProfileRepository(db), clock);
        var summary = await svc.GetSummaryAsync();

        Assert.Contains(summary.UpcomingActivities, a => a.ActivityLabel == "Round 1" && a.JobTitle == "Dev" && a.CompanyName == "Acme");
        Assert.Contains(summary.OfferDeadlines, o => o.Title == "Lead" && o.CompanyName == "Acme");
    }
}
