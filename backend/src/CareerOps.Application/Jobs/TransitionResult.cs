using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record TransitionResult(JobStatus NewStatus, string? Suggestion);
