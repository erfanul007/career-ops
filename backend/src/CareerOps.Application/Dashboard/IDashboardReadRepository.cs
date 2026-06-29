using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Dashboard;

public interface IDashboardReadRepository
{
    Task<IReadOnlyList<Job>> ListActiveJobsWithCompanyAsync(
        IReadOnlyCollection<JobStatus> statuses, CancellationToken ct = default);

    Task<int> CountPendingFollowUpsDueBetweenAsync(
        DateTime fromInclusive, DateTime toExclusive, CancellationToken ct = default);

    Task<int> CountPendingFollowUpsOverdueAsync(
        DateTime beforeExclusive, CancellationToken ct = default);

    Task<List<UpcomingActivityDto>> ListUpcomingActivitiesAsync(
        DateTime fromInclusive, DateTime toInclusive, CancellationToken ct = default);

    Task<List<OfferDeadlineDto>> ListOfferDeadlinesAsync(
        DateTime afterExclusive, CancellationToken ct = default);
}
