using CareerOps.Application.Common;
using CareerOps.Domain.Common;
using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using CareerOps.Domain.UserProfiles;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Infrastructure.Persistence;

public sealed class CareerOpsDbContext(DbContextOptions<CareerOpsDbContext> options, IClock clock)
    : DbContext(options), IAppDbContext
{
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<JobActivity> JobActivities => Set<JobActivity>();
    public DbSet<JobTransition> JobTransitions => Set<JobTransition>();
    public DbSet<JobProperty> JobProperties => Set<JobProperty>();
    public DbSet<JobAttachment> JobAttachments => Set<JobAttachment>();
    public DbSet<FollowUpTask> FollowUpTasks => Set<FollowUpTask>();

    public Task<bool> CanConnectAsync(CancellationToken ct = default)
        => Database.CanConnectAsync(ct);

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
