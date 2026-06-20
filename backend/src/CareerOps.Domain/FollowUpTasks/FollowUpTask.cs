using CareerOps.Domain.Common;
using CareerOps.Domain.JobLeads;

namespace CareerOps.Domain.FollowUpTasks;

// Polymorphic reference (RelatedEntityType + RelatedEntityId) with NO FK (D12 loose-reference).
public sealed class FollowUpTask : AuditableEntity
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public RelatedEntityType RelatedEntityType { get; set; }
    public int? RelatedEntityId { get; set; }
    public DateTime DueAtUtc { get; set; }
    public FollowUpStatus Status { get; set; }
    public Priority Priority { get; set; }

    public void Complete() => Status = FollowUpStatus.Completed;
    public void Skip() => Status = FollowUpStatus.Skipped;
}
