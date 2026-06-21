using CareerOps.Application.Common;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace CareerOps.Presentation.HealthChecks;

public sealed class DatabaseHealthCheck(IAppDbContext db) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var canConnect = await db.CanConnectAsync(cancellationToken);
        return canConnect
            ? HealthCheckResult.Healthy("Database reachable")
            : HealthCheckResult.Unhealthy("Database unreachable");
    }
}
