using System.ComponentModel;
using CareerOps.Application.FollowUpTasks;
using ModelContextProtocol.Server;

namespace CareerOps.Mcp.Tools;

[McpServerToolType]
public static class FollowUpTools
{
    [McpServerTool, Description("List follow-up tasks that are due now or overdue (pending, due-at <= now).")]
    public static Task<IReadOnlyList<FollowUpTaskDto>> ListDueFollowUps(FollowUpTaskService service, CancellationToken ct = default)
        => service.GetDueAsync(ct);
}
