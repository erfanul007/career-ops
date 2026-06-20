using CareerOps.Application.Common;
using CareerOps.Application.ResumeVariants;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.UnitTests.ResumeVariants;

public class ResumeVariantServiceTests
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
    public async Task First_variant_becomes_default()
    {
        await using var db = NewDb();
        var dto = await new ResumeVariantService(db).CreateAsync(new("Backend .NET", "Backend Engineer", null, null));
        Assert.True(dto.IsDefault);
    }

    [Fact]
    public async Task MakeDefault_clears_previous_default()
    {
        await using var db = NewDb();
        var svc = new ResumeVariantService(db);
        var first = await svc.CreateAsync(new("Backend .NET", null, null, null));
        var second = await svc.CreateAsync(new("Platform", null, null, null));

        await svc.MakeDefaultAsync(second.Id);

        var all = await svc.ListAsync();
        Assert.Single(all, v => v.IsDefault);
        Assert.True(all.Single(v => v.Id == second.Id).IsDefault);
        Assert.False(all.Single(v => v.Id == first.Id).IsDefault);
    }

    [Fact]
    public async Task Deleting_default_promotes_another_to_default()
    {
        await using var db = NewDb();
        var svc = new ResumeVariantService(db);
        var first = await svc.CreateAsync(new("Alpha", null, null, null));   // first → IsDefault = true
        await svc.CreateAsync(new("Beta", null, null, null));

        await svc.DeleteAsync(first.Id);

        var remaining = await svc.ListAsync();
        Assert.Single(remaining);
        Assert.True(remaining[0].IsDefault);
    }
}
