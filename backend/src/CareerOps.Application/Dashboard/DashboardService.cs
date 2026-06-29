using CareerOps.Application.Common;
using CareerOps.Application.Settings;
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Dashboard;

public sealed class DashboardService(
    IDashboardReadRepository dashboard,
    IUserProfileRepository profiles,
    IClock clock)
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

        var activeJobs = await dashboard.ListActiveJobsWithCompanyAsync(ActiveStatuses, ct);

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
        var dueToday = await dashboard.CountPendingFollowUpsDueBetweenAsync(now.Date, todayEnd, ct);
        var overdue = await dashboard.CountPendingFollowUpsOverdueAsync(now.Date, ct);

        var upcoming = await dashboard.ListUpcomingActivitiesAsync(now, sevenDaysAhead, ct);
        var offerDeadlines = await dashboard.ListOfferDeadlinesAsync(now, ct);

        var profile = await profiles.GetAsync(ct);
        int? daysUntilDeadline = profile?.SearchDeadlineUtc.HasValue == true
            ? (int?)(profile.SearchDeadlineUtc!.Value - now).TotalDays
            : null;

        return new DashboardSummaryDto(activeByStatus, dueToday, overdue, upcoming, staleJobs, offerDeadlines, daysUntilDeadline);
    }
}
