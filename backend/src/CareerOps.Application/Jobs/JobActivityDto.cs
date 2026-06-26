using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record JobActivityDto(
    int Id,
    int JobId,
    string Label,
    JobActivityType Type,
    JobActivityStatus Status,
    JobActivityOutcome Outcome,
    DateTime? ScheduledAtUtc,
    int? DurationMinutes,
    string? ContactName,
    string? ContactRole,
    string? MeetingUrl,
    string? PrepNotes,
    string? Feedback,
    string? Notes,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);
