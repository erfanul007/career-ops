using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record CreateJobRequest(
    int? CompanyId,
    string Title,
    JobStatus Status,
    Priority Priority,
    JobSource Source,
    string? SourceUrl,
    string? JobDescription,
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
    int? FitScore,
    string? ResumeLabel,
    string? ResumeAngle,
    string? CoverLetterNotes,
    string? Notes,
    string? CompanyName = null
);
