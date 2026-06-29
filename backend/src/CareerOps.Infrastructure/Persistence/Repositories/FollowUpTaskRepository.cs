using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.FollowUpTasks;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Infrastructure.Persistence.Repositories;

public sealed class FollowUpTaskRepository(CareerOpsDbContext db) : IFollowUpTaskRepository
{
    public async Task<FollowUpTask?> FindByIdAsync(int id, CancellationToken ct = default)
        => await db.FollowUpTasks.FindAsync([id], ct);

    public async Task<FollowUpTask?> GetDetailAsync(int id, CancellationToken ct = default)
        => await db.FollowUpTasks
            .Include(f => f.Job)
            .Include(f => f.JobActivity)
            .FirstOrDefaultAsync(f => f.Id == id, ct);

    public async Task<IReadOnlyList<FollowUpTask>> ListDueAsync(DateTime dueThresholdInclusive, CancellationToken ct = default)
        => await db.FollowUpTasks
            .Include(f => f.Job)
            .Include(f => f.JobActivity)
            .Where(f => f.Status == FollowUpStatus.Pending && f.DueAtUtc <= dueThresholdInclusive)
            .OrderBy(f => f.DueAtUtc)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<FollowUpTask>> ListByJobAsync(int jobId, CancellationToken ct = default)
        => await db.FollowUpTasks
            .Include(f => f.Job)
            .Include(f => f.JobActivity)
            .Where(f => f.JobId == jobId)
            .OrderBy(f => f.DueAtUtc)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<FollowUpTask>> ListAsync(FollowUpTaskFilter filter, CancellationToken ct = default)
    {
        var q = db.FollowUpTasks
            .Include(f => f.Job)
            .Include(f => f.JobActivity)
            .AsQueryable();
        if (filter.Status.HasValue) q = q.Where(f => f.Status == filter.Status.Value);
        if (filter.JobId.HasValue) q = q.Where(f => f.JobId == filter.JobId.Value);
        if (filter.DueFromInclusive.HasValue) q = q.Where(f => f.DueAtUtc >= filter.DueFromInclusive.Value);
        if (filter.DueToExclusive.HasValue) q = q.Where(f => f.DueAtUtc < filter.DueToExclusive.Value);
        return await q.OrderBy(f => f.DueAtUtc).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<FollowUpTask>> ListByActivityAsync(int activityId, CancellationToken ct = default)
        => await db.FollowUpTasks.Where(f => f.JobActivityId == activityId).ToListAsync(ct);

    public void Add(FollowUpTask task) => db.FollowUpTasks.Add(task);

    public void Remove(FollowUpTask task) => db.FollowUpTasks.Remove(task);
}
