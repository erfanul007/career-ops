using CareerOps.Application.Dashboard;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Infrastructure.Persistence.Repositories;

public sealed class DashboardReadRepository(CareerOpsDbContext db) : IDashboardReadRepository
{
    public async Task<IReadOnlyList<Job>> ListActiveJobsWithCompanyAsync(
        IReadOnlyCollection<JobStatus> statuses, CancellationToken ct = default)
        => await db.Jobs
            .Include(j => j.Company)
            .Where(j => statuses.Contains(j.Status))
            .ToListAsync(ct);

    public async Task<int> CountPendingFollowUpsDueBetweenAsync(
        DateTime fromInclusive, DateTime toExclusive, CancellationToken ct = default)
        => await db.FollowUpTasks
            .CountAsync(f => f.Status == FollowUpStatus.Pending && f.DueAtUtc >= fromInclusive && f.DueAtUtc < toExclusive, ct);

    public async Task<int> CountPendingFollowUpsOverdueAsync(
        DateTime beforeExclusive, CancellationToken ct = default)
        => await db.FollowUpTasks
            .CountAsync(f => f.Status == FollowUpStatus.Pending && f.DueAtUtc < beforeExclusive, ct);

    public async Task<List<UpcomingActivityDto>> ListUpcomingActivitiesAsync(
        DateTime fromInclusive, DateTime toInclusive, CancellationToken ct = default)
        => await db.JobActivities
            .Include(a => a.Job).ThenInclude(j => j!.Company)
            .Where(a => a.Status == JobActivityStatus.Scheduled && a.ScheduledAtUtc >= fromInclusive && a.ScheduledAtUtc <= toInclusive)
            .OrderBy(a => a.ScheduledAtUtc)
            .Select(a => new UpcomingActivityDto(a.JobId, a.Job!.Title, a.Job.Company!.Name, a.Id, a.Label, a.ScheduledAtUtc!.Value))
            .ToListAsync(ct);

    public async Task<List<OfferDeadlineDto>> ListOfferDeadlinesAsync(
        DateTime afterExclusive, CancellationToken ct = default)
        => await db.Jobs
            .Include(j => j.Company)
            .Where(j => j.Status == JobStatus.Offered && j.OfferDeadlineAtUtc.HasValue && j.OfferDeadlineAtUtc > afterExclusive)
            .OrderBy(j => j.OfferDeadlineAtUtc)
            .Select(j => new OfferDeadlineDto(j.Id, j.Title, j.Company!.Name, j.OfferDeadlineAtUtc!.Value))
            .ToListAsync(ct);
}
