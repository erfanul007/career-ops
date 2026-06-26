using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record TransitionJobRequest(JobStatus ToStatus, string? Notes);
