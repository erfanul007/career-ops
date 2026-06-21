using System.ComponentModel;
using CareerOps.Application.FollowUpTasks;
using ModelContextProtocol.Server;

namespace CareerOps.Presentation.Mcp;

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

    [McpServerTool, Description("List ALL follow-up tasks (not only those due/overdue).")]
    public static Task<IReadOnlyList<FollowUpTaskDto>> ListFollowUps(FollowUpTaskService service, CancellationToken ct = default)
        => service.ListAsync(ct);

    [McpServerTool, Description("Get one follow-up task by id. Returns null if not found.")]
    public static Task<FollowUpTaskDto?> GetFollowUp(int id, FollowUpTaskService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);

    [McpServerTool, Description("Update a follow-up task (title, description, related entity, due date, status, priority). Returns null if not found.")]
    public static Task<FollowUpTaskDto?> UpdateFollowUp(int id, UpdateFollowUpTaskRequest request, FollowUpTaskService service, CancellationToken ct = default)
        => service.UpdateAsync(id, request, ct);

    [McpServerTool, Description("Delete a follow-up task by id. Returns true if deleted, false if not found.")]
    public static Task<bool> DeleteFollowUp(int id, FollowUpTaskService service, CancellationToken ct = default)
        => service.DeleteAsync(id, ct);
}
