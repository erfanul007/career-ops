using CareerOps.Domain.FollowUpTasks;

namespace CareerOps.Application.FollowUpTasks;

public interface IFollowUpTaskRepository
{
    Task<FollowUpTask?> FindByIdAsync(int id, CancellationToken ct = default);
    Task<FollowUpTask?> GetDetailAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<FollowUpTask>> ListDueAsync(DateTime dueThresholdInclusive, CancellationToken ct = default);
    Task<IReadOnlyList<FollowUpTask>> ListByJobAsync(int jobId, CancellationToken ct = default);
    Task<IReadOnlyList<FollowUpTask>> ListAsync(FollowUpTaskFilter filter, CancellationToken ct = default);
    Task<IReadOnlyList<FollowUpTask>> ListByActivityAsync(int activityId, CancellationToken ct = default);
    void Add(FollowUpTask task);
    void Remove(FollowUpTask task);
}
