using CareerOps.Application.Common;
using CareerOps.Application.Settings;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.UnitTests.Settings;

public class UserProfileServiceTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 19, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 19);
    }

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, new FixedClock());

    [Fact]
    public async Task GetAsync_creates_singleton_when_missing()
    {
        await using var db = NewDb();
        var svc = new UserProfileService(db);

        var dto = await svc.GetAsync();

        Assert.Equal(1, dto.Id);
        Assert.Equal(string.Empty, dto.FullName);
    }

    [Fact]
    public async Task UpdateAsync_then_GetAsync_returns_saved_values()
    {
        await using var db = NewDb();
        var svc = new UserProfileService(db);

        await svc.UpdateAsync(new UpdateUserProfileRequest(
            FullName: "Ada Lovelace", Email: null, Phone: null,
            LinkedInUrl: null, GitHubUrl: null, PortfolioUrl: null,
            CurrentLocation: null, TargetRoles: null, TargetSalaryMin: null,
            TargetSalaryCurrency: null, SearchDeadlineUtc: null,
            PreferredTechStack: null, CareerSummary: null));

        var dto = await svc.GetAsync();

        Assert.Equal(1, dto.Id);
        Assert.Equal("Ada Lovelace", dto.FullName);
        Assert.NotEqual(default, dto.UpdatedAtUtc);
    }
}
