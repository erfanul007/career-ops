using CareerOps.Application.Common;
using CareerOps.Application.JobLeads;
using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.JobLeads;
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
}
