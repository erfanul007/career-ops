using CareerOps.Domain.FollowUpTasks;

namespace CareerOps.Application.FollowUpTasks;

public sealed record FollowUpTaskFilter(
    FollowUpStatus? Status = null,
    int? JobId = null,
    DateTime? DueFromInclusive = null,
    DateTime? DueToExclusive = null
);
