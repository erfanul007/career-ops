using CareerOps.Application.Common;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Jobs;

public sealed class JobActivityService(IAppDbContext db, IClock clock)
{
    public async Task<JobActivityDto?> AddActivityAsync(int jobId, CreateActivityRequest req, CancellationToken ct = default)
    {
        if (!await db.Jobs.AnyAsync(j => j.Id == jobId, ct)) return null;
        var activity = new JobActivity
        {
            JobId = jobId,
            Label = req.Label,
            Type = req.Type,
            Status = req.Status,
            Outcome = JobActivityOutcome.Unknown,
            ScheduledAtUtc = req.ScheduledAtUtc,
            DurationMinutes = req.DurationMinutes,
            ContactName = req.ContactName,
            ContactRole = req.ContactRole,
            MeetingUrl = req.MeetingUrl,
            PrepNotes = req.PrepNotes,
            Notes = req.Notes
        };
        db.JobActivities.Add(activity);
        await db.SaveChangesAsync(ct);
        return activity.Adapt<JobActivityDto>();
    }

    public async Task<JobActivityDto?> UpdateActivityAsync(int jobId, int activityId, UpdateActivityRequest req, CancellationToken ct = default)
    {
        var activity = await db.JobActivities.FirstOrDefaultAsync(a => a.Id == activityId && a.JobId == jobId, ct);
        if (activity is null) return null;
        activity.Label = req.Label;
        activity.Type = req.Type;
        activity.Status = req.Status;
        activity.ScheduledAtUtc = req.ScheduledAtUtc;
        activity.DurationMinutes = req.DurationMinutes;
        activity.ContactName = req.ContactName;
        activity.ContactRole = req.ContactRole;
        activity.MeetingUrl = req.MeetingUrl;
        activity.PrepNotes = req.PrepNotes;
        activity.Notes = req.Notes;
        await db.SaveChangesAsync(ct);
        return activity.Adapt<JobActivityDto>();
    }

    public async Task<(JobActivityDto? Activity, string? Suggestion)> CompleteActivityAsync(
        int jobId,
        int activityId,
        CompleteActivityRequest req,
        CancellationToken ct = default)
    {
        var activity = await db.JobActivities.FirstOrDefaultAsync(a => a.Id == activityId && a.JobId == jobId, ct);
        if (activity is null) return (null, null);

        activity.Status = JobActivityStatus.Completed;
        activity.Outcome = req.Outcome;
        activity.Feedback = req.Feedback;
        activity.Notes = req.Notes ?? activity.Notes;

        if (req.CreateFollowUp)
        {
            db.FollowUpTasks.Add(new FollowUpTask
            {
                JobId = activity.JobId,
                JobActivityId = activity.Id,
                Title = "Send thank you / follow-up",
                DueAtUtc = clock.UtcNow.AddDays(1),
                Status = FollowUpStatus.Pending,
                Priority = Priority.Medium
            });
        }

        await db.SaveChangesAsync(ct);
        return (activity.Adapt<JobActivityDto>(), "Great — log your notes while fresh");
    }

    public async Task<bool> DeleteActivityAsync(int jobId, int activityId, CancellationToken ct = default)
    {
        var activity = await db.JobActivities.FirstOrDefaultAsync(a => a.Id == activityId && a.JobId == jobId, ct);
        if (activity is null) return false;

        // Nullify the activity link on follow-ups; preserve the Job link
        var linked = await db.FollowUpTasks
            .Where(f => f.JobActivityId == activityId)
            .ToListAsync(ct);
        foreach (var f in linked)
            f.JobActivityId = null;

        db.JobActivities.Remove(activity);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
