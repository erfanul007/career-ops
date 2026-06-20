using CareerOps.Application.Applications;
using CareerOps.Application.Common;
using CareerOps.Domain.Applications;
using CareerOps.Domain.Companies;
using CareerOps.Domain.JobLeads;
using CareerOps.Domain.ResumeVariants;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.UnitTests.Applications;

public class ApplicationServiceTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 20, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 20);
    }

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, new FixedClock());

    private static async Task<(CareerOpsDbContext db, int leadId, int variantId)> SeedAsync()
    {
        var db = NewDb();
        var company = new Company { Name = "Equinor" };
        db.Companies.Add(company);
        var variant = new ResumeVariant { Name = "Backend .NET", IsDefault = true };
        db.ResumeVariants.Add(variant);
        await db.SaveChangesAsync();
        var lead = new JobLead { CompanyId = company.Id, Title = "Backend Engineer", Status = JobLeadStatus.Interested };
        db.JobLeads.Add(lead);
        await db.SaveChangesAsync();
        return (db, lead.Id, variant.Id);
    }

    private static ConvertToApplicationRequest Convert(int variantId) =>
        new(variantId, new DateTime(2026, 6, 20, 0, 0, 0, DateTimeKind.Utc), null, null, null);

    [Fact]
    public async Task Convert_creates_application_and_advances_lead_to_applied()
    {
        var (db, leadId, variantId) = await SeedAsync();
        var result = await new ApplicationService(db).ConvertAsync(leadId, Convert(variantId));

        Assert.Equal(ConvertOutcome.Created, result.Outcome);
        Assert.Equal(ApplicationStage.Applied, result.Application!.CurrentStage);
        Assert.Equal(JobLeadStatus.Applied, (await db.JobLeads.FindAsync(leadId))!.Status);
    }

    [Fact]
    public async Task Convert_twice_is_rejected()
    {
        var (db, leadId, variantId) = await SeedAsync();
        var svc = new ApplicationService(db);
        await svc.ConvertAsync(leadId, Convert(variantId));
        var second = await svc.ConvertAsync(leadId, Convert(variantId));
        Assert.Equal(ConvertOutcome.AlreadyConverted, second.Outcome);
    }

    [Fact]
    public async Task ChangeStage_to_interview_advances_lead_to_interviewing()
    {
        var (db, leadId, variantId) = await SeedAsync();
        var svc = new ApplicationService(db);
        var app = (await svc.ConvertAsync(leadId, Convert(variantId))).Application!;

        await svc.ChangeStageAsync(app.Id, new ChangeStageRequest(ApplicationStage.TechnicalScreen));

        Assert.Equal(JobLeadStatus.Interviewing, (await db.JobLeads.FindAsync(leadId))!.Status);
    }

    [Fact]
    public async Task MarkOffer_advances_lead_to_offer()
    {
        var (db, leadId, variantId) = await SeedAsync();
        var svc = new ApplicationService(db);
        var app = (await svc.ConvertAsync(leadId, Convert(variantId))).Application!;

        await svc.MarkOfferAsync(app.Id);

        Assert.Equal(JobLeadStatus.Offer, (await db.JobLeads.FindAsync(leadId))!.Status);
    }
}
