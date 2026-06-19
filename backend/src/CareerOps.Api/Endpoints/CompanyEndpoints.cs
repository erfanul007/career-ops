using CareerOps.Api.Filters;
using CareerOps.Application.Companies;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerOps.Api.Endpoints;

public static class CompanyEndpoints
{
    public static RouteGroupBuilder MapCompanies(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (CompanyService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
             .WithName("GetCompanies");

        group.MapGet("/{id:int}", async Task<Results<Ok<CompanyDto>, NotFound>> (
                int id, CompanyService svc, CancellationToken ct) =>
                await svc.GetAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("GetCompany");

        group.MapPost("/", async (CreateCompanyRequest req, CompanyService svc, CancellationToken ct) =>
            {
                var dto = await svc.CreateAsync(req, ct);
                return TypedResults.Created($"/api/companies/{dto.Id}", dto);
            })
             .WithName("CreateCompany")
             .AddEndpointFilter<ValidationFilter<CreateCompanyRequest>>()
             .ProducesValidationProblem();

        group.MapPut("/{id:int}", async Task<Results<Ok<CompanyDto>, NotFound>> (
                int id, UpdateCompanyRequest req, CompanyService svc, CancellationToken ct) =>
                await svc.UpdateAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("UpdateCompany")
             .AddEndpointFilter<ValidationFilter<UpdateCompanyRequest>>()
             .ProducesValidationProblem();

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (
                int id, CompanyService svc, CancellationToken ct) =>
                await svc.DeleteAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound())
             .WithName("DeleteCompany");

        return group;
    }
}
