using System.Net;
using System.Net.Http.Json;

namespace CareerOps.IntegrationTests;

public class CompanyEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Post_company_with_blank_name_returns_400_validation_problem()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/companies", new { name = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("name", body.ToLowerInvariant());
    }
}
