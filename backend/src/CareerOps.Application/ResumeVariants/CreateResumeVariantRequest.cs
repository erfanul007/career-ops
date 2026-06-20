namespace CareerOps.Application.ResumeVariants;

public sealed record CreateResumeVariantRequest(string Name, string? TargetRole, string? Summary, string? Notes);
