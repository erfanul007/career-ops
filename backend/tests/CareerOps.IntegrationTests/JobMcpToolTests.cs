using CareerOps.Application.Common;
using CareerOps.Application.Companies;
using CareerOps.Application.Jobs;
using CareerOps.Domain.Companies;
using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;
using CareerOps.Infrastructure.Persistence;
using CareerOps.Presentation.Mcp;
using FluentAssertions;
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
        ((int)res.StatusCode).Should().BeOneOf(200, 406);
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
            new JobService(db, clock, new CompanyService(db)),
            new JobWorkflowService(db, clock),
            new JobActivityService(db, clock));

        await tools.transition_job(job.Id, JobStatus.Applied, null);

        var timeline = await new JobTimelineService(db).GetTimelineAsync(job.Id);
        timeline.Should().Contain(e => e.Actor == "Agent" && e.Title.Contains("Applied"));
    }
}
