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

    [McpServerTool, Description("Get one resume variant by id. Returns null if not found.")]
    public static Task<ResumeVariantDto?> GetResumeVariant(int id, ResumeVariantService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);

    [McpServerTool, Description("Create a resume variant (the first one created becomes the default).")]
    public static Task<ResumeVariantDto> CreateResumeVariant(CreateResumeVariantRequest request, ResumeVariantService service, CancellationToken ct = default)
        => service.CreateAsync(request, ct);

    [McpServerTool, Description("Update a resume variant. Returns null if not found.")]
    public static Task<ResumeVariantDto?> UpdateResumeVariant(int id, UpdateResumeVariantRequest request, ResumeVariantService service, CancellationToken ct = default)
        => service.UpdateAsync(id, request, ct);

    [McpServerTool, Description("Delete a resume variant by id (blocked if referenced by an application). Returns true if deleted, false if not found.")]
    public static Task<bool> DeleteResumeVariant(int id, ResumeVariantService service, CancellationToken ct = default)
        => service.DeleteAsync(id, ct);

    [McpServerTool, Description("Make a resume variant the default. Returns null if not found.")]
    public static Task<ResumeVariantDto?> MakeResumeVariantDefault(int id, ResumeVariantService service, CancellationToken ct = default)
        => service.MakeDefaultAsync(id, ct);
}
