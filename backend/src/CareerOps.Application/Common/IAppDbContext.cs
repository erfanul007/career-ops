using CareerOps.Domain.Companies;
using CareerOps.Domain.JobLeads;
using CareerOps.Domain.ResumeVariants;
using CareerOps.Domain.UserProfiles;
using Microsoft.EntityFrameworkCore;
using DomainApplication = CareerOps.Domain.Applications.Application;

namespace CareerOps.Application.Common;

public interface IAppDbContext
{
    DbSet<UserProfile> UserProfiles { get; }
    DbSet<Company> Companies { get; }
    DbSet<JobLead> JobLeads { get; }
    DbSet<ResumeVariant> ResumeVariants { get; }
    DbSet<DomainApplication> Applications { get; }
    Task<bool> CanConnectAsync(CancellationToken cancellationToken = default);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
