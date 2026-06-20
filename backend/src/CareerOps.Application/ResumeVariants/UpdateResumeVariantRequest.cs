namespace CareerOps.Application.ResumeVariants;

public sealed record UpdateResumeVariantRequest(string Name, string? TargetRole, string? Summary, string? Notes);
