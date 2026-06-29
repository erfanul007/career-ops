using CareerOps.Application.Common;
using CareerOps.Domain.UserProfiles;
using Mapster;

namespace CareerOps.Application.Settings;

public sealed class UserProfileService(IUserProfileRepository profiles, IUnitOfWork uow)
{
    private const int SingletonId = 1;

    public async Task<UserProfileDto> GetAsync(CancellationToken ct = default)
    {
        var profile = await profiles.GetAsync(ct);
        if (profile is null)
        {
            profile = new UserProfile { Id = SingletonId, FullName = "" };
            profiles.Add(profile);
            await uow.SaveChangesAsync(ct);
        }
        return profile.Adapt<UserProfileDto>();
    }

    public async Task<UserProfileDto> UpdateAsync(UpdateUserProfileRequest request, CancellationToken ct = default)
    {
        var profile = await profiles.GetAsync(ct);
        if (profile is null)
        {
            profile = new UserProfile { Id = SingletonId };
            profiles.Add(profile);
        }
        request.Adapt(profile);
        await uow.SaveChangesAsync(ct);
        return profile.Adapt<UserProfileDto>();
    }
}
