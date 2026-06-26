using CareerOps.Application.Common;
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Jobs;

public sealed class JobTimelineService(IAppDbContext db)
{
    public async Task<List<TimelineEventDto>> GetTimelineAsync(int jobId, CancellationToken ct = default)
    {
        var events = new List<TimelineEventDto>();

        var transitions = await db.JobTransitions
            .Where(t => t.JobId == jobId)
            .OrderByDescending(t => t.ChangedAtUtc)
            .ToListAsync(ct);

        foreach (var t in transitions)
        {
            var title = t.FromStatus.HasValue
                ? $"{t.FromStatus} → {t.ToStatus}"
                : $"Created as {t.ToStatus}";
            events.Add(new TimelineEventDto(
                t.Id, TimelineEventKind.Transition, t.ChangedAtUtc, title, t.Notes, t.Actor.ToString()));
        }

        var activities = await db.JobActivities
            .Where(a => a.JobId == jobId)
            .OrderByDescending(a => a.ScheduledAtUtc ?? a.CreatedAtUtc)
            .ToListAsync(ct);

        foreach (var a in activities)
        {
            var ts = a.ScheduledAtUtc ?? a.CreatedAtUtc;
            events.Add(new TimelineEventDto(
                a.Id, TimelineEventKind.Activity, ts, $"{a.Type}: {a.Label}", $"{a.Status} · {a.Outcome}", null));
        }

        var followUps = await db.FollowUpTasks
            .Where(f => f.JobId == jobId)
            .OrderByDescending(f => f.DueAtUtc)
            .ToListAsync(ct);

        foreach (var f in followUps)
        {
            events.Add(new TimelineEventDto(
                f.Id, TimelineEventKind.FollowUp, f.DueAtUtc, f.Title, f.Status.ToString(), null));
        }

        return [.. events.OrderByDescending(e => e.TimestampUtc)];
    }
}
