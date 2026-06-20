using CareerOps.Domain.JobLeads;

namespace CareerOps.UnitTests.JobLeads;

public class JobLeadStatusTransitionsTests
{
    [Theory]
    [InlineData(ApplicationTrigger.Created, JobLeadStatus.Applied)]
    [InlineData(ApplicationTrigger.Offer, JobLeadStatus.Offer)]
    [InlineData(ApplicationTrigger.Rejected, JobLeadStatus.Rejected)]
    [InlineData(ApplicationTrigger.Ghosted, JobLeadStatus.Ghosted)]
    [InlineData(ApplicationTrigger.Withdrawn, JobLeadStatus.Withdrawn)]
    public void Advance_maps_trigger_to_status(ApplicationTrigger trigger, JobLeadStatus expected) =>
        Assert.Equal(expected, JobLeadStatusTransitions.Advance(JobLeadStatus.Discovered, trigger));

    [Theory]
    [InlineData(ApplicationTrigger.Created)]
    [InlineData(ApplicationTrigger.Offer)]
    [InlineData(ApplicationTrigger.Rejected)]
    public void Archived_is_terminal(ApplicationTrigger trigger) =>
        Assert.Equal(JobLeadStatus.Archived, JobLeadStatusTransitions.Advance(JobLeadStatus.Archived, trigger));

    [Theory]
    [InlineData(JobLeadStatus.Discovered, JobLeadStatus.Interviewing)]
    [InlineData(JobLeadStatus.Interested, JobLeadStatus.Interviewing)]
    [InlineData(JobLeadStatus.Applied, JobLeadStatus.Interviewing)]
    [InlineData(JobLeadStatus.Interviewing, JobLeadStatus.Interviewing)]
    [InlineData(JobLeadStatus.Offer, JobLeadStatus.Offer)]
    [InlineData(JobLeadStatus.Rejected, JobLeadStatus.Rejected)]
    [InlineData(JobLeadStatus.Ghosted, JobLeadStatus.Ghosted)]
    [InlineData(JobLeadStatus.Withdrawn, JobLeadStatus.Withdrawn)]
    [InlineData(JobLeadStatus.Archived, JobLeadStatus.Archived)]
    public void EnteredInterviewStage_advances_only_from_pre_interview_statuses(JobLeadStatus current, JobLeadStatus expected) =>
        Assert.Equal(expected, JobLeadStatusTransitions.Advance(current, ApplicationTrigger.EnteredInterviewStage));
}
