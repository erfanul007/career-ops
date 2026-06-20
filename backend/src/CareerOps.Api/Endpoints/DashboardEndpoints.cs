using CareerOps.Application.Dashboard;

namespace CareerOps.Api.Endpoints;

public static class DashboardEndpoints
{
    public static RouteGroupBuilder MapDashboard(this RouteGroupBuilder group)
    {
        group.MapGet("/summary", async (DashboardService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.GetSummaryAsync(ct)))
            .WithName("GetDashboardSummary");

        return group;
    }
}
