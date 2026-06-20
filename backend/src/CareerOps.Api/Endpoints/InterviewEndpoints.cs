using CareerOps.Api.Filters;
using CareerOps.Application.Interviews;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerOps.Api.Endpoints;

public static class InterviewEndpoints
{
    public static RouteGroupBuilder MapInterviews(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (InterviewService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
            .WithName("GetInterviews");

        group.MapGet("/upcoming", async (InterviewService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.GetUpcomingAsync(ct)))
            .WithName("GetUpcomingInterviews");

        group.MapGet("/{id:int}", async Task<Results<Ok<InterviewDto>, NotFound>> (
                int id, InterviewService svc, CancellationToken ct) =>
                await svc.GetAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
            .WithName("GetInterview");

        group.MapPost("/", async Task<Results<Created<InterviewDto>, NotFound>> (
                CreateInterviewRequest req, InterviewService svc, CancellationToken ct) =>
                await svc.CreateAsync(req, ct) is { } dto
                    ? TypedResults.Created($"/api/interviews/{dto.Id}", dto)
                    : TypedResults.NotFound())
            .WithName("CreateInterview")
            .AddEndpointFilter<ValidationFilter<CreateInterviewRequest>>().ProducesValidationProblem();

        group.MapPut("/{id:int}", async Task<Results<Ok<InterviewDto>, NotFound>> (
                int id, UpdateInterviewRequest req, InterviewService svc, CancellationToken ct) =>
                await svc.UpdateAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
            .WithName("UpdateInterview")
            .AddEndpointFilter<ValidationFilter<UpdateInterviewRequest>>().ProducesValidationProblem();

        group.MapPost("/{id:int}/mark-completed", async Task<Results<Ok<InterviewDto>, NotFound>> (
                int id, MarkInterviewCompletedRequest req, InterviewService svc, CancellationToken ct) =>
                await svc.MarkCompletedAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
            .WithName("MarkInterviewCompleted")
            .AddEndpointFilter<ValidationFilter<MarkInterviewCompletedRequest>>().ProducesValidationProblem();

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (
                int id, InterviewService svc, CancellationToken ct) =>
                await svc.DeleteAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound())
            .WithName("DeleteInterview");

        return group;
    }
}
