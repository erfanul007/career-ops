namespace CareerOps.Application.Jobs;

public sealed class JobTimelineService(IJobTimelineReadRepository timeline)
{
    public async Task<List<TimelineEventDto>> GetTimelineAsync(int jobId, CancellationToken ct = default)
    {
        var data = await timeline.GetTimelineDataAsync(jobId, ct);
        var events = new List<TimelineEventDto>();

        foreach (var t in data.Transitions)
        {
            var title = t.FromStatus.HasValue
                ? $"{t.FromStatus} → {t.ToStatus}"
                : $"Created as {t.ToStatus}";
            events.Add(new TimelineEventDto(
                t.Id, TimelineEventKind.Transition, t.ChangedAtUtc, title, t.Notes, t.Actor.ToString()));
        }

        foreach (var a in data.Activities)
        {
            var ts = a.ScheduledAtUtc ?? a.CreatedAtUtc;
            events.Add(new TimelineEventDto(
                a.Id, TimelineEventKind.Activity, ts, $"{a.Type}: {a.Label}", $"{a.Status} · {a.Outcome}", null));
        }

        foreach (var f in data.FollowUps)
        {
            events.Add(new TimelineEventDto(
                f.Id, TimelineEventKind.FollowUp, f.DueAtUtc, f.Title, f.Status.ToString(), null));
        }

        return [.. events.OrderByDescending(e => e.TimestampUtc)];
    }
}
