using CareerOps.Domain.Applications;
using CareerOps.Domain.JobLeads;
using DomainApplication = CareerOps.Domain.Applications.Application;

namespace CareerOps.UnitTests.Applications;

public class ApplicationEntityTests
{
    private static DomainApplication New() => new() { JobLeadId = 1, ResumeVariantId = 1, CurrentStage = ApplicationStage.Applied, Status = ApplicationStatus.Active };

    [Fact]
    public void MarkRejected_sets_stage_status_and_reason()
    {
        var app = New();
        app.MarkRejected("Position filled");
        Assert.Equal(ApplicationStage.Rejected, app.CurrentStage);
        Assert.Equal(ApplicationStatus.Rejected, app.Status);
        Assert.Equal("Position filled", app.RejectionReason);
        Assert.Equal(ApplicationTrigger.Rejected, app.LastTrigger);
    }

    [Fact]
    public void MarkOffer_sets_stage_and_status_offer()
    {
        var app = New();
        app.MarkOffer();
        Assert.Equal(ApplicationStage.Offer, app.CurrentStage);
        Assert.Equal(ApplicationStatus.Offer, app.Status);
        Assert.Equal(ApplicationTrigger.Offer, app.LastTrigger);
    }

    [Fact]
    public void ChangeStage_to_interview_round_signals_interview_trigger()
    {
        var app = New();
        app.ChangeStage(ApplicationStage.TechnicalScreen);
        Assert.Equal(ApplicationStage.TechnicalScreen, app.CurrentStage);
        Assert.Equal(ApplicationTrigger.EnteredInterviewStage, app.LastTrigger);
    }

    [Fact]
    public void ChangeStage_to_withdrawn_sets_status_and_trigger()
    {
        var app = New();
        app.ChangeStage(ApplicationStage.Withdrawn);
        Assert.Equal(ApplicationStatus.Withdrawn, app.Status);
        Assert.Equal(ApplicationTrigger.Withdrawn, app.LastTrigger);
    }
}
