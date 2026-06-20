namespace CareerOps.Application.Applications;

public sealed record ConvertToApplicationRequest(
    int ResumeVariantId, DateTime AppliedAtUtc, string? NextStep, DateTime? NextActionAtUtc, string? Notes);
