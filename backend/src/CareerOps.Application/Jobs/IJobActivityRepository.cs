using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public interface IJobActivityRepository
{
    Task<JobActivity?> FindForJobAsync(int jobId, int activityId, CancellationToken ct = default);
    Task<JobActivity?> FindByIdAsync(int activityId, CancellationToken ct = default);
    void Add(JobActivity activity);
    void Remove(JobActivity activity);
}
