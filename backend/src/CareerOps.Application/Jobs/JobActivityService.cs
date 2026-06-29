using CareerOps.Application.Common;
using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using Mapster;

namespace CareerOps.Application.Jobs;

public sealed class JobActivityService(
    IJobActivityRepository activities,
    IJobRepository jobs,
    IFollowUpTaskRepository followUps,
    IUnitOfWork uow,
    IClock clock)
{
    public async Task<JobActivityDto?> AddActivityAsync(int jobId, CreateActivityRequest req, CancellationToken ct = default)
    {
        if (!await jobs.ExistsAsync(jobId, ct)) return null;
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
        activities.Add(activity);
        await uow.SaveChangesAsync(ct);
        return activity.Adapt<JobActivityDto>();
    }

    public async Task<JobActivityDto?> UpdateActivityAsync(int jobId, int activityId, UpdateActivityRequest req, CancellationToken ct = default)
    {
        var activity = await activities.FindForJobAsync(jobId, activityId, ct);
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
        await uow.SaveChangesAsync(ct);
        return activity.Adapt<JobActivityDto>();
    }

    public async Task<(JobActivityDto? Activity, string? Suggestion)> CompleteActivityAsync(
        int jobId,
        int activityId,
        CompleteActivityRequest req,
        CancellationToken ct = default)
    {
        var activity = await activities.FindForJobAsync(jobId, activityId, ct);
        if (activity is null) return (null, null);

        activity.Status = JobActivityStatus.Completed;
        activity.Outcome = req.Outcome;
        activity.Feedback = req.Feedback;
        activity.Notes = req.Notes ?? activity.Notes;

        if (req.CreateFollowUp)
        {
            followUps.Add(new FollowUpTask
            {
                JobId = activity.JobId,
                JobActivityId = activity.Id,
                Title = "Send thank you / follow-up",
                DueAtUtc = clock.UtcNow.AddDays(1),
                Status = FollowUpStatus.Pending,
                Priority = Priority.Medium
            });
        }

        await uow.SaveChangesAsync(ct);
        return (activity.Adapt<JobActivityDto>(), "Great — log your notes while fresh");
    }

    public async Task<bool> DeleteActivityAsync(int jobId, int activityId, CancellationToken ct = default)
    {
        var activity = await activities.FindForJobAsync(jobId, activityId, ct);
        if (activity is null) return false;

        // Nullify the activity link on follow-ups; preserve the Job link
        var linked = await followUps.ListByActivityAsync(activityId, ct);
        foreach (var f in linked)
            f.JobActivityId = null;

        activities.Remove(activity);
        await uow.SaveChangesAsync(ct);
        return true;
    }
}
