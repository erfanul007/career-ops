using CareerOps.Domain.UserProfiles;

namespace CareerOps.Application.Settings;

public interface IUserProfileRepository
{
    Task<UserProfile?> GetAsync(CancellationToken ct = default);
    void Add(UserProfile profile);
}
