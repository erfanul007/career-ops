namespace CareerOps.Application.Applications;

public sealed record UpdateApplicationRequest(
    int ResumeVariantId, DateTime AppliedAtUtc, decimal? ExpectedSalary, string? ExpectedSalaryCurrency,
    string? NoticePeriod, string? NextStep, DateTime? NextActionAtUtc, string? Notes);
