using CareerOps.Application.Applications;
using CareerOps.Application.Common;
using CareerOps.Application.FollowUpTasks;
using CareerOps.Application.Interviews;
using CareerOps.Application.JobLeads;
using CareerOps.Domain.Applications;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Interviews;
using CareerOps.Domain.JobLeads;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Dashboard;

public sealed class DashboardService(IAppDbContext db, IClock clock)
{
    private static readonly Priority[] HighPriorities = [Priority.High, Priority.Critical];
    private static readonly JobLeadStatus[] ActionableStatuses = [JobLeadStatus.Discovered, JobLeadStatus.Interested];

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var now = clock.UtcNow;
        var startOfToday = clock.Today.ToDateTime(TimeOnly.MinValue);
        var interviewWindowEnd = now.AddDays(7);
        var staleBefore = now.AddDays(-7);

        var activeApplicationCount = await db.Applications
            .CountAsync(a => a.Status == ApplicationStatus.Active, ct);

        var leadsByStatus = (await db.JobLeads
                .GroupBy(l => l.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync(ct))
            .Select(x => new StatusCount(x.Status, x.Count)).ToList();

        var applicationsByStage = (await db.Applications
                .GroupBy(a => a.CurrentStage)
                .Select(g => new { Stage = g.Key, Count = g.Count() })
                .ToListAsync(ct))
            .Select(x => new StageCount(x.Stage, x.Count)).ToList();

        var followUpsDue = (await db.FollowUpTasks
                .Where(t => t.Status == FollowUpStatus.Pending && t.DueAtUtc >= startOfToday && t.DueAtUtc <= now)
                .OrderBy(t => t.DueAtUtc).ToListAsync(ct))
            .Adapt<List<FollowUpTaskDto>>();

        var overdueFollowUps = (await db.FollowUpTasks
                .Where(t => t.Status == FollowUpStatus.Pending && t.DueAtUtc < startOfToday)
                .OrderBy(t => t.DueAtUtc).ToListAsync(ct))
            .Adapt<List<FollowUpTaskDto>>();

        var upcomingInterviews = (await db.Interviews
                .Include(i => i.Application).ThenInclude(a => a!.JobLead).ThenInclude(l => l!.Company)
                .Where(i => i.Status == InterviewStatus.Scheduled && i.ScheduledAtUtc >= now && i.ScheduledAtUtc <= interviewWindowEnd)
                .OrderBy(i => i.ScheduledAtUtc).ToListAsync(ct))
            .Adapt<List<InterviewDto>>();

        var highPriorityLeads = (await db.JobLeads
                .Include(l => l.Company)
                .Where(l => HighPriorities.Contains(l.Priority) && ActionableStatuses.Contains(l.Status))
                .OrderByDescending(l => l.Priority).ThenBy(l => l.Title).ToListAsync(ct))
            .Adapt<List<JobLeadDto>>();

        var staleApplications = (await db.Applications
                .Include(a => a.JobLead).ThenInclude(l => l!.Company).Include(a => a.ResumeVariant)
                .Where(a => a.Status == ApplicationStatus.Active &&
                    ((a.NextActionAtUtc == null && a.UpdatedAtUtc < staleBefore) ||
                     (a.NextActionAtUtc != null && a.NextActionAtUtc < now)))
                .OrderBy(a => a.UpdatedAtUtc).ToListAsync(ct))
            .Adapt<List<ApplicationDto>>();

        var profile = await db.UserProfiles.AsNoTracking().FirstOrDefaultAsync(ct);
        DeadlineCountdown? searchDeadline = profile?.SearchDeadlineUtc is { } deadline
            ? new DeadlineCountdown(deadline, DateOnly.FromDateTime(deadline).DayNumber - clock.Today.DayNumber)
            : null;

        return new DashboardSummaryDto(
            activeApplicationCount, leadsByStatus, applicationsByStage,
            followUpsDue, overdueFollowUps, upcomingInterviews,
            highPriorityLeads, staleApplications, searchDeadline);
    }
}
