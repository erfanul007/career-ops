using System.ComponentModel;
using CareerOps.Application.Settings;
using ModelContextProtocol.Server;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public static class ProfileTools
{
    [McpServerTool, Description("Get the user's job-search profile: target roles, target salary, and search deadline.")]
    public static Task<UserProfileDto> GetUserProfile(UserProfileService service, CancellationToken ct = default)
        => service.GetAsync(ct);

    [McpServerTool, Description("Update the user's job-search profile (full name required; target roles, salary, search deadline, links, etc.).")]
    public static Task<UserProfileDto> UpdateUserProfile(UpdateUserProfileRequest request, UserProfileService service, CancellationToken ct = default)
        => service.UpdateAsync(request, ct);
}
