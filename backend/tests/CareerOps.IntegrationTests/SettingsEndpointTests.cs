using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace CareerOps.IntegrationTests;

public class SettingsEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Put_profile_with_blank_full_name_returns_400_validation_problem()
    {
        var client = factory.CreateClient();

        var response = await client.PutAsJsonAsync("/api/settings/profile", new { fullName = "" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.ToLowerInvariant().Should().Contain("fullname");
    }
}
