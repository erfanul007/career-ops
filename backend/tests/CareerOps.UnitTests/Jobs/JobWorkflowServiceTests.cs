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

public sealed class JobWorkflowServiceTests
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

    private static async Task<Job> SeedJob(CareerOpsDbContext db, JobStatus status = JobStatus.Interested)
    {
        var company = new CareerOps.Domain.Companies.Company { Name = "Acme", CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow };
        db.Companies.Add(company);
        await db.SaveChangesAsync();

        var job = new Job
        {
            CompanyId = company.Id,
            Title = "Dev",
            Status = status,
            Priority = Priority.Medium,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        return job;
    }

    [Fact]
    public async Task TransitionToApplied_SetsAppliedAtUtcWhenNull()
    {
        var dbName = nameof(TransitionToApplied_SetsAppliedAtUtcWhenNull);
        var now = new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db);

        var svc = new JobWorkflowService(new JobRepository(db), db, clock);
        await svc.TransitionJobAsync(job.Id, JobStatus.Applied, null, TransitionActor.User);

        await using var db2 = Db(dbName, clock);
        var updated = await db2.Jobs.FindAsync(job.Id);
        Assert.Equal(now, updated!.AppliedAtUtc);
    }

    [Fact]
    public async Task TransitionToApplied_DoesNotOverwriteExistingAppliedAtUtc()
    {
        var dbName = nameof(TransitionToApplied_DoesNotOverwriteExistingAppliedAtUtc);
        var original = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var now = new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db);
        job.AppliedAtUtc = original;
        await db.SaveChangesAsync();

        var svc = new JobWorkflowService(new JobRepository(db), db, clock);
        await svc.TransitionJobAsync(job.Id, JobStatus.Applied, null, TransitionActor.User);

        await using var db2 = Db(dbName, clock);
        var updated = await db2.Jobs.FindAsync(job.Id);
        Assert.Equal(original, updated!.AppliedAtUtc);
    }

    [Fact]
    public async Task TransitionToApplied_CreatesFollowUpDue7Days()
    {
        var dbName = nameof(TransitionToApplied_CreatesFollowUpDue7Days);
        var now = new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db);

        var svc = new JobWorkflowService(new JobRepository(db), db, clock);
        await svc.TransitionJobAsync(job.Id, JobStatus.Applied, null, TransitionActor.User);

        await using var db2 = Db(dbName, clock);
        var followUp = await db2.FollowUpTasks.FirstOrDefaultAsync(f => f.JobId == job.Id);
        Assert.NotNull(followUp);
        Assert.Equal(now.AddDays(7), followUp!.DueAtUtc);
    }

    [Fact]
    public async Task StatusChangingTransition_AppendsTransitionRow()
    {
        var dbName = nameof(StatusChangingTransition_AppendsTransitionRow);
        var now = new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc);
        var clock = new FixedClock(now);
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db, JobStatus.Interested);

        var svc = new JobWorkflowService(new JobRepository(db), db, clock);
        await svc.TransitionJobAsync(job.Id, JobStatus.Applied, "applying now", TransitionActor.User);

        await using var db2 = Db(dbName, clock);
        var transition = await db2.JobTransitions.FirstOrDefaultAsync(t => t.JobId == job.Id);
        Assert.NotNull(transition);
        Assert.Equal(JobStatus.Interested, transition!.FromStatus);
        Assert.Equal(JobStatus.Applied, transition.ToStatus);
        Assert.Equal(TransitionActor.User, transition.Actor);
        Assert.Equal("applying now", transition.Notes);
    }

    [Fact]
    public async Task SameStatusTransition_IsNoOp_NoTransitionRowAppended()
    {
        var dbName = nameof(SameStatusTransition_IsNoOp_NoTransitionRowAppended);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db, JobStatus.Applied);

        var svc = new JobWorkflowService(new JobRepository(db), db, clock);
        var result = await svc.TransitionJobAsync(job.Id, JobStatus.Applied, null, TransitionActor.User);

        await using var db2 = Db(dbName, clock);
        var count = await db2.JobTransitions.CountAsync(t => t.JobId == job.Id);
        Assert.Equal(0, count);
        Assert.Equal(JobStatus.Applied, result.NewStatus);
    }

    [Fact]
    public async Task SameStatusTransition_DoesNotCreateFollowUp()
    {
        var dbName = nameof(SameStatusTransition_DoesNotCreateFollowUp);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db, JobStatus.Applied);

        var svc = new JobWorkflowService(new JobRepository(db), db, clock);
        await svc.TransitionJobAsync(job.Id, JobStatus.Applied, null, TransitionActor.User);

        await using var db2 = Db(dbName, clock);
        var count = await db2.FollowUpTasks.CountAsync(f => f.JobId == job.Id);
        Assert.Equal(0, count);
    }

    [Fact]
    public async Task TransitionToInterviewing_ReturnsSuggestion()
    {
        var dbName = nameof(TransitionToInterviewing_ReturnsSuggestion);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db);

        var svc = new JobWorkflowService(new JobRepository(db), db, clock);
        var result = await svc.TransitionJobAsync(job.Id, JobStatus.Interviewing, null, TransitionActor.Agent);

        Assert.NotNull(result.Suggestion);
    }

    [Fact]
    public async Task ActorStoredCorrectlyOnTransitionRow()
    {
        var dbName = nameof(ActorStoredCorrectlyOnTransitionRow);
        var clock = new FixedClock(new DateTime(2026, 6, 25, 10, 0, 0, DateTimeKind.Utc));
        await using var db = Db(dbName, clock);
        var job = await SeedJob(db);

        var svc = new JobWorkflowService(new JobRepository(db), db, clock);
        await svc.TransitionJobAsync(job.Id, JobStatus.Applied, null, TransitionActor.Agent);

        await using var db2 = Db(dbName, clock);
        var transition = await db2.JobTransitions.FirstAsync(t => t.JobId == job.Id);
        Assert.Equal(TransitionActor.Agent, transition.Actor);
    }
}
