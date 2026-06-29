using CareerOps.Application.Common;
using CareerOps.Domain.Companies;
using Mapster;

namespace CareerOps.Application.Companies;

public sealed class CompanyService(ICompanyRepository companies, IUnitOfWork uow)
{
    public async Task<CompanyDto> FindOrCreateByNameAsync(string name, CancellationToken ct = default)
    {
        var normalized = name.Trim().ToLowerInvariant();
        var existing = await companies.FindByNormalizedNameAsync(normalized, ct);
        if (existing is not null) return existing.Adapt<CompanyDto>();

        var company = new Company { Name = name.Trim() };
        companies.Add(company);
        await uow.SaveChangesAsync(ct);
        return company.Adapt<CompanyDto>();
    }

    public async Task<bool> HasJobsAsync(int companyId, CancellationToken ct = default)
        => await companies.HasJobsAsync(companyId, ct);

    public async Task<IReadOnlyList<CompanyDto>> ListAsync(CancellationToken ct = default)
    {
        var list = await companies.ListAsync(ct);
        return list.Adapt<List<CompanyDto>>();
    }

    public async Task<CompanyDto?> GetAsync(int id, CancellationToken ct = default)
    {
        var company = await companies.FindByIdAsync(id, ct);
        return company?.Adapt<CompanyDto>();
    }

    public async Task<CompanyDto> CreateAsync(CreateCompanyRequest request, CancellationToken ct = default)
    {
        var company = request.Adapt<Company>();
        companies.Add(company);
        await uow.SaveChangesAsync(ct);
        return company.Adapt<CompanyDto>();
    }

    public async Task<CompanyDto?> UpdateAsync(int id, UpdateCompanyRequest request, CancellationToken ct = default)
    {
        var company = await companies.FindByIdAsync(id, ct);
        if (company is null) return null;
        request.Adapt(company);
        await uow.SaveChangesAsync(ct);
        return company.Adapt<CompanyDto>();
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var company = await companies.FindByIdAsync(id, ct);
        if (company is null) return false;
        companies.Remove(company);
        await uow.SaveChangesAsync(ct);
        return true;
    }
}
