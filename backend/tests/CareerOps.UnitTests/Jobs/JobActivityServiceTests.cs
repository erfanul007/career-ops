using CareerOps.Application.Jobs;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using CareerOps.Infrastructure.Persistence;
using CareerOps.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Xunit;

namespace CareerOps.UnitTests.Jobs;

public sealed class JobActivityServiceTests
{
    private sealed class FixedClock(DateTime utcNow) : CareerOps.Application.Common.IClock
    {
        public DateTime UtcNow => utcNow;
        public DateOnly Today => DateOnly.FromDateTime(utcNow);
    }

    private static readonly InMemoryDatabaseRoot Root = new();

    private static CareerOpsDbContext Db(string name, FixedClock clock)
    {
        var opts = new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase(name, Root)
            .Options;
        return new CareerOpsDbContext(opts, clock);
    }

    private static async Task<(CareerOps.Domain.Companies.Company, Job)> Seed(CareerOpsDbContext db)
    {
        var company = new CareerOps.Domain.Companies.Company { Name = "Acme", CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.Companies.Add(company);
        await db.SaveChangesAsync();
        var job = new Job { CompanyId = company.Id, Title = "Dev", Status = JobStatus.Interviewing, Priority = Priority.Medium, CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        return (company, job);
    }

    [Fact]
    public async Task CompleteActivity_SetsStatusCompleted()
    {
        var dbName = nameof(CompleteActivity_SetsStatusCompleted);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var (_, job) = await Seed(db);
        var activity = new JobActivity { JobId = job.Id, Label = "Round 1", Type = JobActivityType.Interview, Status = JobActivityStatus.Planned, Outcome = JobActivityOutcome.Unknown, CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.JobActivities.Add(activity);
        await db.SaveChangesAsync();

        var svc = new JobActivityService(new JobActivityRepository(db), new JobRepository(db), new FollowUpTaskRepository(db), db, clock);
        await svc.CompleteActivityAsync(job.Id, activity.Id, new CompleteActivityRequest(JobActivityOutcome.Passed, "Good", "Notes", false));

        await using var db2 = Db(dbName, clock);
        var updated = await db2.JobActivities.FindAsync(activity.Id);
        Assert.Equal(JobActivityStatus.Completed, updated!.Status);
        Assert.Equal(JobActivityOutcome.Passed, updated.Outcome);
        Assert.Equal("Good", updated.Feedback);
    }

    [Fact]
    public async Task CompleteActivity_WithCreateFollowUp_CreatesFollowUp()
    {
        var dbName = nameof(CompleteActivity_WithCreateFollowUp_CreatesFollowUp);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var (_, job) = await Seed(db);
        var activity = new JobActivity { JobId = job.Id, Label = "Round 1", Type = JobActivityType.Interview, Status = JobActivityStatus.Planned, Outcome = JobActivityOutcome.Unknown, CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.JobActivities.Add(activity);
        await db.SaveChangesAsync();

        var svc = new JobActivityService(new JobActivityRepository(db), new JobRepository(db), new FollowUpTaskRepository(db), db, clock);
        await svc.CompleteActivityAsync(job.Id, activity.Id, new CompleteActivityRequest(JobActivityOutcome.Passed, null, null, CreateFollowUp: true));

        await using var db2 = Db(dbName, clock);
        var followUp = await db2.FollowUpTasks.FirstOrDefaultAsync(f => f.JobActivityId == activity.Id);
        Assert.NotNull(followUp);
        Assert.Equal(job.Id, followUp!.JobId);
    }

    [Fact]
    public async Task DeleteActivity_NullifiesFollowUpJobActivityId_PreservesJobId()
    {
        var dbName = nameof(DeleteActivity_NullifiesFollowUpJobActivityId_PreservesJobId);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var (_, job) = await Seed(db);
        var activity = new JobActivity { JobId = job.Id, Label = "Round 1", Type = JobActivityType.Interview, Status = JobActivityStatus.Planned, Outcome = JobActivityOutcome.Unknown, CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.JobActivities.Add(activity);
        await db.SaveChangesAsync();
        var followUp = new FollowUpTask { JobId = job.Id, JobActivityId = activity.Id, Title = "Thank you", DueAtUtc = DateTime.UtcNow.AddDays(1), Status = FollowUpStatus.Pending, Priority = Priority.Low, CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.FollowUpTasks.Add(followUp);
        await db.SaveChangesAsync();

        var svc = new JobActivityService(new JobActivityRepository(db), new JobRepository(db), new FollowUpTaskRepository(db), db, clock);
        await svc.DeleteActivityAsync(job.Id, activity.Id);

        await using var db2 = Db(dbName, clock);
        var fu = await db2.FollowUpTasks.FindAsync(followUp.Id);
        Assert.NotNull(fu);
        Assert.Null(fu!.JobActivityId);
        Assert.Equal(job.Id, fu.JobId);
    }
}
