using System.ComponentModel;
using CareerOps.Application.Applications;
using ModelContextProtocol.Server;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public static class ApplicationTools
{
    [McpServerTool, Description("List all applications with their job title, company, stage, and status.")]
    public static Task<IReadOnlyList<ApplicationDto>> ListApplications(ApplicationService service, CancellationToken ct = default)
        => service.ListAsync(ct);

    [McpServerTool, Description("Get one application by id. Returns null if not found.")]
    public static Task<ApplicationDto?> GetApplication(int id, ApplicationService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);

    [McpServerTool, Description("Convert a job lead into an application (selecting a resume variant). Returns the outcome (Created, LeadNotFound, or AlreadyConverted) and the created application.")]
    public static Task<ConvertResult> ConvertToApplication(int leadId, ConvertToApplicationRequest request, ApplicationService service, CancellationToken ct = default)
        => service.ConvertAsync(leadId, request, ct);

    [McpServerTool, Description("Change an application's stage (e.g. Applied, TechnicalScreen, Offer). Auto-advances the linked job lead. Returns null if not found.")]
    public static Task<ApplicationDto?> ChangeApplicationStage(int id, ChangeStageRequest request, ApplicationService service, CancellationToken ct = default)
        => service.ChangeStageAsync(id, request, ct);

    [McpServerTool, Description("Mark an application rejected, with an optional reason. Returns null if not found.")]
    public static Task<ApplicationDto?> MarkApplicationRejected(int id, MarkRejectedRequest request, ApplicationService service, CancellationToken ct = default)
        => service.MarkRejectedAsync(id, request, ct);

    [McpServerTool, Description("Mark an application as an offer. Returns null if not found.")]
    public static Task<ApplicationDto?> MarkApplicationOffer(int id, ApplicationService service, CancellationToken ct = default)
        => service.MarkOfferAsync(id, ct);

    [McpServerTool, Description("Mark an application as ghosted. Returns null if not found.")]
    public static Task<ApplicationDto?> MarkApplicationGhosted(int id, ApplicationService service, CancellationToken ct = default)
        => service.MarkGhostedAsync(id, ct);

    [McpServerTool, Description("Update an application (resume variant, applied date, salary, notice period, next step/action, notes). Returns null if not found.")]
    public static Task<ApplicationDto?> UpdateApplication(int id, UpdateApplicationRequest request, ApplicationService service, CancellationToken ct = default)
        => service.UpdateAsync(id, request, ct);

    [McpServerTool, Description("Delete an application by id (also cleans up its interviews' loose follow-ups). Returns true if deleted, false if not found.")]
    public static Task<bool> DeleteApplication(int id, ApplicationService service, CancellationToken ct = default)
        => service.DeleteAsync(id, ct);
}
