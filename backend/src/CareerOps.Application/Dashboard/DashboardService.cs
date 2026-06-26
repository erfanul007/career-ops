using CareerOps.Application.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Dashboard;

public sealed class DashboardService(IAppDbContext db, IClock clock)
{
    private static readonly JobStatus[] ActiveStatuses =
    [
        JobStatus.Discovered, JobStatus.Interested, JobStatus.Applied,
        JobStatus.Interviewing, JobStatus.Offered
    ];

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var staleThreshold = now.AddDays(-7);
        var sevenDaysAhead = now.AddDays(7);

        var activeJobs = await db.Jobs
            .Include(j => j.Company)
            .Where(j => ActiveStatuses.Contains(j.Status))
            .ToListAsync(ct);

        var activeByStatus = activeJobs
            .GroupBy(j => j.Status)
            .ToDictionary(g => g.Key, g => g.Count());

        var staleJobs = activeJobs
            .Where(j =>
                (j.UpdatedAtUtc < staleThreshold && j.NextActionAtUtc == null) ||
                (j.NextActionAtUtc.HasValue && j.NextActionAtUtc < now))
            .Select(j => new StaleJobDto(j.Id, j.Title, j.Company!.Name, j.Status, j.UpdatedAtUtc, j.NextActionAtUtc))
            .ToList();

        var todayEnd = now.Date.AddDays(1);
        var dueToday = await db.FollowUpTasks
            .CountAsync(f => f.Status == FollowUpStatus.Pending && f.DueAtUtc >= now.Date && f.DueAtUtc < todayEnd, ct);
        var overdue = await db.FollowUpTasks
            .CountAsync(f => f.Status == FollowUpStatus.Pending && f.DueAtUtc < now.Date, ct);

        var upcoming = await db.JobActivities
            .Include(a => a.Job).ThenInclude(j => j!.Company)
            .Where(a => a.Status == JobActivityStatus.Scheduled && a.ScheduledAtUtc >= now && a.ScheduledAtUtc <= sevenDaysAhead)
            .OrderBy(a => a.ScheduledAtUtc)
            .Select(a => new UpcomingActivityDto(a.JobId, a.Job!.Title, a.Job.Company!.Name, a.Id, a.Label, a.ScheduledAtUtc!.Value))
            .ToListAsync(ct);

        var offerDeadlines = await db.Jobs
            .Include(j => j.Company)
            .Where(j => j.Status == JobStatus.Offered && j.OfferDeadlineAtUtc.HasValue && j.OfferDeadlineAtUtc > now)
            .OrderBy(j => j.OfferDeadlineAtUtc)
            .Select(j => new OfferDeadlineDto(j.Id, j.Title, j.Company!.Name, j.OfferDeadlineAtUtc!.Value))
            .ToListAsync(ct);

        var profile = await db.UserProfiles.FirstOrDefaultAsync(ct);
        int? daysUntilDeadline = profile?.SearchDeadlineUtc.HasValue == true
            ? (int?)(profile.SearchDeadlineUtc!.Value - now).TotalDays
            : null;

        return new DashboardSummaryDto(activeByStatus, dueToday, overdue, upcoming, staleJobs, offerDeadlines, daysUntilDeadline);
    }
}
