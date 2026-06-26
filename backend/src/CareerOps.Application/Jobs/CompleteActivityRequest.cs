using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record CompleteActivityRequest(
    JobActivityOutcome Outcome,
    string? Feedback,
    string? Notes,
    bool CreateFollowUp
);
