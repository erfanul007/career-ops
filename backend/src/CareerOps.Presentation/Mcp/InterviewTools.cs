using System.ComponentModel;
using CareerOps.Application.Interviews;
using ModelContextProtocol.Server;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public static class InterviewTools
{
    [McpServerTool, Description("List all interviews (most recent first).")]
    public static Task<IReadOnlyList<InterviewDto>> ListInterviews(InterviewService service, CancellationToken ct = default)
        => service.ListAsync(ct);

    [McpServerTool, Description("List interviews scheduled within the next 7 days.")]
    public static Task<IReadOnlyList<InterviewDto>> ListUpcomingInterviews(InterviewService service, CancellationToken ct = default)
        => service.GetUpcomingAsync(ct);

    [McpServerTool, Description("Get one interview by id. Returns null if not found.")]
    public static Task<InterviewDto?> GetInterview(int id, InterviewService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);

    [McpServerTool, Description("Schedule an interview for an application. Returns null if the application does not exist.")]
    public static Task<InterviewDto?> CreateInterview(CreateInterviewRequest request, InterviewService service, CancellationToken ct = default)
        => service.CreateAsync(request, ct);

    [McpServerTool, Description("Mark an interview completed with an outcome and optional feedback; optionally creates a follow-up task. Returns null if not found.")]
    public static Task<InterviewDto?> MarkInterviewCompleted(int id, MarkInterviewCompletedRequest request, InterviewService service, CancellationToken ct = default)
        => service.MarkCompletedAsync(id, request, ct);
}
