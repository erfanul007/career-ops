using System.ComponentModel;
using CareerOps.Application.ResumeVariants;
using ModelContextProtocol.Server;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public static class ResumeVariantTools
{
    [McpServerTool, Description("List all resume variants (name, target role, default flag).")]
    public static Task<IReadOnlyList<ResumeVariantDto>> ListResumeVariants(ResumeVariantService service, CancellationToken ct = default)
        => service.ListAsync(ct);
}
