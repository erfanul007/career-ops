using System.Net;
using FluentAssertions;

namespace CareerOps.IntegrationTests;

public class HealthEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Get_health_returns_200_healthy()
    {
        var client = factory.CreateClient();
        var response = await client.GetAsync("/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await response.Content.ReadAsStringAsync()).Should().Contain("Healthy");
    }
}
