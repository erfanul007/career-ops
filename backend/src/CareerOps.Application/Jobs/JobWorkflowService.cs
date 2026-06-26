using CareerOps.Application.Common;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Jobs;

public sealed class JobWorkflowService(IAppDbContext db, IClock clock)
{
    public async Task<TransitionResult> TransitionJobAsync(
        int jobId,
        JobStatus toStatus,
        string? notes,
        TransitionActor actor,
        CancellationToken ct = default)
    {
        var job = await db.Jobs.FindAsync([jobId], ct)
            ?? throw new KeyNotFoundException($"Job {jobId} not found");

        if (job.Status == toStatus)
            return new TransitionResult(toStatus, null);

        var fromStatus = job.Status;
        job.Status = toStatus;

        if (toStatus == JobStatus.Applied && job.AppliedAtUtc is null)
            job.AppliedAtUtc = clock.UtcNow;

        db.JobTransitions.Add(new JobTransition
        {
            JobId = jobId,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            ChangedAtUtc = clock.UtcNow,
            Actor = actor,
            Notes = notes
        });

        string? suggestion = null;

        if (toStatus == JobStatus.Applied)
        {
            db.FollowUpTasks.Add(new FollowUpTask
            {
                JobId = jobId,
                Title = "Check application status",
                DueAtUtc = clock.UtcNow.AddDays(7),
                Status = FollowUpStatus.Pending,
                Priority = Priority.Medium
            });
        }
        else if (toStatus == JobStatus.Interviewing)
            suggestion = "Add first activity?";
        else if (toStatus == JobStatus.Offered)
            suggestion = "Add offer details";
        else if (toStatus == JobStatus.Rejected)
            suggestion = "Request feedback from recruiter";
        else if (toStatus == JobStatus.Ghosted)
            suggestion = "Send a final follow-up email";

        await db.SaveChangesAsync(ct);
        return new TransitionResult(toStatus, suggestion);
    }
}
