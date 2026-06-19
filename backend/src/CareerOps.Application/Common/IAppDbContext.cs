using CareerOps.Domain.UserProfiles;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Common;

public interface IAppDbContext
{
    DbSet<UserProfile> UserProfiles { get; }
    Task<bool> CanConnectAsync(CancellationToken cancellationToken = default);
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
