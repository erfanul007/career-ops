using CareerOps.Presentation.Filters;
using CareerOps.Application.Applications;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerOps.Presentation.Endpoints;

public static class ApplicationEndpoints
{
    public static RouteGroupBuilder MapApplications(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (ApplicationService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
             .WithName("GetApplications");

        group.MapGet("/{id:int}", async Task<Results<Ok<ApplicationDto>, NotFound>> (
                int id, ApplicationService svc, CancellationToken ct) =>
                await svc.GetAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("GetApplication");

        group.MapPut("/{id:int}", async Task<Results<Ok<ApplicationDto>, NotFound>> (
                int id, UpdateApplicationRequest req, ApplicationService svc, CancellationToken ct) =>
                await svc.UpdateAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("UpdateApplication")
             .AddEndpointFilter<ValidationFilter<UpdateApplicationRequest>>()
             .ProducesValidationProblem();

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (
                int id, ApplicationService svc, CancellationToken ct) =>
                await svc.DeleteAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound())
             .WithName("DeleteApplication");

        group.MapPost("/{id:int}/change-stage", async Task<Results<Ok<ApplicationDto>, NotFound>> (
                int id, ChangeStageRequest req, ApplicationService svc, CancellationToken ct) =>
                await svc.ChangeStageAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("ChangeApplicationStage")
             .AddEndpointFilter<ValidationFilter<ChangeStageRequest>>()
             .ProducesValidationProblem();

        group.MapPost("/{id:int}/mark-rejected", async Task<Results<Ok<ApplicationDto>, NotFound>> (
                int id, MarkRejectedRequest req, ApplicationService svc, CancellationToken ct) =>
                await svc.MarkRejectedAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("MarkApplicationRejected");

        group.MapPost("/{id:int}/mark-offer", async Task<Results<Ok<ApplicationDto>, NotFound>> (
                int id, ApplicationService svc, CancellationToken ct) =>
                await svc.MarkOfferAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("MarkApplicationOffer");

        group.MapPost("/{id:int}/mark-ghosted", async Task<Results<Ok<ApplicationDto>, NotFound>> (
                int id, ApplicationService svc, CancellationToken ct) =>
                await svc.MarkGhostedAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("MarkApplicationGhosted");

        return group;
    }

    public static RouteGroupBuilder MapConvertToApplication(this RouteGroupBuilder group)
    {
        group.MapPost("/{id:int}/convert-to-application",
                async Task<Results<Created<ApplicationDto>, NotFound, Conflict<string>>> (
                int id, ConvertToApplicationRequest req, ApplicationService svc, CancellationToken ct) =>
            {
                var result = await svc.ConvertAsync(id, req, ct);
                return result.Outcome switch
                {
                    ConvertOutcome.Created => TypedResults.Created($"/api/applications/{result.Application!.Id}", result.Application),
                    ConvertOutcome.LeadNotFound => TypedResults.NotFound(),
                    _ => TypedResults.Conflict("This lead already has an application."),
                };
            })
             .WithName("ConvertToApplication")
             .AddEndpointFilter<ValidationFilter<ConvertToApplicationRequest>>()
             .ProducesValidationProblem();

        return group;
    }
}
