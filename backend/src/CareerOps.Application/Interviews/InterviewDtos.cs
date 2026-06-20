using CareerOps.Domain.Interviews;

namespace CareerOps.Application.Interviews;

public sealed record CreateInterviewRequest(
    int ApplicationId, InterviewRoundType RoundType, DateTime ScheduledAtUtc, int? DurationMinutes,
    string? InterviewerName, string? InterviewerRole, string? MeetingUrl, string? PrepNotes);

public sealed record UpdateInterviewRequest(
    InterviewRoundType RoundType, DateTime ScheduledAtUtc, int? DurationMinutes,
    string? InterviewerName, string? InterviewerRole, string? MeetingUrl, InterviewStatus Status, string? PrepNotes);

public sealed record MarkInterviewCompletedRequest(
    InterviewOutcome Outcome, string? Feedback, bool FollowUpRequired, DateTime? FollowUpAtUtc);

public sealed record InterviewDto(
    int Id, int ApplicationId, string CompanyName, string JobTitle, InterviewRoundType RoundType,
    DateTime ScheduledAtUtc, int? DurationMinutes, string? InterviewerName, string? InterviewerRole,
    string? MeetingUrl, InterviewStatus Status, string? PrepNotes, InterviewOutcome Outcome, string? Feedback,
    bool FollowUpRequired, DateTime? FollowUpAtUtc, DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
