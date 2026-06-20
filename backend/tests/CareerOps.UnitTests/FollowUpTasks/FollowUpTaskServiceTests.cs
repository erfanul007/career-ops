using CareerOps.Application.Common;
using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.JobLeads;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.UnitTests.FollowUpTasks;

public class FollowUpTaskServiceTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 20, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 20);
    }

    private static readonly FixedClock Clock = new();

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, Clock);

    private static CreateFollowUpTaskRequest Task(DateTime due, FollowUpStatus status = FollowUpStatus.Pending) =>
        new("Email recruiter", null, RelatedEntityType.JobLead, 1, due, status, Priority.High);

    [Fact]
    public async Task GetDue_returns_pending_tasks_at_or_before_now()
    {
        await using var db = NewDb();
        var svc = new FollowUpTaskService(db, Clock);
        await svc.CreateAsync(Task(Clock.UtcNow.AddHours(-1)));            // due
        await svc.CreateAsync(Task(Clock.UtcNow.AddDays(1)));             // future, not due
        await svc.CreateAsync(Task(Clock.UtcNow.AddHours(-1), FollowUpStatus.Completed)); // done, excluded

        var due = await svc.GetDueAsync();

        Assert.Single(due);
    }

    [Fact]
    public async Task Complete_sets_status_completed()
    {
        await using var db = NewDb();
        var svc = new FollowUpTaskService(db, Clock);
        var created = await svc.CreateAsync(Task(Clock.UtcNow));

        var done = await svc.CompleteAsync(created.Id);

        Assert.Equal(FollowUpStatus.Completed, done!.Status);
    }
}
