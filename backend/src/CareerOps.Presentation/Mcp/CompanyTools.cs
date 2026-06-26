using CareerOps.Application.Companies;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public sealed class CompanyTools(CompanyService svc)
{
    [McpServerTool, Description("List all companies.")]
    public async Task<object> list_companies()
        => await svc.ListAsync();

    [McpServerTool, Description("Find a company by name or create it if it doesn't exist.")]
    public async Task<object> upsert_company(
        [Description("Company name")] string name)
        => await svc.FindOrCreateByNameAsync(name);
}
