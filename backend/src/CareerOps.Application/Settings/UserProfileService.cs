using CareerOps.Application.Common;
using CareerOps.Domain.UserProfiles;
using Mapster;
using Microsoft.EntityFrameworkCore;

namespace CareerOps.Application.Settings;

public sealed class UserProfileService(IAppDbContext db)
{
    private const int SingletonId = 1;

    public async Task<UserProfileDto> GetAsync(CancellationToken ct = default)
    {
        var profile = await db.UserProfiles.FirstOrDefaultAsync(p => p.Id == SingletonId, ct);
        if (profile is null)
        {
            profile = new UserProfile { Id = SingletonId, FullName = "" };
            db.UserProfiles.Add(profile);
            await db.SaveChangesAsync(ct);
        }
        return profile.Adapt<UserProfileDto>();
    }

    public async Task<UserProfileDto> UpdateAsync(UpdateUserProfileRequest request, CancellationToken ct = default)
    {
        var profile = await db.UserProfiles.FirstOrDefaultAsync(p => p.Id == SingletonId, ct);
        if (profile is null)
        {
            profile = new UserProfile { Id = SingletonId };
            db.UserProfiles.Add(profile);
        }
        request.Adapt(profile);
        await db.SaveChangesAsync(ct);
        return profile.Adapt<UserProfileDto>();
    }
}
