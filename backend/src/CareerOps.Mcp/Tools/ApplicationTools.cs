using System.ComponentModel;
using CareerOps.Application.Applications;
using ModelContextProtocol.Server;

namespace CareerOps.Mcp.Tools;

[McpServerToolType]
public static class ApplicationTools
{
    [McpServerTool, Description("List all applications with their job title, company, stage, and status.")]
    public static Task<IReadOnlyList<ApplicationDto>> ListApplications(ApplicationService service, CancellationToken ct = default)
        => service.ListAsync(ct);

    [McpServerTool, Description("Get one application by id. Returns null if not found.")]
    public static Task<ApplicationDto?> GetApplication(int id, ApplicationService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);
}
