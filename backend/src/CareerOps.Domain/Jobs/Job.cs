using CareerOps.Domain.Common;
using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;

namespace CareerOps.Domain.Jobs;

public sealed class Job : AuditableEntity
{
    public int Id { get; set; }

    public int CompanyId { get; set; }
    public Company? Company { get; set; }

    public string Title { get; set; } = "";
    public JobStatus Status { get; set; }
    public Priority Priority { get; set; }

    public JobSource Source { get; set; }
    public string? SourceUrl { get; set; }
    public string? JobDescription { get; set; }

    public string? Country { get; set; }
    public string? City { get; set; }
    public string? LocationText { get; set; }
    public RemoteMode RemoteMode { get; set; }
    public EmploymentType EmploymentType { get; set; }

    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public string? SalaryCurrency { get; set; }
    public SalaryPeriod SalaryPeriod { get; set; }

    public DateTime? DeadlineAtUtc { get; set; }
    public DateTime? AppliedAtUtc { get; set; }
    public DateTime? LastContactedAtUtc { get; set; }
    public DateTime? NextActionAtUtc { get; set; }

    public int? FitScore { get; set; }
    public string? ResumeLabel { get; set; }
    public string? ResumeAngle { get; set; }
    public string? CoverLetterNotes { get; set; }

    public decimal? OfferSalary { get; set; }
    public string? OfferCurrency { get; set; }
    public DateTime? OfferDeadlineAtUtc { get; set; }
    public string? OfferNotes { get; set; }

    public string? RejectionReason { get; set; }
    public string? Notes { get; set; }

    public List<JobActivity> Activities { get; set; } = [];
    public List<JobTransition> Transitions { get; set; } = [];
    public List<FollowUpTask> FollowUps { get; set; } = [];
    public List<JobProperty> Properties { get; set; } = [];
    public List<JobAttachment> Attachments { get; set; } = [];
}
