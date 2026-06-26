using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;

namespace CareerOps.Domain.FollowUpTasks;

public sealed class FollowUpTask : AuditableEntity
{
    public int Id { get; set; }

    public int? JobId { get; set; }
    public Job? Job { get; set; }

    public int? JobActivityId { get; set; }
    public JobActivity? JobActivity { get; set; }

    public string Title { get; set; } = "";
    public string? Description { get; set; }

    public DateTime DueAtUtc { get; set; }
    public FollowUpStatus Status { get; set; }
    public Priority Priority { get; set; }
}
