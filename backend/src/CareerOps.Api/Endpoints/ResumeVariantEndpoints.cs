using CareerOps.Api.Filters;
using CareerOps.Application.ResumeVariants;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerOps.Api.Endpoints;

public static class ResumeVariantEndpoints
{
    public static RouteGroupBuilder MapResumeVariants(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (ResumeVariantService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
             .WithName("GetResumeVariants");

        group.MapGet("/{id:int}", async Task<Results<Ok<ResumeVariantDto>, NotFound>> (
                int id, ResumeVariantService svc, CancellationToken ct) =>
                await svc.GetAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("GetResumeVariant");

        group.MapPost("/", async (CreateResumeVariantRequest req, ResumeVariantService svc, CancellationToken ct) =>
            {
                var dto = await svc.CreateAsync(req, ct);
                return TypedResults.Created($"/api/resume-variants/{dto.Id}", dto);
            })
             .WithName("CreateResumeVariant")
             .AddEndpointFilter<ValidationFilter<CreateResumeVariantRequest>>()
             .ProducesValidationProblem();

        group.MapPut("/{id:int}", async Task<Results<Ok<ResumeVariantDto>, NotFound>> (
                int id, UpdateResumeVariantRequest req, ResumeVariantService svc, CancellationToken ct) =>
                await svc.UpdateAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("UpdateResumeVariant")
             .AddEndpointFilter<ValidationFilter<UpdateResumeVariantRequest>>()
             .ProducesValidationProblem();

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (
                int id, ResumeVariantService svc, CancellationToken ct) =>
                await svc.DeleteAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound())
             .WithName("DeleteResumeVariant");

        group.MapPost("/{id:int}/make-default", async Task<Results<Ok<ResumeVariantDto>, NotFound>> (
                int id, ResumeVariantService svc, CancellationToken ct) =>
                await svc.MakeDefaultAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("MakeResumeVariantDefault");

        return group;
    }
}
