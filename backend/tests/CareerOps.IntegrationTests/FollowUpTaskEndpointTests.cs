using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace CareerOps.IntegrationTests;

public class FollowUpTaskEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Create_with_blank_title_returns_400()
    {
        var res = await _client.PostAsJsonAsync("/api/follow-up-tasks", new
        {
            title = "", relatedEntityType = 0, dueAtUtc = "2026-06-20T00:00:00Z", status = 0, priority = 1,
        });
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await res.Content.ReadAsStringAsync()).ToLowerInvariant().Should().Contain("title");
    }
}
