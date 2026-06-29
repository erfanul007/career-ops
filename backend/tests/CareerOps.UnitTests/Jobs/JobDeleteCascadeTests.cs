using CareerOps.Application.Common;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace CareerOps.UnitTests.Jobs;

public sealed class JobDeleteCascadeTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 29, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 29);
    }

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, new FixedClock());

    [Theory]
    [InlineData(typeof(JobActivity))]
    [InlineData(typeof(JobTransition))]
    [InlineData(typeof(JobProperty))]
    [InlineData(typeof(JobAttachment))]
    [InlineData(typeof(FollowUpTask))]
    public void Job_owned_relationships_cascade_on_job_delete(Type dependent)
    {
        using var db = NewDb();
        var fk = db.Model.FindEntityType(dependent)!
            .GetForeignKeys()
            .Single(f => f.PrincipalEntityType.ClrType == typeof(Job));
        Assert.Equal(DeleteBehavior.Cascade, fk.DeleteBehavior);
    }

    [Fact]
    public void FollowUp_activity_link_is_set_null_on_activity_delete()
    {
        using var db = NewDb();
        var fk = db.Model.FindEntityType(typeof(FollowUpTask))!
            .GetForeignKeys()
            .Single(f => f.PrincipalEntityType.ClrType == typeof(JobActivity));
        Assert.Equal(DeleteBehavior.SetNull, fk.DeleteBehavior);
    }
}
