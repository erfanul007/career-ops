using CareerOps.Domain.Common;

namespace CareerOps.Domain.ResumeVariants;

public sealed class ResumeVariant : AuditableEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? TargetRole { get; set; }
    public string? Summary { get; set; }
    public string? Notes { get; set; }
    public bool IsDefault { get; set; }
}
