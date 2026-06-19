using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace CareerOps.IntegrationTests;

public class JobLeadEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Post_job_lead_with_blank_title_returns_400()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/job-leads",
            new { title = "", companyId = 1, priority = 2, status = 0 });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).ToLowerInvariant().Should().Contain("title");
    }

    [Fact]
    public async Task Post_job_lead_without_company_returns_400()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/job-leads",
            new { title = "Backend Engineer", priority = 2, status = 0 });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
