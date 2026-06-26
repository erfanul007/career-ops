using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.FollowUpTasks;
using CareerOps.Presentation.Filters;
using Microsoft.AspNetCore.Mvc;

namespace CareerOps.Presentation.Endpoints;

public static class FollowUpTaskEndpoints
{
    public static RouteGroupBuilder MapFollowUpTasks(this RouteGroupBuilder tasks)
    {
        tasks.MapGet("/", async ([FromQuery] FollowUpStatus? status, [FromQuery] int? jobId, [FromQuery] string? due, FollowUpTaskService svc)
            => TypedResults.Ok(await svc.ListAllAsync(status, jobId, due)))
            .WithName("ListFollowUpTasks");

        tasks.MapPut("/{id:int}", async (int id, UpdateFollowUpTaskRequest req, FollowUpTaskService svc) =>
        {
            var task = await svc.UpdateAsync(id, req);
            return task is null ? Results.NotFound() : Results.Ok(task);
        })
        .WithName("UpdateFollowUpTask")
        .AddEndpointFilter<ValidationFilter<UpdateFollowUpTaskRequest>>();

        tasks.MapPost("/{id:int}/complete", async (int id, FollowUpTaskService svc) =>
        {
            var ok = await svc.CompleteAsync(id);
            return ok ? Results.NoContent() : Results.NotFound();
        }).WithName("CompleteFollowUpTask");

        tasks.MapPost("/{id:int}/skip", async (int id, FollowUpTaskService svc) =>
        {
            var ok = await svc.SkipAsync(id);
            return ok ? Results.NoContent() : Results.NotFound();
        }).WithName("SkipFollowUpTask");

        return tasks;
    }
}
