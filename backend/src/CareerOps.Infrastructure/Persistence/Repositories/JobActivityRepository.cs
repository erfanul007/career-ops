using CareerOps.Application.Jobs;
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Infrastructure.Persistence.Repositories;

public sealed class JobActivityRepository(CareerOpsDbContext db) : IJobActivityRepository
{
    public async Task<JobActivity?> FindForJobAsync(int jobId, int activityId, CancellationToken ct = default)
        => await db.JobActivities.FirstOrDefaultAsync(a => a.Id == activityId && a.JobId == jobId, ct);

    public async Task<JobActivity?> FindByIdAsync(int activityId, CancellationToken ct = default)
        => await db.JobActivities.FirstOrDefaultAsync(a => a.Id == activityId, ct);

    public void Add(JobActivity activity) => db.JobActivities.Add(activity);

    public void Remove(JobActivity activity) => db.JobActivities.Remove(activity);
}
