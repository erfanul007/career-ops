using CareerOps.Domain.Companies;

namespace CareerOps.Application.Companies;

public interface ICompanyRepository
{
    Task<Company?> FindByIdAsync(int id, CancellationToken ct = default);
    Task<Company?> FindByNormalizedNameAsync(string normalizedName, CancellationToken ct = default);
    Task<bool> HasJobsAsync(int companyId, CancellationToken ct = default);
    Task<IReadOnlyList<Company>> ListAsync(CancellationToken ct = default);
    void Add(Company company);
    void Remove(Company company);
}
