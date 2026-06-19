namespace CareerOps.Domain.Common;

public abstract class AuditableEntity
{
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
