using CareerOps.Application.Dashboard;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public sealed class DashboardTools(DashboardService svc)
{
    [McpServerTool, Description("Get dashboard summary: active jobs by status, follow-ups due today, overdue, upcoming activities, stale jobs, offer deadlines.")]
    public async Task<object> get_dashboard_summary()
        => await svc.GetSummaryAsync();
}
