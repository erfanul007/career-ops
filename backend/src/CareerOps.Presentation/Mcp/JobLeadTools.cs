using System.ComponentModel;
using CareerOps.Application.JobLeads;
using ModelContextProtocol.Server;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public static class JobLeadTools
{
    [McpServerTool, Description("List all job leads with company, status, priority, salary, and AI fields.")]
    public static Task<IReadOnlyList<JobLeadDto>> ListJobLeads(JobLeadService service, CancellationToken ct = default)
        => service.ListAsync(ct);

    [McpServerTool, Description("Get one job lead by id, including its full pasted job description. Returns null if not found.")]
    public static Task<JobLeadDto?> GetJobLead(int id, JobLeadService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);

    [McpServerTool, Description("Create a job lead. Either CompanyId or NewCompanyName must be set (a new company is created by name if needed).")]
    public static Task<JobLeadDto> CreateJobLead(CreateJobLeadRequest request, JobLeadService service, CancellationToken ct = default)
        => service.CreateAsync(request, ct);

    [McpServerTool, Description("Update an existing job lead (full update, including status and priority). Returns null if not found.")]
    public static Task<JobLeadDto?> UpdateJobLead(int id, UpdateJobLeadRequest request, JobLeadService service, CancellationToken ct = default)
        => service.UpdateAsync(id, request, ct);

    [McpServerTool, Description("Delete a job lead by id (cascades to its application + interviews and cleans loose follow-ups). Returns true if deleted, false if not found.")]
    public static Task<bool> DeleteJobLead(int id, JobLeadService service, CancellationToken ct = default)
        => service.DeleteAsync(id, ct);
}
