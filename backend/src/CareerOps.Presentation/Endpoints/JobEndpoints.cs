using CareerOps.Application.FollowUpTasks;
using CareerOps.Application.Jobs;
using CareerOps.Domain.Jobs;
using CareerOps.Presentation.Filters;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace CareerOps.Presentation.Endpoints;

public static class JobEndpoints
{
    public static RouteGroupBuilder MapJobs(this RouteGroupBuilder jobs)
    {
        jobs.MapGet("/", async ([AsParameters] ListJobsQueryParams p, JobService svc) =>
        {
            var query = new ListJobsQuery(
                p.Statuses, p.Source, p.RemoteMode, p.EmploymentType,
                p.Countries, p.CompanyIds, p.CompanySearch,
                p.Priority, p.SalaryMin, p.SalaryMax,
                p.AppliedFrom, p.AppliedTo, p.Search);
            return TypedResults.Ok(await svc.ListJobsAsync(query));
        }).WithName("ListJobs");

        jobs.MapGet("/{id:int}", async Task<Results<Ok<JobDetailDto>, NotFound>> (int id, JobService svc) =>
        {
            var job = await svc.GetJobDetailAsync(id);
            return job is null ? TypedResults.NotFound() : TypedResults.Ok(job);
        }).WithName("GetJob");

        jobs.MapPost("/", async (CreateJobRequest req, JobService svc) =>
        {
            var job = await svc.CreateJobAsync(req);
            return TypedResults.Created($"/api/jobs/{job.Id}", job);
        })
        .WithName("CreateJob")
        .AddEndpointFilter<ValidationFilter<CreateJobRequest>>();

        jobs.MapPut("/{id:int}", async (int id, UpdateJobRequest req, JobService svc) =>
        {
            var job = await svc.UpdateJobAsync(id, req);
            return job is null ? Results.NotFound() : Results.Ok(job);
        })
        .WithName("UpdateJob")
        .AddEndpointFilter<ValidationFilter<UpdateJobRequest>>();

        jobs.MapDelete("/{id:int}", async (int id, JobService svc) =>
        {
            var deleted = await svc.DeleteJobAsync(id);
            return deleted ? Results.NoContent() : Results.NotFound();
        }).WithName("DeleteJob");

        jobs.MapPost("/{id:int}/transition", async (int id, TransitionJobRequest req, JobWorkflowService svc) =>
        {
            try
            {
                var result = await svc.TransitionJobAsync(id, req.ToStatus, req.Notes, TransitionActor.User);
                return Results.Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        })
        .WithName("TransitionJob")
        .AddEndpointFilter<ValidationFilter<TransitionJobRequest>>();

        jobs.MapGet("/{id:int}/timeline", async (int id, JobTimelineService svc) =>
            TypedResults.Ok(await svc.GetTimelineAsync(id)))
            .WithName("GetJobTimeline");

        // Activities
        jobs.MapPost("/{id:int}/activities", async (int id, CreateActivityRequest req, JobActivityService svc) =>
        {
            var activity = await svc.AddActivityAsync(id, req);
            return activity is null ? Results.NotFound() : Results.Created($"/api/jobs/{id}/activities/{activity.Id}", activity);
        })
        .WithName("AddJobActivity")
        .AddEndpointFilter<ValidationFilter<CreateActivityRequest>>();

        jobs.MapPut("/{id:int}/activities/{activityId:int}", async (int id, int activityId, UpdateActivityRequest req, JobActivityService svc) =>
        {
            var activity = await svc.UpdateActivityAsync(id, activityId, req);
            return activity is null ? Results.NotFound() : Results.Ok(activity);
        })
        .WithName("UpdateJobActivity")
        .AddEndpointFilter<ValidationFilter<UpdateActivityRequest>>();

        jobs.MapDelete("/{id:int}/activities/{activityId:int}", async (int id, int activityId, JobActivityService svc) =>
        {
            var deleted = await svc.DeleteActivityAsync(id, activityId);
            return deleted ? Results.NoContent() : Results.NotFound();
        }).WithName("DeleteJobActivity");

        jobs.MapPost("/{id:int}/activities/{activityId:int}/complete", async (int id, int activityId, CompleteActivityRequest req, JobActivityService svc) =>
        {
            var (activity, suggestion) = await svc.CompleteActivityAsync(id, activityId, req);
            return activity is null ? Results.NotFound() : Results.Ok(new { activity, suggestion });
        })
        .WithName("CompleteJobActivity")
        .AddEndpointFilter<ValidationFilter<CompleteActivityRequest>>();

        // Attachments
        jobs.MapPost("/{id:int}/attachments", async (int id, AddAttachmentRequest req, JobService svc) =>
        {
            var att = await svc.AddAttachmentAsync(id, req);
            return att is null ? Results.NotFound() : Results.Created($"/api/jobs/{id}/attachments/{att.Id}", att);
        })
        .WithName("AddJobAttachment")
        .AddEndpointFilter<ValidationFilter<AddAttachmentRequest>>();

        jobs.MapPut("/{id:int}/attachments/{attachmentId:int}", async (int id, int attachmentId, UpdateAttachmentRequest req, JobService svc) =>
        {
            var att = await svc.UpdateAttachmentAsync(id, attachmentId, req);
            return att is null ? Results.NotFound() : Results.Ok(att);
        })
        .WithName("UpdateJobAttachment")
        .AddEndpointFilter<ValidationFilter<UpdateAttachmentRequest>>();

        jobs.MapDelete("/{id:int}/attachments/{attachmentId:int}", async (int id, int attachmentId, JobService svc) =>
        {
            var deleted = await svc.DeleteAttachmentAsync(id, attachmentId);
            return deleted ? Results.NoContent() : Results.NotFound();
        }).WithName("DeleteJobAttachment");

        // Properties
        jobs.MapPut("/{id:int}/properties/{key}", async (int id, string key, UpsertPropertyRequest req, JobService svc) =>
        {
            var prop = await svc.UpsertPropertyAsync(id, key, req);
            return prop is null ? Results.NotFound() : Results.Ok(prop);
        })
        .WithName("UpsertJobProperty")
        .AddEndpointFilter<ValidationFilter<UpsertPropertyRequest>>();

        jobs.MapDelete("/{id:int}/properties/{key}", async (int id, string key, JobService svc) =>
        {
            var deleted = await svc.DeletePropertyAsync(id, key);
            return deleted ? Results.NoContent() : Results.NotFound();
        }).WithName("DeleteJobProperty");

        // Job-scoped follow-up creation
        jobs.MapPost("/{id:int}/follow-ups", async (int id, CreateFollowUpTaskRequest req, FollowUpTaskService svc) =>
        {
            try
            {
                var reqWithJob = req with { JobId = id };
                var task = await svc.CreateAsync(reqWithJob);
                return Results.Created($"/api/follow-up-tasks/{task.Id}", task);
            }
            catch (ArgumentException ex)
            {
                return Results.Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
            }
        })
        .WithName("CreateJobFollowUp")
        .AddEndpointFilter<ValidationFilter<CreateFollowUpTaskRequest>>();

        return jobs;
    }
}

public record ListJobsQueryParams(
    [FromQuery] JobStatus[]? Statuses,
    [FromQuery] JobSource? Source,
    [FromQuery] RemoteMode? RemoteMode,
    [FromQuery] EmploymentType? EmploymentType,
    [FromQuery] string[]? Countries,
    [FromQuery] int[]? CompanyIds,
    [FromQuery] string? CompanySearch,
    [FromQuery] CareerOps.Domain.Common.Priority? Priority,
    [FromQuery] decimal? SalaryMin,
    [FromQuery] decimal? SalaryMax,
    [FromQuery] DateTime? AppliedFrom,
    [FromQuery] DateTime? AppliedTo,
    [FromQuery] string? Search
);
