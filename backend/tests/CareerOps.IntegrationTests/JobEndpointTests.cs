using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace CareerOps.IntegrationTests;

public sealed class JobEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Jobs_routes_published_in_openapi()
    {
        var doc = await _client.GetStringAsync("/openapi/v1.json");
        Assert.Contains("/api/jobs", doc);
        Assert.Contains("/api/jobs/{id}/transition", doc);
        Assert.Contains("/api/jobs/{id}/timeline", doc);
    }

    [Fact]
    public async Task CreateJob_InvalidTitle_Returns400()
    {
        var res = await _client.PostAsJsonAsync("/api/jobs", new
        {
            companyId = 1,
            title = "",
            status = "Discovered",
            priority = "Medium",
            source = "LinkedIn",
            remoteMode = "OnSite",
            employmentType = "FullTime",
            salaryPeriod = "Annual"
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("title", (await res.Content.ReadAsStringAsync()).ToLowerInvariant());
    }

    [Fact]
    public async Task CreateJob_NoCompanyIdOrName_Returns400()
    {
        var res = await _client.PostAsJsonAsync("/api/jobs", new
        {
            title = "Dev",
            status = "Discovered",
            priority = "Medium",
            source = "LinkedIn",
            remoteMode = "OnSite",
            employmentType = "FullTime",
            salaryPeriod = "Annual"
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task UpdateJob_InvalidTitle_Returns400()
    {
        var res = await _client.PutAsJsonAsync("/api/jobs/1", new
        {
            companyId = 1,
            title = "",
            priority = "Medium",
            source = "LinkedIn",
            remoteMode = "OnSite",
            employmentType = "FullTime",
            salaryPeriod = "Annual"
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task UpdateActivity_BlankLabel_Returns400()
    {
        // Validation runs in the endpoint filter before any DB lookup, so no live DB is needed.
        var res = await _client.PutAsJsonAsync("/api/jobs/1/activities/1", new
        {
            label = "",
            type = "Interview",
            status = "Planned"
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("label", (await res.Content.ReadAsStringAsync()).ToLowerInvariant());
    }
}
