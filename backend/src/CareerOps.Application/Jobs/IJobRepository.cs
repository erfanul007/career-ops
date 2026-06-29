using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public interface IJobRepository
{
    Task<Job?> FindByIdAsync(int id, CancellationToken ct = default);
    Task<Job?> GetDetailAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<Job>> ListAsync(ListJobsQuery query, CancellationToken ct = default);
    Task<bool> ExistsAsync(int id, CancellationToken ct = default);
    void Add(Job job);
    void Remove(Job job);
}
