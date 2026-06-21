using CareerOps.Domain.JobLeads;

namespace CareerOps.Application.JobLeads;

public sealed record UpdateJobLeadRequest(
    int CompanyId, string Title,
    JobSource Source, string? SourceUrl, string? JobDescription, string? Location,
    RemoteMode RemoteMode, EmploymentType EmploymentType,
    decimal? SalaryMin, decimal? SalaryMax, string? SalaryCurrency, SalaryPeriod SalaryPeriod,
    Priority Priority, JobLeadStatus Status,
    int? FitScore, string? AiSummary, string? MissingKeywords, string? SuggestedResumeAngle,
    DateTime? NextActionAtUtc, DateTime? DeadlineAtUtc, string? Notes);
