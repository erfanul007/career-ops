using System.Net;
using System.Net.Http.Json;

namespace CareerOps.IntegrationTests;

public class ApplicationEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Convert_with_missing_resume_variant_returns_400()
    {
        // resumeVariantId omitted/0 -> validator fails before DB; no database needed in "Testing" env.
        var res = await _client.PostAsJsonAsync("/api/job-leads/1/convert-to-application",
            new { resumeVariantId = 0, appliedAtUtc = "2026-06-20T00:00:00Z" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
