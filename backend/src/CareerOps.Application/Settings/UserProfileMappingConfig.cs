using CareerOps.Domain.UserProfiles;
using Mapster;

namespace CareerOps.Application.Settings;

public sealed class UserProfileMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<UserProfile, UserProfileDto>();
        config.NewConfig<UpdateUserProfileRequest, UserProfile>()
              .Ignore(d => d.Id)
              .Ignore(d => d.CreatedAtUtc)
              .Ignore(d => d.UpdatedAtUtc);
    }
}
