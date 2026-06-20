namespace CareerOps.Domain.JobLeads;

// D6: one source of truth mapping Application events to JobLead.Status.
// Keyed off the lead's current status, so it is idempotent. Archived is terminal.
public static class JobLeadStatusTransitions
{
    public static JobLeadStatus Advance(JobLeadStatus current, ApplicationTrigger trigger)
    {
        if (current == JobLeadStatus.Archived) return JobLeadStatus.Archived;
        return trigger switch
        {
            ApplicationTrigger.Created => JobLeadStatus.Applied,
            ApplicationTrigger.EnteredInterviewStage =>
                current is JobLeadStatus.Discovered or JobLeadStatus.Interested or JobLeadStatus.Applied
                    ? JobLeadStatus.Interviewing
                    : current,
            ApplicationTrigger.Offer => JobLeadStatus.Offer,
            ApplicationTrigger.Rejected => JobLeadStatus.Rejected,
            ApplicationTrigger.Ghosted => JobLeadStatus.Ghosted,
            ApplicationTrigger.Withdrawn => JobLeadStatus.Withdrawn,
            _ => current,
        };
    }
}
