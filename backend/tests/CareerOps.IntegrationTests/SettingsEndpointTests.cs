using System.Net;
using System.Net.Http.Json;

namespace CareerOps.IntegrationTests;

public class SettingsEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Put_profile_with_blank_full_name_returns_400_validation_problem()
    {
        var client = factory.CreateClient();

        var response = await client.PutAsJsonAsync("/api/settings/profile", new { fullName = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("fullname", body.ToLowerInvariant());
    }
}
