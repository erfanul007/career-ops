using CareerOps.Presentation.Filters;
using CareerOps.Application.JobLeads;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CareerOps.Presentation.Endpoints;

public static class JobLeadEndpoints
{
    public static RouteGroupBuilder MapJobLeads(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (JobLeadService svc, CancellationToken ct) =>
                TypedResults.Ok(await svc.ListAsync(ct)))
             .WithName("GetJobLeads");

        group.MapGet("/{id:int}", async Task<Results<Ok<JobLeadDto>, NotFound>> (
                int id, JobLeadService svc, CancellationToken ct) =>
                await svc.GetAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("GetJobLead");

        group.MapPost("/", async (CreateJobLeadRequest req, JobLeadService svc, CancellationToken ct) =>
            {
                var dto = await svc.CreateAsync(req, ct);
                return TypedResults.Created($"/api/job-leads/{dto.Id}", dto);
            })
             .WithName("CreateJobLead")
             .AddEndpointFilter<ValidationFilter<CreateJobLeadRequest>>()
             .ProducesValidationProblem();

        group.MapPut("/{id:int}", async Task<Results<Ok<JobLeadDto>, NotFound>> (
                int id, UpdateJobLeadRequest req, JobLeadService svc, CancellationToken ct) =>
                await svc.UpdateAsync(id, req, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("UpdateJobLead")
             .AddEndpointFilter<ValidationFilter<UpdateJobLeadRequest>>()
             .ProducesValidationProblem();

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (
                int id, JobLeadService svc, CancellationToken ct) =>
                await svc.DeleteAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound())
             .WithName("DeleteJobLead");

        return group;
    }
}
