using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;

namespace CareerOps.Domain.Jobs;

public sealed class JobActivity : AuditableEntity
{
    public int Id { get; set; }
    public int JobId { get; set; }
    public Job? Job { get; set; }

    public string Label { get; set; } = "";
    public JobActivityType Type { get; set; }
    public JobActivityStatus Status { get; set; }
    public JobActivityOutcome Outcome { get; set; }

    public DateTime? ScheduledAtUtc { get; set; }
    public int? DurationMinutes { get; set; }

    public string? ContactName { get; set; }
    public string? ContactRole { get; set; }
    public string? MeetingUrl { get; set; }

    public string? PrepNotes { get; set; }
    public string? Feedback { get; set; }
    public string? Notes { get; set; }

    public List<FollowUpTask> FollowUps { get; set; } = [];
}
