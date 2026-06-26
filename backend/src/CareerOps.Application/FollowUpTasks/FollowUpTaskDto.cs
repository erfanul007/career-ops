using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;

namespace CareerOps.Application.FollowUpTasks;

public record FollowUpTaskDto(
    int Id,
    int? JobId,
    string? JobTitle,
    int? JobActivityId,
    string? JobActivityLabel,
    string Title,
    string? Description,
    DateTime DueAtUtc,
    FollowUpStatus Status,
    Priority Priority,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);
