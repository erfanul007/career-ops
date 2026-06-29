using CareerOps.Application.Common;
using CareerOps.Application.Companies;
using CareerOps.Application.Jobs;
using CareerOps.Domain.Common;
using CareerOps.Domain.Companies;
using CareerOps.Domain.Jobs;
using CareerOps.Infrastructure.Persistence;
using CareerOps.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CareerOps.UnitTests.Jobs;

// Covers JobService through the real repositories: the aggregate-navigation seed-transition
// write on create, the find-or-create company path, and the relocated ListJobs filter/ordering.
public sealed class JobServiceTests
{
    private sealed class TestClock(DateTime utcNow) : IClock
    {
        public DateTime UtcNow { get; set; } = utcNow;
        public DateOnly Today => DateOnly.FromDateTime(UtcNow);
    }

    private static CareerOpsDbContext NewDb(IClock clock) =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, clock);

    private static JobService MakeService(CareerOpsDbContext db, IClock clock) =>
        new(new JobRepository(db),
            new JobAttachmentRepository(db),
            new JobPropertyRepository(db),
            db,
            clock,
            new CompanyService(new CompanyRepository(db), db));

    private static CreateJobRequest NewJob(
        int? companyId = null,
        string? companyName = null,
        string title = "Dev",
        JobStatus status = JobStatus.Discovered) => new(
        CompanyId: companyId,
        Title: title,
        Status: status,
        Priority: Priority.Medium,
        Source: JobSource.LinkedIn,
        SourceUrl: null,
        JobDescription: null,
        Country: null,
        City: null,
        LocationText: null,
        RemoteMode: RemoteMode.OnSite,
        EmploymentType: EmploymentType.FullTime,
        SalaryMin: null,
        SalaryMax: null,
        SalaryCurrency: null,
        SalaryPeriod: SalaryPeriod.Annual,
        DeadlineAtUtc: null,
        FitScore: null,
        ResumeLabel: null,
        ResumeAngle: null,
        CoverLetterNotes: null,
        Notes: null,
        CompanyName: companyName);

    private static async Task<Company> SeedCompany(CareerOpsDbContext db, string name = "Acme")
    {
        var company = new Company { Name = name };
        db.Companies.Add(company);
        await db.SaveChangesAsync();
        return company;
    }

    [Fact]
    public async Task CreateJob_SeedsSingleCreationTransition()
    {
        var clock = new TestClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = NewDb(clock);
        var company = await SeedCompany(db);
        var svc = MakeService(db, clock);

        var detail = await svc.CreateJobAsync(NewJob(companyId: company.Id, status: JobStatus.Interested));

        var transitions = await db.JobTransitions.Where(t => t.JobId == detail.Id).ToListAsync();
        var seed = Assert.Single(transitions);
        Assert.Null(seed.FromStatus);
        Assert.Equal(JobStatus.Interested, seed.ToStatus);
        Assert.Equal(TransitionActor.User, seed.Actor);
        Assert.Equal("Job created", seed.Notes);
    }

    [Fact]
    public async Task CreateJob_WithCompanyName_FindsOrCreatesCompany()
    {
        var clock = new TestClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = NewDb(clock);
        var svc = MakeService(db, clock);

        var detail = await svc.CreateJobAsync(NewJob(companyName: "Acme"));

        var company = Assert.Single(await db.Companies.ToListAsync());
        Assert.Equal("Acme", company.Name);
        var job = await db.Jobs.FirstAsync(j => j.Id == detail.Id);
        Assert.Equal(company.Id, job.CompanyId);
    }

    [Fact]
    public async Task ListJobs_FiltersByStatus_AndOrdersByUpdatedAtDesc()
    {
        var clock = new TestClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = NewDb(clock);
        var company = await SeedCompany(db);
        var svc = MakeService(db, clock);

        await svc.CreateJobAsync(NewJob(companyId: company.Id, title: "Applied", status: JobStatus.Applied));
        clock.UtcNow = clock.UtcNow.AddMinutes(5);
        await svc.CreateJobAsync(NewJob(companyId: company.Id, title: "Interviewing", status: JobStatus.Interviewing));
        clock.UtcNow = clock.UtcNow.AddMinutes(5);
        await svc.CreateJobAsync(NewJob(companyId: company.Id, title: "Discovered", status: JobStatus.Discovered));

        var result = await svc.ListJobsAsync(new ListJobsQuery(Statuses: [JobStatus.Applied, JobStatus.Interviewing]));

        Assert.Equal(2, result.Count);
        Assert.Equal("Interviewing", result[0].Title); // updated most recently → first
        Assert.Equal("Applied", result[1].Title);
    }

    [Fact]
    public async Task ListJobs_Search_MatchesCompanyName()
    {
        var clock = new TestClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = NewDb(clock);
        var acme = await SeedCompany(db, "Acme");
        var globex = await SeedCompany(db, "Globex");
        var svc = MakeService(db, clock);
        await svc.CreateJobAsync(NewJob(companyId: acme.Id, title: "Engineer"));
        await svc.CreateJobAsync(NewJob(companyId: globex.Id, title: "Designer"));

        var result = await svc.ListJobsAsync(new ListJobsQuery(Search: "acme"));

        var job = Assert.Single(result);
        Assert.Equal("Engineer", job.Title);
        Assert.Equal("Acme", job.CompanyName);
    }
}
