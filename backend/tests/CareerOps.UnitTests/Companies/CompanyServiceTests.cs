using CareerOps.Application.Common;
using CareerOps.Application.Companies;
using CareerOps.Domain.Companies;
using CareerOps.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.UnitTests.Companies;

public class CompanyServiceTests
{
    private sealed class FixedClock : IClock
    {
        public DateTime UtcNow => new(2026, 6, 19, 12, 0, 0, DateTimeKind.Utc);
        public DateOnly Today => new(2026, 6, 19);
    }

    private static CareerOpsDbContext NewDb() =>
        new(new DbContextOptionsBuilder<CareerOpsDbContext>()
            .UseInMemoryDatabase($"careerops-{Guid.NewGuid()}").Options, new FixedClock());

    private static CreateCompanyRequest NewCompany(string name = "Equinor") => new(
        Name: name, WebsiteUrl: "https://equinor.com", LinkedInUrl: null,
        Country: "Norway", City: "Stavanger",
        CompanyType: CompanyType.Enterprise, MarketType: MarketType.Hybrid,
        CompensationFit: CompensationFit.High, Notes: null);

    [Fact]
    public async Task CreateAsync_persists_and_sets_audit()
    {
        await using var db = NewDb();
        var svc = new CompanyService(db);

        var dto = await svc.CreateAsync(NewCompany());

        Assert.True(dto.Id > 0);
        Assert.Equal("Equinor", dto.Name);
        Assert.NotEqual(default, dto.CreatedAtUtc);
    }

    [Fact]
    public async Task UpdateAsync_changes_fields()
    {
        await using var db = NewDb();
        var svc = new CompanyService(db);
        var created = await svc.CreateAsync(NewCompany());

        var updated = await svc.UpdateAsync(created.Id, new UpdateCompanyRequest(
            Name: "Equinor ASA", WebsiteUrl: null, LinkedInUrl: null,
            Country: "Norway", City: "Oslo",
            CompanyType: CompanyType.Enterprise, MarketType: MarketType.International,
            CompensationFit: CompensationFit.High, Notes: "renamed"));

        Assert.NotNull(updated);
        Assert.Equal("Equinor ASA", updated!.Name);
        Assert.Equal("Oslo", updated.City);
    }

    [Fact]
    public async Task UpdateAsync_returns_null_when_missing()
    {
        await using var db = NewDb();
        var svc = new CompanyService(db);

        var updated = await svc.UpdateAsync(999, new UpdateCompanyRequest(
            "X", null, null, null, null,
            CompanyType.Unknown, MarketType.Unknown, CompensationFit.Unknown, null));

        Assert.Null(updated);
    }

    [Fact]
    public async Task DeleteAsync_removes_and_reports()
    {
        await using var db = NewDb();
        var svc = new CompanyService(db);
        var created = await svc.CreateAsync(NewCompany());

        Assert.True(await svc.DeleteAsync(created.Id));
        Assert.False(await svc.DeleteAsync(created.Id));
        Assert.Empty(await svc.ListAsync());
    }
}
