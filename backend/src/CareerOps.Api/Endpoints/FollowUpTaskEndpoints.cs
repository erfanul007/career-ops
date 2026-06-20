using CareerOps.Api.Filters;
using CareerOps.Application.FollowUpTasks;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerOps.Api.Endpoints;

public static class FollowUpTaskEndpoints
{
    public static RouteGroupBuilder MapFollowUpTasks(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (FollowUpTaskService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
             .WithName("GetFollowUpTasks");

        group.MapGet("/due", async (FollowUpTaskService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.GetDueAsync(ct)))
             .WithName("GetDueFollowUpTasks");

        group.MapPost("/", async (CreateFollowUpTaskRequest req, FollowUpTaskService svc, CancellationToken ct) =>
            {
                var dto = await svc.CreateAsync(req, ct);
                return TypedResults.Created($"/api/follow-up-tasks/{dto.Id}", dto);
            })
             .WithName("CreateFollowUpTask")
             .AddEndpointFilter<ValidationFilter<CreateFollowUpTaskRequest>>()
             .ProducesValidationProblem();

        group.MapPut("/{id:int}", async Task<Results<Ok<FollowUpTaskDto>, NotFound>> (
                int id, UpdateFollowUpTaskRequest req, FollowUpTaskService svc, CancellationToken ct) =>
                await svc.UpdateAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("UpdateFollowUpTask")
             .AddEndpointFilter<ValidationFilter<UpdateFollowUpTaskRequest>>()
             .ProducesValidationProblem();

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (
                int id, FollowUpTaskService svc, CancellationToken ct) =>
                await svc.DeleteAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound())
             .WithName("DeleteFollowUpTask");

        group.MapPost("/{id:int}/complete", async Task<Results<Ok<FollowUpTaskDto>, NotFound>> (
                int id, FollowUpTaskService svc, CancellationToken ct) =>
                await svc.CompleteAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("CompleteFollowUpTask");

        group.MapPost("/{id:int}/skip", async Task<Results<Ok<FollowUpTaskDto>, NotFound>> (
                int id, FollowUpTaskService svc, CancellationToken ct) =>
                await svc.SkipAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("SkipFollowUpTask");

        return group;
    }
}
