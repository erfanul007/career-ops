using CareerOps.Application.Common;
using CareerOps.Domain.Companies;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Companies;

public sealed class CompanyService(IAppDbContext db)
{
    public async Task<CompanyDto> FindOrCreateByNameAsync(string name, CancellationToken ct = default)
    {
        var normalized = name.Trim().ToLowerInvariant();
        var existing = await db.Companies
            .FirstOrDefaultAsync(c => c.Name.ToLower() == normalized, ct);
        if (existing is not null) return existing.Adapt<CompanyDto>();

        var company = new Company { Name = name.Trim() };
        db.Companies.Add(company);
        await db.SaveChangesAsync(ct);
        return company.Adapt<CompanyDto>();
    }

    public async Task<bool> HasJobsAsync(int companyId, CancellationToken ct = default)
        => await db.Jobs.AnyAsync(j => j.CompanyId == companyId, ct);

    public async Task<IReadOnlyList<CompanyDto>> ListAsync(CancellationToken ct = default)
    {
        var companies = await db.Companies.OrderBy(c => c.Name).ToListAsync(ct);
        return companies.Adapt<List<CompanyDto>>();
    }

    public async Task<CompanyDto?> GetAsync(int id, CancellationToken ct = default)
    {
        var company = await db.Companies.FirstOrDefaultAsync(c => c.Id == id, ct);
        return company?.Adapt<CompanyDto>();
    }

    public async Task<CompanyDto> CreateAsync(CreateCompanyRequest request, CancellationToken ct = default)
    {
        var company = request.Adapt<Company>();
        db.Companies.Add(company);
        await db.SaveChangesAsync(ct);
        return company.Adapt<CompanyDto>();
    }

    public async Task<CompanyDto?> UpdateAsync(int id, UpdateCompanyRequest request, CancellationToken ct = default)
    {
        var company = await db.Companies.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (company is null) return null;
        request.Adapt(company);
        await db.SaveChangesAsync(ct);
        return company.Adapt<CompanyDto>();
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var company = await db.Companies.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (company is null) return false;
        db.Companies.Remove(company);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
