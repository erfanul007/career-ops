using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;

namespace CareerOps.Application.Jobs;

public record ListJobsQuery(
    JobStatus[]? Statuses = null,
    JobSource? Source = null,
    RemoteMode? RemoteMode = null,
    EmploymentType? EmploymentType = null,
    string[]? Countries = null,
    int[]? CompanyIds = null,
    string? CompanySearch = null,
    Priority? Priority = null,
    decimal? SalaryMin = null,
    decimal? SalaryMax = null,
    DateTime? AppliedFrom = null,
    DateTime? AppliedTo = null,
    string? Search = null
);
