using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Dashboard;

public record DashboardSummaryDto(
    Dictionary<JobStatus, int> ActiveJobsByStatus,
    int FollowUpsDueToday,
    int OverdueFollowUps,
    List<UpcomingActivityDto> UpcomingActivities,
    List<StaleJobDto> StaleJobs,
    List<OfferDeadlineDto> OfferDeadlines,
    int? DaysUntilSearchDeadline
);

public record UpcomingActivityDto(
    int JobId,
    string JobTitle,
    string CompanyName,
    int ActivityId,
    string ActivityLabel,
    DateTime ScheduledAtUtc
);

public record StaleJobDto(
    int Id,
    string Title,
    string CompanyName,
    JobStatus Status,
    DateTime UpdatedAtUtc,
    DateTime? NextActionAtUtc
);

public record OfferDeadlineDto(
    int JobId,
    string Title,
    string CompanyName,
    DateTime OfferDeadlineAtUtc
);
