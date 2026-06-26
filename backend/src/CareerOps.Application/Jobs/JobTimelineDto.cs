namespace CareerOps.Application.Jobs;

public enum TimelineEventKind
{
    Transition = 0,
    Activity   = 1,
    FollowUp   = 2
}

public record TimelineEventDto(
    int Id,
    TimelineEventKind Kind,
    DateTime TimestampUtc,
    string Title,
    string? Detail,
    string? Actor   // "User" | "Agent" | "System" — only for Transition events
);
