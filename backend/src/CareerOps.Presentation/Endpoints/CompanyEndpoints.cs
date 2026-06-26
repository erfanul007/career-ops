using CareerOps.Presentation.Filters;
using CareerOps.Application.Companies;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerOps.Presentation.Endpoints;

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

        group.MapDelete("/{id:int}", async (int id, CompanyService svc, CancellationToken ct) =>
        {
            if (await svc.HasJobsAsync(id, ct))
                return Results.Conflict(new { error = "Company has associated jobs and cannot be deleted." });
            var deleted = await svc.DeleteAsync(id, ct);
            return deleted ? Results.NoContent() : Results.NotFound();
        }).WithName("DeleteCompany");

        return group;
    }
}
