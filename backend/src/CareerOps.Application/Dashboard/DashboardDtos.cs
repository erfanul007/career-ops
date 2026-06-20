using CareerOps.Application.Applications;
using CareerOps.Application.FollowUpTasks;
using CareerOps.Application.Interviews;
using CareerOps.Application.JobLeads;
using CareerOps.Domain.Applications;
using CareerOps.Domain.JobLeads;

namespace CareerOps.Application.Dashboard;

public sealed record StatusCount(JobLeadStatus Status, int Count);

public sealed record StageCount(ApplicationStage Stage, int Count);

public sealed record DeadlineCountdown(DateTime DeadlineUtc, int DaysRemaining);

public sealed record DashboardSummaryDto(
    int ActiveApplicationCount,
    IReadOnlyList<StatusCount> LeadsByStatus,
    IReadOnlyList<StageCount> ApplicationsByStage,
    IReadOnlyList<FollowUpTaskDto> FollowUpsDue,
    IReadOnlyList<FollowUpTaskDto> OverdueFollowUps,
    IReadOnlyList<InterviewDto> UpcomingInterviews,
    IReadOnlyList<JobLeadDto> HighPriorityLeads,
    IReadOnlyList<ApplicationDto> StaleApplications,
    DeadlineCountdown? SearchDeadline);
