using CareerOps.Application.Common;
using CareerOps.Domain.Common;
using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.JobLeads;
using CareerOps.Domain.ResumeVariants;
using CareerOps.Domain.UserProfiles;
using Microsoft.EntityFrameworkCore;
using DomainApplication = CareerOps.Domain.Applications.Application;

namespace CareerOps.Infrastructure.Persistence;

public sealed class CareerOpsDbContext(DbContextOptions<CareerOpsDbContext> options, IClock clock)
    : DbContext(options), IAppDbContext
{
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<JobLead> JobLeads => Set<JobLead>();
    public DbSet<ResumeVariant> ResumeVariants => Set<ResumeVariant>();
    public DbSet<DomainApplication> Applications => Set<DomainApplication>();
    public DbSet<FollowUpTask> FollowUpTasks => Set<FollowUpTask>();

    public Task<bool> CanConnectAsync(CancellationToken cancellationToken = default)
        => Database.CanConnectAsync(cancellationToken);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
        => modelBuilder.ApplyConfigurationsFromAssembly(typeof(CareerOpsDbContext).Assembly);

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = clock.UtcNow;
        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Added) entry.Entity.CreatedAtUtc = now;
            if (entry.State is EntityState.Added or EntityState.Modified) entry.Entity.UpdatedAtUtc = now;
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
