using CareerOps.Application.Common;
using CareerOps.Application.JobLeads;
using CareerOps.Domain.Companies;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.UnitTests.JobLeads;

public class JobLeadServiceTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 19, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 19);
    }

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, new FixedClock());

    private static CreateJobLeadRequest NewLead(int? companyId = null, string? newCompanyName = null) => new(
        CompanyId: companyId, NewCompanyName: newCompanyName, Title: "Backend Engineer",
        Source: Domain.JobLeads.JobSource.LinkedIn, SourceUrl: null, JobDescription: "build APIs",
        Location: "Oslo", RemoteMode: Domain.JobLeads.RemoteMode.Hybrid,
        EmploymentType: Domain.JobLeads.EmploymentType.FullTime,
        SalaryMin: 800000m, SalaryMax: 950000m, SalaryCurrency: "NOK",
        SalaryPeriod: Domain.JobLeads.SalaryPeriod.Yearly,
        Priority: Domain.JobLeads.Priority.High, Status: Domain.JobLeads.JobLeadStatus.Discovered,
        FitScore: null, NextActionAtUtc: null, DeadlineAtUtc: null, Notes: null);

    [Fact]
    public async Task CreateAsync_with_existing_companyId_links_lead()
    {
        await using var db = NewDb();
        var company = new Company { Name = "Equinor" };
        db.Companies.Add(company);
        await db.SaveChangesAsync();

        var dto = await new JobLeadService(db).CreateAsync(NewLead(companyId: company.Id));

        Assert.Equal(company.Id, dto.CompanyId);
        Assert.Equal("Equinor", dto.CompanyName);
        Assert.Equal("Backend Engineer", dto.Title);
    }

    [Fact]
    public async Task CreateAsync_with_new_company_name_creates_company()
    {
        await using var db = NewDb();
        var svc = new JobLeadService(db);

        var dto = await svc.CreateAsync(NewLead(newCompanyName: "Cognite"));

        Assert.True(dto.CompanyId > 0);
        Assert.Equal("Cognite", dto.CompanyName);
        Assert.Single(await db.Companies.ToListAsync());
    }

    [Fact]
    public async Task CreateAsync_with_existing_name_does_not_duplicate_company()
    {
        await using var db = NewDb();
        db.Companies.Add(new Company { Name = "Cognite" });
        await db.SaveChangesAsync();
        var svc = new JobLeadService(db);

        await svc.CreateAsync(NewLead(newCompanyName: "  cognite "));

        Assert.Single(await db.Companies.ToListAsync()); // matched case-insensitively, no dup
    }

    [Fact]
    public async Task UpdateAsync_changes_status_and_keeps_company()
    {
        await using var db = NewDb();
        var svc = new JobLeadService(db);
        var created = await svc.CreateAsync(NewLead(newCompanyName: "Cognite"));

        var updated = await svc.UpdateAsync(created.Id, new UpdateJobLeadRequest(
            CompanyId: created.CompanyId, Title: created.Title,
            Source: Domain.JobLeads.JobSource.LinkedIn, SourceUrl: null, JobDescription: null, Location: "Oslo",
            RemoteMode: Domain.JobLeads.RemoteMode.Remote, EmploymentType: Domain.JobLeads.EmploymentType.FullTime,
            SalaryMin: null, SalaryMax: null, SalaryCurrency: null, SalaryPeriod: Domain.JobLeads.SalaryPeriod.Yearly,
            Priority: Domain.JobLeads.Priority.Critical, Status: Domain.JobLeads.JobLeadStatus.Applied,
            FitScore: 80, NextActionAtUtc: null, DeadlineAtUtc: null, Notes: null));

        Assert.NotNull(updated);
        Assert.Equal(Domain.JobLeads.JobLeadStatus.Applied, updated!.Status);
        Assert.Equal(80, updated.FitScore);
    }

    [Fact]
    public async Task DeleteAsync_removes_lead()
    {
        await using var db = NewDb();
        var svc = new JobLeadService(db);
        var created = await svc.CreateAsync(NewLead(newCompanyName: "Cognite"));

        Assert.True(await svc.DeleteAsync(created.Id));
        Assert.Empty(await svc.ListAsync());
    }
}
