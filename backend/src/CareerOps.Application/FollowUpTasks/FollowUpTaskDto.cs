using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.JobLeads;

namespace CareerOps.Application.FollowUpTasks;

public sealed record FollowUpTaskDto(
    int Id, string Title, string? Description, RelatedEntityType RelatedEntityType, int? RelatedEntityId,
    DateTime DueAtUtc, FollowUpStatus Status, Priority Priority, DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
