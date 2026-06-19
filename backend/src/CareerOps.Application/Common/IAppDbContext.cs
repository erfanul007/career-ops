using CareerOps.Domain.Companies;
using CareerOps.Domain.JobLeads;
using CareerOps.Domain.UserProfiles;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Common;

public interface IAppDbContext
{
    DbSet<UserProfile> UserProfiles { get; }
    DbSet<Company> Companies { get; }
    DbSet<JobLead> JobLeads { get; }
    Task<bool> CanConnectAsync(CancellationToken cancellationToken = default);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
