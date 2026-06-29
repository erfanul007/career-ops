using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace CareerOps.IntegrationTests;

public class FollowUpTaskEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task UpdateFollowUp_with_blank_title_returns_400()
    {
        // Validation runs before DB lookup, so no live DB needed.
        var res = await _client.PutAsJsonAsync("/api/follow-up-tasks/1", new
        {
            title = "",
            dueAtUtc = "2026-06-20T00:00:00Z",
            priority = "Medium"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await res.Content.ReadAsStringAsync()).ToLowerInvariant().Should().Contain("title");
    }

    [Fact]
    public async Task CreateJobFollowUp_with_blank_title_returns_400()
    {
        // Job-scoped creation: validation runs before DB lookup.
        var res = await _client.PostAsJsonAsync("/api/jobs/1/follow-ups", new
        {
            title = "",
            dueAtUtc = "2026-06-20T00:00:00Z",
            priority = "Medium"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await res.Content.ReadAsStringAsync()).ToLowerInvariant().Should().Contain("title");
    }

    [Fact]
    public async Task UpdateFollowUp_ActivityWithoutJob_Returns400()
    {
        // JobActivityId set without JobId is rejected (validation rule) before any DB lookup.
        var res = await _client.PutAsJsonAsync("/api/follow-up-tasks/1", new
        {
            title = "Test",
            dueAtUtc = "2026-06-20T00:00:00Z",
            priority = "Medium",
            jobActivityId = 5
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await res.Content.ReadAsStringAsync()).ToLowerInvariant().Should().Contain("jobid");
    }
}
