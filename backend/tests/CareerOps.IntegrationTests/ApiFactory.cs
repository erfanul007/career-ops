using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CareerOps.IntegrationTests;

// "Testing" environment keeps the app out of the dev-only startup auto-migrate,
// so liveness and validation tests run without a database (compose-free `just verify`).
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
        => builder.UseEnvironment("Testing");
}
