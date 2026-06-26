using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record JobTransitionDto(
    int Id,
    int JobId,
    JobStatus? FromStatus,
    JobStatus ToStatus,
    DateTime ChangedAtUtc,
    TransitionActor Actor,
    string? Notes
);
