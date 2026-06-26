using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record JobDto(
    int Id,
    int CompanyId,
    string CompanyName,
    string Title,
    JobStatus Status,
    Priority Priority,
    JobSource Source,
    string? SourceUrl,
    string? Country,
    string? City,
    string? LocationText,
    RemoteMode RemoteMode,
    EmploymentType EmploymentType,
    decimal? SalaryMin,
    decimal? SalaryMax,
    string? SalaryCurrency,
    SalaryPeriod SalaryPeriod,
    DateTime? DeadlineAtUtc,
    DateTime? AppliedAtUtc,
    DateTime? LastContactedAtUtc,
    DateTime? NextActionAtUtc,
    int? FitScore,
    string? Notes,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);
