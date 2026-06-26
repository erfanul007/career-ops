using CareerOps.Domain.Companies;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Domain.Jobs;
using CareerOps.Domain.UserProfiles;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Common;

public interface IAppDbContext
{
    DbSet<UserProfile> UserProfiles { get; }
    DbSet<Company> Companies { get; }
    DbSet<Job> Jobs { get; }
    DbSet<JobActivity> JobActivities { get; }
    DbSet<JobTransition> JobTransitions { get; }
    DbSet<JobProperty> JobProperties { get; }
    DbSet<JobAttachment> JobAttachments { get; }
    DbSet<FollowUpTask> FollowUpTasks { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<bool> CanConnectAsync(CancellationToken ct = default);
}
