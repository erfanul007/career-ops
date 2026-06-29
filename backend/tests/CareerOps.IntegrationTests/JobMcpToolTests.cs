using CareerOps.Application.Common;
using CareerOps.Application.Companies;
using CareerOps.Application.FollowUpTasks;
using CareerOps.Application.Jobs;
using CareerOps.Domain.Companies;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using CareerOps.Infrastructure.Persistence;
using CareerOps.Infrastructure.Persistence.Repositories;
using CareerOps.Presentation.Mcp;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CareerOps.IntegrationTests;

public sealed class JobMcpToolTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private sealed class FixedClock(DateTime utcNow) : IClock
    {
        public DateTime UtcNow => utcNow;
        public DateOnly Today => DateOnly.FromDateTime(utcNow);
    }

    [Fact]
    public async Task Mcp_endpoint_reachable()
    {
        // MCP HTTP transport requires Accept: application/json, text/event-stream.
        // A plain POST without that header returns 406 — confirming MCP is mounted.
        var res = await _client.PostAsync("/mcp", null);
        Assert.Contains((int)res.StatusCode, new[] { 200, 406 });
    }

    // Drives the MCP handler itself (transition_job has no actor parameter — it hardcodes
    // TransitionActor.Agent internally) and asserts the result via the timeline read model.
    // This proves the MCP path sets Agent; the unit test only proves the service stores
    // whatever actor it is handed.
    [Fact]
    public async Task TransitionJob_ViaMcpTool_RecordsAgentActorInTimeline()
    {
        var clock = new FixedClock(new DateTime(2026, 6, 26, 10, 0, 0, DateTimeKind.Utc));
        var opts = new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase(nameof(TransitionJob_ViaMcpTool_RecordsAgentActorInTimeline))
            .Options;
        await using var db = new CareerOpsDbContext(opts, clock);

        var company = new Company { Name = "Acme", CreatedAtUtc = clock.UtcNow, UpdatedAtUtc = clock.UtcNow };
        db.Companies.Add(company);
        await db.SaveChangesAsync();
        var job = new Job
        {
            CompanyId = company.Id,
            Title = "Dev",
            Status = JobStatus.Interested,
            Priority = Priority.Medium,
            CreatedAtUtc = clock.UtcNow,
            UpdatedAtUtc = clock.UtcNow
        };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();

        var tools = new JobTools(
            new JobService(new JobRepository(db), new JobAttachmentRepository(db), new JobPropertyRepository(db), db, clock, new CompanyService(new CompanyRepository(db), db)),
            new JobWorkflowService(new JobRepository(db), db, clock),
            new JobActivityService(new JobActivityRepository(db), new JobRepository(db), new FollowUpTaskRepository(db), db, clock));

        await tools.transition_job(job.Id, JobStatus.Applied, null);

        var timeline = await new JobTimelineService(new JobTimelineReadRepository(db)).GetTimelineAsync(job.Id);
        Assert.Contains(timeline, e => e.Actor == "Agent" && e.Title.Contains("Applied"));
    }

    [Fact]
    public async Task DeleteFollowUp_ViaMcpTool_RemovesTask()
    {
        var clock = new FixedClock(new DateTime(2026, 6, 29, 10, 0, 0, DateTimeKind.Utc));
        var opts = new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase(nameof(DeleteFollowUp_ViaMcpTool_RemovesTask))
            .Options;
        await using var db = new CareerOpsDbContext(opts, clock);

        var task = new FollowUpTask { Title = "Ping recruiter", DueAtUtc = clock.UtcNow.AddDays(1), Status = FollowUpStatus.Pending, Priority = Priority.Medium, CreatedAtUtc = clock.UtcNow, UpdatedAtUtc = clock.UtcNow };
        db.FollowUpTasks.Add(task);
        await db.SaveChangesAsync();

        var tools = new FollowUpTools(new FollowUpTaskService(new FollowUpTaskRepository(db), new JobActivityRepository(db), db, clock));
        var ok = await tools.delete_follow_up(task.Id);

        Assert.True(ok);
        Assert.Null(await db.FollowUpTasks.FindAsync(task.Id));
    }

    [Fact]
    public async Task DeleteJobActivity_ViaMcpTool_RemovesActivity()
    {
        var clock = new FixedClock(new DateTime(2026, 6, 29, 10, 0, 0, DateTimeKind.Utc));
        var opts = new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase(nameof(DeleteJobActivity_ViaMcpTool_RemovesActivity))
            .Options;
        await using var db = new CareerOpsDbContext(opts, clock);

        var company = new Company { Name = "Acme", CreatedAtUtc = clock.UtcNow, UpdatedAtUtc = clock.UtcNow };
        db.Companies.Add(company);
        await db.SaveChangesAsync();
        var job = new Job { CompanyId = company.Id, Title = "Dev", Status = JobStatus.Interviewing, Priority = Priority.Medium, CreatedAtUtc = clock.UtcNow, UpdatedAtUtc = clock.UtcNow };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        var activity = new JobActivity { JobId = job.Id, Label = "Oops", Type = JobActivityType.Interview, Status = JobActivityStatus.Planned, Outcome = JobActivityOutcome.Unknown, CreatedAtUtc = clock.UtcNow, UpdatedAtUtc = clock.UtcNow };
        db.JobActivities.Add(activity);
        await db.SaveChangesAsync();

        var tools = new JobTools(
            new JobService(new JobRepository(db), new JobAttachmentRepository(db), new JobPropertyRepository(db), db, clock, new CompanyService(new CompanyRepository(db), db)),
            new JobWorkflowService(new JobRepository(db), db, clock),
            new JobActivityService(new JobActivityRepository(db), new JobRepository(db), new FollowUpTaskRepository(db), db, clock));

        var ok = await tools.delete_job_activity(job.Id, activity.Id);

        Assert.True(ok);
        Assert.Null(await db.JobActivities.FindAsync(activity.Id));
    }
}
