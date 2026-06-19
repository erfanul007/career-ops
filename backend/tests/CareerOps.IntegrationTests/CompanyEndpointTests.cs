using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace CareerOps.IntegrationTests;

public class CompanyEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Post_company_with_blank_name_returns_400_validation_problem()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/companies", new { name = "" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.ToLowerInvariant().Should().Contain("name");
    }
}
