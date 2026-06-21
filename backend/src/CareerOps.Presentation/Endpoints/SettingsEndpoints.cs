using CareerOps.Presentation.Filters;
using CareerOps.Application.Settings;

namespace CareerOps.Presentation.Endpoints;

public static class SettingsEndpoints
{
    public static RouteGroupBuilder MapSettings(this RouteGroupBuilder group)
    {
        group.MapGet("/profile", async (UserProfileService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.GetAsync(ct)))
             .WithName("GetUserProfile");

        group.MapPut("/profile", async (UpdateUserProfileRequest req, UserProfileService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.UpdateAsync(req, ct)))
             .WithName("UpdateUserProfile")
             .AddEndpointFilter<ValidationFilter<UpdateUserProfileRequest>>()
             .ProducesValidationProblem();

        return group;
    }
}
