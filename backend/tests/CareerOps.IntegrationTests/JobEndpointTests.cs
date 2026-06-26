using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace CareerOps.IntegrationTests;

public sealed class JobEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Jobs_routes_published_in_openapi()
    {
        var doc = await _client.GetStringAsync("/openapi/v1.json");
        doc.Should().Contain("/api/jobs");
        doc.Should().Contain("/api/jobs/{id}/transition");
        doc.Should().Contain("/api/jobs/{id}/timeline");
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

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await res.Content.ReadAsStringAsync()).ToLowerInvariant().Should().Contain("title");
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

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
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

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
