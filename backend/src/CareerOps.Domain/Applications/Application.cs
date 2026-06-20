using CareerOps.Domain.Common;
using CareerOps.Domain.JobLeads;
using CareerOps.Domain.ResumeVariants;

namespace CareerOps.Domain.Applications;

public sealed class Application : AuditableEntity
{
    public int Id { get; set; }
    public int JobLeadId { get; set; }
    public JobLead? JobLead { get; set; }
    public int ResumeVariantId { get; set; }
    public ResumeVariant? ResumeVariant { get; set; }
    public DateTime AppliedAtUtc { get; set; }
    public ApplicationStage CurrentStage { get; set; }
    public ApplicationStatus Status { get; set; }
    public decimal? ExpectedSalary { get; set; }
    public string? ExpectedSalaryCurrency { get; set; }
    public string? NoticePeriod { get; set; }
    public string? NextStep { get; set; }
    public DateTime? NextActionAtUtc { get; set; }
    public string? RejectionReason { get; set; }
    public string? Notes { get; set; }

    // The lead trigger produced by the last transition (consumed by ApplicationService; not persisted).
    public ApplicationTrigger? LastTrigger { get; private set; }

    private static readonly HashSet<ApplicationStage> InterviewStages =
    [
        ApplicationStage.RecruiterScreen, ApplicationStage.TechnicalScreen, ApplicationStage.TakeHome,
        ApplicationStage.SystemDesign, ApplicationStage.HiringManager, ApplicationStage.Final,
    ];

    public void ChangeStage(ApplicationStage stage)
    {
        CurrentStage = stage;
        if (stage == ApplicationStage.Withdrawn)
        {
            Status = ApplicationStatus.Withdrawn;
            LastTrigger = ApplicationTrigger.Withdrawn;
        }
        else if (InterviewStages.Contains(stage))
        {
            LastTrigger = ApplicationTrigger.EnteredInterviewStage;
        }
        else
        {
            LastTrigger = null; // Applied (no lead change beyond convert)
        }
    }

    public void MarkRejected(string? reason)
    {
        CurrentStage = ApplicationStage.Rejected;
        Status = ApplicationStatus.Rejected;
        RejectionReason = reason;
        LastTrigger = ApplicationTrigger.Rejected;
    }

    public void MarkOffer()
    {
        CurrentStage = ApplicationStage.Offer;
        Status = ApplicationStatus.Offer;
        LastTrigger = ApplicationTrigger.Offer;
    }

    public void MarkGhosted()
    {
        CurrentStage = ApplicationStage.Ghosted; // ApplicationStatus has no Ghosted; status unchanged
        LastTrigger = ApplicationTrigger.Ghosted;
    }
}
