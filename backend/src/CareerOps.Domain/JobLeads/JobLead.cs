using CareerOps.Domain.Common;
using CareerOps.Domain.Companies;

namespace CareerOps.Domain.JobLeads;

public sealed class JobLead : AuditableEntity
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public Company? Company { get; set; }
    public string Title { get; set; } = "";
    public JobSource Source { get; set; }
    public string? SourceUrl { get; set; }
    public string? JobDescription { get; set; }
    public string? Location { get; set; }
    public RemoteMode RemoteMode { get; set; }
    public EmploymentType EmploymentType { get; set; }
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public string? SalaryCurrency { get; set; }
    public SalaryPeriod SalaryPeriod { get; set; }
    public Priority Priority { get; set; }
    public JobLeadStatus Status { get; set; }
    public int? FitScore { get; set; }
    public string? AiSummary { get; set; }
    public string? MissingKeywords { get; set; }
    public string? SuggestedResumeAngle { get; set; }
    public DateTime? NextActionAtUtc { get; set; }
    public DateTime? DeadlineAtUtc { get; set; }
    public string? Notes { get; set; }
}
