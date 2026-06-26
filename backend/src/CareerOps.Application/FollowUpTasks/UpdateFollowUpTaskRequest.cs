using CareerOps.Domain.Common;

namespace CareerOps.Application.FollowUpTasks;

public record UpdateFollowUpTaskRequest(
    string Title,
    string? Description,
    DateTime DueAtUtc,
    Priority Priority,
    int? JobId,
    int? JobActivityId
);
