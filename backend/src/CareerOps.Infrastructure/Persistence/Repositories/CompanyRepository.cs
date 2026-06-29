using CareerOps.Application.Companies;
using CareerOps.Domain.Companies;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Infrastructure.Persistence.Repositories;

public sealed class CompanyRepository(CareerOpsDbContext db) : ICompanyRepository
{
    public async Task<Company?> FindByIdAsync(int id, CancellationToken ct = default)
        => await db.Companies.FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task<Company?> FindByNormalizedNameAsync(string normalizedName, CancellationToken ct = default)
        => await db.Companies.FirstOrDefaultAsync(c => c.Name.Trim().ToLower() == normalizedName, ct);

    public async Task<bool> HasJobsAsync(int companyId, CancellationToken ct = default)
        => await db.Jobs.AnyAsync(j => j.CompanyId == companyId, ct);

    public async Task<IReadOnlyList<Company>> ListAsync(CancellationToken ct = default)
        => await db.Companies.OrderBy(c => c.Name).ToListAsync(ct);

    public void Add(Company company) => db.Companies.Add(company);

    public void Remove(Company company) => db.Companies.Remove(company);
}
