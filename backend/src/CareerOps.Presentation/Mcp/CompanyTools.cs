using System.ComponentModel;
using CareerOps.Application.Companies;
using ModelContextProtocol.Server;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public static class CompanyTools
{
    [McpServerTool, Description("List all companies (name, type, market, compensation fit, location).")]
    public static Task<IReadOnlyList<CompanyDto>> ListCompanies(CompanyService service, CancellationToken ct = default)
        => service.ListAsync(ct);

    [McpServerTool, Description("Get one company by id. Returns null if not found.")]
    public static Task<CompanyDto?> GetCompany(int id, CompanyService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);

    [McpServerTool, Description("Create a company (name required; type/market/compensation-fit default to Unknown if not set).")]
    public static Task<CompanyDto> CreateCompany(CreateCompanyRequest request, CompanyService service, CancellationToken ct = default)
        => service.CreateAsync(request, ct);

    [McpServerTool, Description("Update a company. Returns null if not found.")]
    public static Task<CompanyDto?> UpdateCompany(int id, UpdateCompanyRequest request, CompanyService service, CancellationToken ct = default)
        => service.UpdateAsync(id, request, ct);

    [McpServerTool, Description("Delete a company by id. Returns true if deleted, false if not found.")]
    public static Task<bool> DeleteCompany(int id, CompanyService service, CancellationToken ct = default)
        => service.DeleteAsync(id, ct);
}
