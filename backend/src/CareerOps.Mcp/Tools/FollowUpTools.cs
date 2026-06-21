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

    [McpServerTool, Description("Create a follow-up task (title, due date, priority; optionally linked to a job lead / application / interview).")]
    public static Task<FollowUpTaskDto> CreateFollowUp(CreateFollowUpTaskRequest request, FollowUpTaskService service, CancellationToken ct = default)
        => service.CreateAsync(request, ct);

    [McpServerTool, Description("Mark a follow-up task complete. Returns null if not found.")]
    public static Task<FollowUpTaskDto?> CompleteFollowUp(int id, FollowUpTaskService service, CancellationToken ct = default)
        => service.CompleteAsync(id, ct);

    [McpServerTool, Description("Skip a follow-up task. Returns null if not found.")]
    public static Task<FollowUpTaskDto?> SkipFollowUp(int id, FollowUpTaskService service, CancellationToken ct = default)
        => service.SkipAsync(id, ct);
}
