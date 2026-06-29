using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.Common;
using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Xunit;

namespace CareerOps.UnitTests.FollowUpTasks;

public sealed class FollowUpTaskServiceTests
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
            .UseInMemoryDatabase(name, Root).Options;
        return new CareerOpsDbContext(opts, clock);
    }

    [Fact]
    public async Task Create_StandaloneTask_NoJobId()
    {
        var dbName = nameof(Create_StandaloneTask_NoJobId);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var svc = new FollowUpTaskService(db, clock);

        var dto = await svc.CreateAsync(new CreateFollowUpTaskRequest("Call recruiter", null, clock.UtcNow.AddDays(3), Priority.Low, null, null));

        Assert.Null(dto.JobId);
        Assert.Null(dto.JobActivityId);
    }

    [Fact]
    public async Task Create_WithActivityButNoJob_Throws()
    {
        var dbName = nameof(Create_WithActivityButNoJob_Throws);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var svc = new FollowUpTaskService(db, clock);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.CreateAsync(new CreateFollowUpTaskRequest("Test", null, clock.UtcNow.AddDays(1), Priority.Low, JobId: null, JobActivityId: 99)));
    }

    [Fact]
    public async Task Complete_SetsStatusCompleted()
    {
        var dbName = nameof(Complete_SetsStatusCompleted);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var svc = new FollowUpTaskService(db, clock);
        var dto = await svc.CreateAsync(new CreateFollowUpTaskRequest("Test", null, clock.UtcNow.AddDays(1), Priority.Low, null, null));

        await svc.CompleteAsync(dto.Id);

        await using var db2 = Db(dbName, clock);
        var task = await db2.FollowUpTasks.FindAsync(dto.Id);
        Assert.Equal(FollowUpStatus.Completed, task!.Status);
    }

    private static async Task<(int JobId, int ActivityId)> SeedJobWithActivity(CareerOpsDbContext db, string jobTitle = "Dev")
    {
        var company = new Company { Name = "Acme" };
        db.Companies.Add(company);
        await db.SaveChangesAsync();
        var job = new Job { CompanyId = company.Id, Title = jobTitle, Status = JobStatus.Interviewing, Priority = Priority.Medium };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        var activity = new JobActivity { JobId = job.Id, Label = "Round 1", Type = JobActivityType.Interview, Status = JobActivityStatus.Planned, Outcome = JobActivityOutcome.Unknown };
        db.JobActivities.Add(activity);
        await db.SaveChangesAsync();
        return (job.Id, activity.Id);
    }

    [Fact]
    public async Task Create_WithActivityFromDifferentJob_Throws()
    {
        var dbName = nameof(Create_WithActivityFromDifferentJob_Throws);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var (_, activityId) = await SeedJobWithActivity(db);
        var (otherJobId, _) = await SeedJobWithActivity(db, jobTitle: "Other");
        var svc = new FollowUpTaskService(db, clock);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.CreateAsync(new CreateFollowUpTaskRequest("Thank you", null, clock.UtcNow.AddDays(1), Priority.Low, JobId: otherJobId, JobActivityId: activityId)));
    }

    [Fact]
    public async Task Create_WithActivityBelongingToJob_Succeeds()
    {
        var dbName = nameof(Create_WithActivityBelongingToJob_Succeeds);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var (jobId, activityId) = await SeedJobWithActivity(db);
        var svc = new FollowUpTaskService(db, clock);

        var dto = await svc.CreateAsync(new CreateFollowUpTaskRequest("Thank you", null, clock.UtcNow.AddDays(1), Priority.Low, JobId: jobId, JobActivityId: activityId));

        Assert.Equal(jobId, dto.JobId);
        Assert.Equal(activityId, dto.JobActivityId);
    }

    [Fact]
    public async Task Create_WithMissingActivity_Throws()
    {
        var dbName = nameof(Create_WithMissingActivity_Throws);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var (jobId, _) = await SeedJobWithActivity(db);
        var svc = new FollowUpTaskService(db, clock);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            svc.CreateAsync(new CreateFollowUpTaskRequest("Thank you", null, clock.UtcNow.AddDays(1), Priority.Low, JobId: jobId, JobActivityId: 99999)));
    }

    [Fact]
    public async Task Delete_RemovesTask_AndReportsMissing()
    {
        var dbName = nameof(Delete_RemovesTask_AndReportsMissing);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var svc = new FollowUpTaskService(db, clock);
        var dto = await svc.CreateAsync(new CreateFollowUpTaskRequest("Test", null, clock.UtcNow.AddDays(1), Priority.Low, null, null));

        Assert.True(await svc.DeleteAsync(dto.Id));
        Assert.False(await svc.DeleteAsync(dto.Id));

        await using var db2 = Db(dbName, clock);
        Assert.Null(await db2.FollowUpTasks.FindAsync(dto.Id));
    }
}
