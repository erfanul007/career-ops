using System.ComponentModel;
using CareerOps.Application.JobLeads;
using ModelContextProtocol.Server;

namespace CareerOps.Mcp.Tools;

[McpServerToolType]
public static class JobLeadTools
{
    [McpServerTool, Description("List all job leads with company, status, priority, salary, and AI fields.")]
    public static Task<IReadOnlyList<JobLeadDto>> ListJobLeads(JobLeadService service, CancellationToken ct = default)
        => service.ListAsync(ct);

    [McpServerTool, Description("Get one job lead by id, including its full pasted job description. Returns null if not found.")]
    public static Task<JobLeadDto?> GetJobLead(int id, JobLeadService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);
}
