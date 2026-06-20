using System.Net;
using System.Net.Http.Json;

namespace CareerOps.IntegrationTests;

public class ResumeVariantEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Create_with_blank_name_returns_400()
    {
        var res = await _client.PostAsJsonAsync("/api/resume-variants", new { name = "", targetRole = "x" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
