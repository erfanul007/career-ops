namespace CareerOps.IntegrationTests;

// The "Testing" environment has no database, so this asserts the route is published
// (DB-free) rather than fetching live data. Service logic is covered by DashboardServiceTests.
public class DashboardEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Summary_endpoint_is_published_in_openapi()
    {
        var doc = await _client.GetStringAsync("/openapi/v1.json");
        Assert.Contains("/api/dashboard/summary", doc);
    }
}
