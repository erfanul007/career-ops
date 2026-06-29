using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public interface IJobPropertyRepository
{
    Task<JobProperty?> FindByKeyAsync(int jobId, string key, CancellationToken ct = default);
    void Add(JobProperty property);
    void Remove(JobProperty property);
}
