using CareerOps.Application.Common;
using CareerOps.Domain.Companies;
using CareerOps.Domain.JobLeads;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.JobLeads;

public sealed class JobLeadService(IAppDbContext db)
{
    public async Task<IReadOnlyList<JobLeadDto>> ListAsync(CancellationToken ct = default)
    {
        var leads = await db.JobLeads
            .Include(l => l.Company)
            .OrderByDescending(l => l.UpdatedAtUtc)
            .ToListAsync(ct);
        return leads.Adapt<List<JobLeadDto>>();
    }

    public async Task<JobLeadDto?> GetAsync(int id, CancellationToken ct = default)
    {
        var lead = await db.JobLeads.Include(l => l.Company).FirstOrDefaultAsync(l => l.Id == id, ct);
        return lead?.Adapt<JobLeadDto>();
    }

    public async Task<JobLeadDto> CreateAsync(CreateJobLeadRequest request, CancellationToken ct = default)
    {
        var lead = request.Adapt<JobLead>();
        lead.CompanyId = await ResolveCompanyIdAsync(request.CompanyId, request.NewCompanyName, ct);
        db.JobLeads.Add(lead);
        await db.SaveChangesAsync(ct);
        return (await GetAsync(lead.Id, ct))!;
    }

    public async Task<JobLeadDto?> UpdateAsync(int id, UpdateJobLeadRequest request, CancellationToken ct = default)
    {
        var lead = await db.JobLeads.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lead is null) return null;
        request.Adapt(lead);
        lead.CompanyId = request.CompanyId;
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var lead = await db.JobLeads.FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lead is null) return false;
        db.JobLeads.Remove(lead);
        await db.SaveChangesAsync(ct);
        return true;
    }

    // D25: existing company by id, or find-or-create by case-insensitive trimmed name
    // (new companies default to Unknown enums).
    private async Task<int> ResolveCompanyIdAsync(int? companyId, string? newCompanyName, CancellationToken ct)
    {
        if (companyId is int id) return id;

        var name = newCompanyName!.Trim();
        var existing = await db.Companies
            .FirstOrDefaultAsync(c => c.Name.ToLower() == name.ToLower(), ct);
        if (existing is not null) return existing.Id;

        var company = new Company { Name = name };
        db.Companies.Add(company);
        await db.SaveChangesAsync(ct);
        return company.Id;
    }
}
