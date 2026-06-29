using CareerOps.Application.Jobs;
using CareerOps.Domain.Jobs;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Infrastructure.Persistence.Repositories;

public sealed class JobPropertyRepository(CareerOpsDbContext db) : IJobPropertyRepository
{
    public async Task<JobProperty?> FindByKeyAsync(int jobId, string key, CancellationToken ct = default)
        => await db.JobProperties.FirstOrDefaultAsync(p => p.JobId == jobId && p.Key == key, ct);

    public void Add(JobProperty property) => db.JobProperties.Add(property);

    public void Remove(JobProperty property) => db.JobProperties.Remove(property);
}
