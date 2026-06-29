using CareerOps.Application.Jobs;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Infrastructure.Persistence.Repositories;

public sealed class JobTimelineReadRepository(CareerOpsDbContext db) : IJobTimelineReadRepository
{
    public async Task<JobTimelineData> GetTimelineDataAsync(int jobId, CancellationToken ct = default)
    {
        var transitions = await db.JobTransitions
            .Where(t => t.JobId == jobId)
            .OrderByDescending(t => t.ChangedAtUtc)
            .ToListAsync(ct);

        var activities = await db.JobActivities
            .Where(a => a.JobId == jobId)
            .OrderByDescending(a => a.ScheduledAtUtc ?? a.CreatedAtUtc)
            .ToListAsync(ct);

        var followUps = await db.FollowUpTasks
            .Where(f => f.JobId == jobId)
            .OrderByDescending(f => f.DueAtUtc)
            .ToListAsync(ct);

        return new JobTimelineData(transitions, activities, followUps);
    }
}
