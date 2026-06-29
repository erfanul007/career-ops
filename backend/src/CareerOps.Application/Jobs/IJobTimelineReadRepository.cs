using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public interface IJobTimelineReadRepository
{
    Task<JobTimelineData> GetTimelineDataAsync(int jobId, CancellationToken ct = default);
}

public sealed record JobTimelineData(
    IReadOnlyList<JobTransition> Transitions,
    IReadOnlyList<JobActivity> Activities,
    IReadOnlyList<FollowUpTask> FollowUps
);
