using CareerOps.Application.Settings;
using CareerOps.Domain.UserProfiles;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Infrastructure.Persistence.Repositories;

public sealed class UserProfileRepository(CareerOpsDbContext db) : IUserProfileRepository
{
    // UserProfile is a fixed singleton (D16): a single row with Id == 1.
    private const int SingletonId = 1;

    public async Task<UserProfile?> GetAsync(CancellationToken ct = default)
        => await db.UserProfiles.FirstOrDefaultAsync(p => p.Id == SingletonId, ct);

    public void Add(UserProfile profile) => db.UserProfiles.Add(profile);
}
