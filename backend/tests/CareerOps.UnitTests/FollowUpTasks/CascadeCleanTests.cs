using CareerOps.Application.Applications;
using CareerOps.Application.Common;
using CareerOps.Application.JobLeads;
using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.JobLeads;
using CareerOps.Domain.ResumeVariants;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.UnitTests.FollowUpTasks;

public class CascadeCleanTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 20, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 20);
    }

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, new FixedClock());

    [Fact]
    public async Task Deleting_lead_removes_its_follow_up_tasks()
    {
        await using var db = NewDb();
        var company = new Company { Name = "Equinor" };
        db.Companies.Add(company);
        await db.SaveChangesAsync();
        var lead = new JobLead { CompanyId = company.Id, Title = "Backend" };
        db.JobLeads.Add(lead);
        await db.SaveChangesAsync();
        db.FollowUpTasks.Add(new FollowUpTask
        {
            Title = "Follow up", RelatedEntityType = RelatedEntityType.JobLead,
            RelatedEntityId = lead.Id, DueAtUtc = new DateTime(2026, 6, 20, 0, 0, 0, DateTimeKind.Utc),
            Status = FollowUpStatus.Pending, Priority = Priority.High,
        });
        await db.SaveChangesAsync();

        await new JobLeadService(db).DeleteAsync(lead.Id);

        Assert.Empty(await db.FollowUpTasks.ToListAsync());
    }

    [Fact]
    public async Task Deleting_application_removes_its_follow_up_tasks()
    {
        await using var db = NewDb();
        var company = new Company { Name = "Equinor" };
        db.Companies.Add(company);
        var variant = new ResumeVariant { Name = "Backend .NET", IsDefault = true };
        db.ResumeVariants.Add(variant);
        await db.SaveChangesAsync();
        var lead = new JobLead { CompanyId = company.Id, Title = "Backend Engineer", Status = JobLeadStatus.Interested };
        db.JobLeads.Add(lead);
        await db.SaveChangesAsync();

        var result = await new ApplicationService(db).ConvertAsync(
            lead.Id,
            new ConvertToApplicationRequest(variant.Id, new DateTime(2026, 6, 20, 0, 0, 0, DateTimeKind.Utc), null, null, null));
        var appId = result.Application!.Id;

        db.FollowUpTasks.Add(new FollowUpTask
        {
            Title = "Send thank-you", RelatedEntityType = RelatedEntityType.Application,
            RelatedEntityId = appId, DueAtUtc = new DateTime(2026, 6, 21, 0, 0, 0, DateTimeKind.Utc),
            Status = FollowUpStatus.Pending, Priority = Priority.Medium,
        });
        await db.SaveChangesAsync();

        await new ApplicationService(db).DeleteAsync(appId);

        Assert.Empty(await db.FollowUpTasks.ToListAsync());
    }
}
