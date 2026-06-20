using CareerOps.Domain.Applications;

namespace CareerOps.Application.Applications;

public sealed record ApplicationDto(
    int Id, int JobLeadId, string JobTitle, string CompanyName,
    int ResumeVariantId, string ResumeVariantName,
    DateTime AppliedAtUtc, ApplicationStage CurrentStage, ApplicationStatus Status,
    decimal? ExpectedSalary, string? ExpectedSalaryCurrency, string? NoticePeriod,
    string? NextStep, DateTime? NextActionAtUtc, string? RejectionReason, string? Notes,
    DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
