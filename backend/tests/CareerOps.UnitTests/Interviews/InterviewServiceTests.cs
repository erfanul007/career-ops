using CareerOps.Application.Applications;
using CareerOps.Application.Common;
using CareerOps.Application.Interviews;
using CareerOps.Application.JobLeads;
using CareerOps.Domain.Applications;
using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Interviews;
using CareerOps.Domain.JobLeads;
using CareerOps.Domain.ResumeVariants;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using DomainApplication = CareerOps.Domain.Applications.Application;

namespace CareerOps.UnitTests.Interviews;

public class InterviewServiceTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 20, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 20);
    }

    private static readonly FixedClock Clock = new();

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, Clock);

    // Seeds a company, a default resume variant, a lead at the given status, and a converted application.
    private static async Task<(CareerOpsDbContext db, int leadId, int appId)> SeedAppAsync(JobLeadStatus leadStatus)
    {
        var db = NewDb();
        var company = new Company { Name = "Equinor" }; db.Companies.Add(company);
        var variant = new ResumeVariant { Name = "Backend .NET", IsDefault = true }; db.ResumeVariants.Add(variant);
        await db.SaveChangesAsync();
        var lead = new JobLead { CompanyId = company.Id, Title = "Backend Engineer", Status = leadStatus };
        db.JobLeads.Add(lead); await db.SaveChangesAsync();
        var app = new DomainApplication
        {
            JobLeadId = lead.Id, ResumeVariantId = variant.Id, AppliedAtUtc = Clock.UtcNow,
            CurrentStage = ApplicationStage.Applied, Status = ApplicationStatus.Active,
        };
        db.Applications.Add(app); await db.SaveChangesAsync();
        return (db, lead.Id, app.Id);
    }

    private static CreateInterviewRequest CreateReq(int appId) =>
        new(appId, InterviewRoundType.RecruiterScreen, new DateTime(2026, 6, 22, 9, 0, 0, DateTimeKind.Utc),
            45, "Kari Nordmann", "Recruiter", "https://meet.example/abc", null);

    [Fact]
    public async Task Create_advances_applied_lead_to_interviewing()
    {
        var (db, leadId, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var dto = await new InterviewService(db, Clock).CreateAsync(CreateReq(appId));
        Assert.NotNull(dto);
        Assert.Equal(JobLeadStatus.Interviewing, (await db.JobLeads.FindAsync(leadId))!.Status);
        Assert.Equal(ApplicationStage.Applied, (await db.Applications.FindAsync(appId))!.CurrentStage);
    }

    [Fact]
    public async Task Create_does_not_regress_offer_lead()
    {
        var (db, leadId, appId) = await SeedAppAsync(JobLeadStatus.Offer);
        await new InterviewService(db, Clock).CreateAsync(CreateReq(appId));
        Assert.Equal(JobLeadStatus.Offer, (await db.JobLeads.FindAsync(leadId))!.Status);
    }

    [Fact]
    public async Task Create_returns_null_when_application_missing()
    {
        var db = NewDb();
        var dto = await new InterviewService(db, Clock).CreateAsync(CreateReq(999));
        Assert.Null(dto);
    }

    [Fact]
    public async Task MarkCompleted_creates_follow_up_when_required()
    {
        var (db, _, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var svc = new InterviewService(db, Clock);
        var created = await svc.CreateAsync(CreateReq(appId));
        var due = new DateTime(2026, 6, 25, 9, 0, 0, DateTimeKind.Utc);
        await svc.MarkCompletedAsync(created!.Id, new(InterviewOutcome.Passed, "Strong", true, due));

        var tasks = await db.FollowUpTasks.ToListAsync();
        var task = Assert.Single(tasks);
        Assert.Equal(RelatedEntityType.Interview, task.RelatedEntityType);
        Assert.Equal(created.Id, task.RelatedEntityId);
        Assert.Equal(FollowUpStatus.Pending, task.Status);
    }

    [Fact]
    public async Task MarkCompleted_creates_no_follow_up_when_not_required()
    {
        var (db, _, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var svc = new InterviewService(db, Clock);
        var created = await svc.CreateAsync(CreateReq(appId));
        await svc.MarkCompletedAsync(created!.Id, new(InterviewOutcome.Passed, null, false, null));
        Assert.Empty(await db.FollowUpTasks.ToListAsync());
    }

    [Fact]
    public async Task MarkCompleted_does_not_duplicate_follow_up_on_recompletion()
    {
        var (db, _, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var svc = new InterviewService(db, Clock);
        var created = await svc.CreateAsync(CreateReq(appId));
        var due = new DateTime(2026, 6, 25, 9, 0, 0, DateTimeKind.Utc);
        await svc.MarkCompletedAsync(created!.Id, new(InterviewOutcome.Passed, "x", true, due));
        await svc.MarkCompletedAsync(created.Id, new(InterviewOutcome.Passed, "x", true, due));
        Assert.Single(await db.FollowUpTasks.ToListAsync());
    }

    [Fact]
    public async Task Delete_interview_removes_its_follow_ups()
    {
        var (db, _, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var svc = new InterviewService(db, Clock);
        var created = await svc.CreateAsync(CreateReq(appId));
        await svc.MarkCompletedAsync(created!.Id, new(InterviewOutcome.Passed, null, true, new DateTime(2026, 6, 25, 9, 0, 0, DateTimeKind.Utc)));
        await svc.DeleteAsync(created.Id);
        Assert.Empty(await db.FollowUpTasks.ToListAsync());
    }

    [Fact]
    public async Task Delete_application_removes_interview_follow_ups()
    {
        var (db, _, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var interviews = new InterviewService(db, Clock);
        var created = await interviews.CreateAsync(CreateReq(appId));
        await interviews.MarkCompletedAsync(created!.Id, new(InterviewOutcome.Passed, null, true, new DateTime(2026, 6, 25, 9, 0, 0, DateTimeKind.Utc)));
        await new ApplicationService(db).DeleteAsync(appId);
        Assert.Empty(await db.FollowUpTasks.ToListAsync());
    }

    [Fact]
    public async Task Delete_lead_removes_application_and_interview_follow_ups()
    {
        var (db, leadId, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var interviews = new InterviewService(db, Clock);
        var created = await interviews.CreateAsync(CreateReq(appId));
        await interviews.MarkCompletedAsync(created!.Id, new(InterviewOutcome.Passed, null, true, new DateTime(2026, 6, 25, 9, 0, 0, DateTimeKind.Utc)));
        db.FollowUpTasks.Add(new FollowUpTask { Title = "App task", RelatedEntityType = RelatedEntityType.Application, RelatedEntityId = appId, DueAtUtc = Clock.UtcNow, Status = FollowUpStatus.Pending, Priority = Priority.Medium });
        await db.SaveChangesAsync();
        await new JobLeadService(db).DeleteAsync(leadId);
        Assert.Empty(await db.FollowUpTasks.ToListAsync());
    }

    [Fact]
    public async Task Upcoming_includes_only_scheduled_within_seven_days()
    {
        var (db, _, appId) = await SeedAppAsync(JobLeadStatus.Applied);
        var svc = new InterviewService(db, Clock);
        await svc.CreateAsync(CreateReq(appId) with { ScheduledAtUtc = Clock.UtcNow.AddDays(3) });   // in window
        await svc.CreateAsync(CreateReq(appId) with { ScheduledAtUtc = Clock.UtcNow.AddDays(10) });  // outside window
        await svc.CreateAsync(CreateReq(appId) with { ScheduledAtUtc = Clock.UtcNow.AddHours(-1) }); // past
        var upcoming = await svc.GetUpcomingAsync();
        Assert.Single(upcoming);
    }
}
