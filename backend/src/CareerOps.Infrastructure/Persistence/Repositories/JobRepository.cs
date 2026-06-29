using CareerOps.Application.Jobs;
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Infrastructure.Persistence.Repositories;

public sealed class JobRepository(CareerOpsDbContext db) : IJobRepository
{
    public async Task<Job?> FindByIdAsync(int id, CancellationToken ct = default)
        => await db.Jobs.FindAsync([id], ct);

    public async Task<Job?> GetDetailAsync(int id, CancellationToken ct = default)
        => await db.Jobs
            .Include(j => j.Company)
            .Include(j => j.Activities)
            .Include(j => j.Properties)
            .Include(j => j.Attachments)
            .Include(j => j.FollowUps)
            .FirstOrDefaultAsync(j => j.Id == id, ct);

    public async Task<IReadOnlyList<Job>> ListAsync(ListJobsQuery query, CancellationToken ct = default)
    {
        var q = db.Jobs.Include(j => j.Company).AsQueryable();

        if (query.Statuses is { Length: > 0 })
            q = q.Where(j => query.Statuses.Contains(j.Status));
        if (query.Source.HasValue)
            q = q.Where(j => j.Source == query.Source.Value);
        if (query.RemoteMode.HasValue)
            q = q.Where(j => j.RemoteMode == query.RemoteMode.Value);
        if (query.EmploymentType.HasValue)
            q = q.Where(j => j.EmploymentType == query.EmploymentType.Value);
        if (query.Countries is { Length: > 0 })
            q = q.Where(j => query.Countries.Contains(j.Country));
        if (query.CompanyIds is { Length: > 0 })
            q = q.Where(j => query.CompanyIds.Contains(j.CompanyId));
        if (query.CompanySearch is not null)
        {
            var cs = query.CompanySearch.ToLower();
            q = q.Where(j => j.Company!.Name.ToLower().Contains(cs));
        }
        if (query.Priority.HasValue)
            q = q.Where(j => j.Priority == query.Priority.Value);
        if (query.SalaryMin.HasValue)
            q = q.Where(j => j.SalaryMin >= query.SalaryMin.Value);
        if (query.SalaryMax.HasValue)
            q = q.Where(j => j.SalaryMax <= query.SalaryMax.Value);
        if (query.AppliedFrom.HasValue)
            q = q.Where(j => j.AppliedAtUtc >= query.AppliedFrom.Value);
        if (query.AppliedTo.HasValue)
            q = q.Where(j => j.AppliedAtUtc <= query.AppliedTo.Value);
        if (query.Search is not null)
        {
            var s = query.Search.ToLower();
            q = q.Where(j =>
                j.Title.ToLower().Contains(s) ||
                j.Company!.Name.ToLower().Contains(s) ||
                (j.SourceUrl != null && j.SourceUrl.ToLower().Contains(s)) ||
                (j.Notes != null && j.Notes.ToLower().Contains(s)));
        }

        return await q.OrderByDescending(j => j.UpdatedAtUtc).ToListAsync(ct);
    }

    public async Task<bool> ExistsAsync(int id, CancellationToken ct = default)
        => await db.Jobs.AnyAsync(j => j.Id == id, ct);

    public void Add(Job job) => db.Jobs.Add(job);

    public void Remove(Job job) => db.Jobs.Remove(job);
}
