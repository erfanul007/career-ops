namespace CareerOps.Application.ResumeVariants;

public sealed record ResumeVariantDto(
    int Id, string Name, string? TargetRole, string? Summary, string? Notes, bool IsDefault,
    DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
