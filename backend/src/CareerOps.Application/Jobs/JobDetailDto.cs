using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record JobDetailDto(
    int Id,
    int CompanyId,
    string CompanyName,
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
    DateTime? AppliedAtUtc,
    DateTime? LastContactedAtUtc,
    DateTime? NextActionAtUtc,
    int? FitScore,
    string? ResumeLabel,
    string? ResumeAngle,
    string? CoverLetterNotes,
    decimal? OfferSalary,
    string? OfferCurrency,
    DateTime? OfferDeadlineAtUtc,
    string? OfferNotes,
    string? RejectionReason,
    string? Notes,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    List<JobActivityDto> Activities,
    List<JobPropertyDto> Properties,
    List<JobAttachmentDto> Attachments,
    List<FollowUpTaskDto> FollowUps
);
