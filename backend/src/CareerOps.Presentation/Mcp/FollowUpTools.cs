using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public sealed class FollowUpTools(FollowUpTaskService svc)
{
    [McpServerTool, Description("List follow-up tasks. Filter by due (today, overdue, all), status, or jobId.")]
    public async Task<object> list_follow_ups(
        [Description("'today' = due today, 'overdue' = past due, 'all' = everything (default: all)")] string? due = null,
        [Description("Filter by status")] FollowUpStatus? status = null,
        [Description("Filter by job ID")] int? jobId = null)
        => await svc.ListAllAsync(status, jobId, due);

    [McpServerTool, Description("Add a follow-up task. Optionally link to a job or job activity.")]
    public async Task<object> add_follow_up(
        [Description("Task title")] string title,
        [Description("Due date (UTC)")] DateTime dueAtUtc,
        [Description("Priority")] Priority priority = Priority.Medium,
        [Description("Description")] string? description = null,
        [Description("Job ID (optional)")] int? jobId = null,
        [Description("Job activity ID (requires jobId)")] int? jobActivityId = null)
        => await svc.CreateAsync(new CreateFollowUpTaskRequest(title, description, dueAtUtc, priority, jobId, jobActivityId));

    [McpServerTool, Description("Mark a follow-up task as completed.")]
    public async Task<bool> complete_follow_up([Description("Follow-up task ID")] int taskId)
        => await svc.CompleteAsync(taskId);

    [McpServerTool, Description("Skip (dismiss) a follow-up task.")]
    public async Task<bool> skip_follow_up([Description("Follow-up task ID")] int taskId)
        => await svc.SkipAsync(taskId);

    [McpServerTool, Description("Delete a follow-up task permanently.")]
    public async Task<bool> delete_follow_up([Description("Follow-up task ID")] int taskId)
        => await svc.DeleteAsync(taskId);
}
