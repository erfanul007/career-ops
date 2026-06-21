using System.ComponentModel;
using CareerOps.Application.Dashboard;
using ModelContextProtocol.Server;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public static class DashboardTools
{
    [McpServerTool, Description("Get the full dashboard summary: active application count, leads by status, applications by stage, follow-ups due today, overdue follow-ups, upcoming interviews (next 7 days), high-priority leads, stale applications, and the search-deadline countdown.")]
    public static Task<DashboardSummaryDto> GetDashboardSummary(DashboardService service, CancellationToken ct = default)
        => service.GetSummaryAsync(ct);
}
