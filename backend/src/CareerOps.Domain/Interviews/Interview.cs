using CareerOps.Domain.Applications;
using CareerOps.Domain.Common;

namespace CareerOps.Domain.Interviews;

public sealed class Interview : AuditableEntity
{
    public int Id { get; set; }
    public int ApplicationId { get; set; }
    public Application? Application { get; set; }
    public InterviewRoundType RoundType { get; set; }
    public DateTime ScheduledAtUtc { get; set; }
    public int? DurationMinutes { get; set; }
    public string? InterviewerName { get; set; }
    public string? InterviewerRole { get; set; }
    public string? MeetingUrl { get; set; }
    public InterviewStatus Status { get; set; }
    public string? PrepNotes { get; set; }
    public InterviewOutcome Outcome { get; set; }
    public string? Feedback { get; set; }
    public bool FollowUpRequired { get; set; }
    public DateTime? FollowUpAtUtc { get; set; }

    // True only when this call is the first transition into Completed (controls one-time follow-up creation).
    public bool Complete(InterviewOutcome outcome, string? feedback, bool followUpRequired, DateTime? followUpAtUtc)
    {
        var wasCompleted = Status == InterviewStatus.Completed;
        Status = InterviewStatus.Completed;
        Outcome = outcome;
        Feedback = feedback;
        FollowUpRequired = followUpRequired;
        FollowUpAtUtc = followUpAtUtc;
        return !wasCompleted;
    }
}
