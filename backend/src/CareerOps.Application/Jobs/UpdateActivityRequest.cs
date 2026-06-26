using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record UpdateActivityRequest(
    string Label,
    JobActivityType Type,
    JobActivityStatus Status,
    DateTime? ScheduledAtUtc,
    int? DurationMinutes,
    string? ContactName,
    string? ContactRole,
    string? MeetingUrl,
    string? PrepNotes,
    string? Notes
);
