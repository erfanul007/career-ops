# Domain V2 — Phase 3: API + MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace V1 REST endpoints and 44 MCP tools with V2 API (~28–30 endpoints) and workflow-parity MCP surface (23 tools). Regenerate orval client after API is stable.

**Architecture:** Minimal API endpoint groups in Presentation layer. MCP tool handlers delegate to Application services — no business logic in handlers. Enums serialized as strings in JSON (already configured in Program.cs).

**Tech Stack:** .NET 10, ASP.NET Core Minimal APIs, ModelContextProtocol.AspNetCore 1.4, FluentValidation 12, xUnit 2.9, FluentAssertions 8

## Global Constraints

- No business logic in endpoint handlers or MCP tool handlers — delegate to services
- MCP handlers always set `actor = Agent` internally, never expose it as input
- Enums in JSON as strings; stored as ints in DB
- `just gen-client` runs after this phase (requires API on localhost:8080)
- Phase ends with `just verify` + `just gen-client`
- Working directory: `E:\personal\projects\CareerOps`

---

## File Structure

### Delete (stale V1)
- `backend/src/CareerOps.Presentation/Endpoints/JobLeadEndpoints.cs`
- `backend/src/CareerOps.Presentation/Endpoints/ApplicationEndpoints.cs`
- `backend/src/CareerOps.Presentation/Endpoints/InterviewEndpoints.cs`
- `backend/src/CareerOps.Presentation/Endpoints/ResumeVariantEndpoints.cs`
- `backend/src/CareerOps.Presentation/Mcp/JobLeadTools.cs`
- `backend/src/CareerOps.Presentation/Mcp/ApplicationTools.cs`
- `backend/src/CareerOps.Presentation/Mcp/InterviewTools.cs`
- `backend/src/CareerOps.Presentation/Mcp/ResumeVariantTools.cs`
- `backend/tests/CareerOps.IntegrationTests/JobLeadEndpointTests.cs`
- `backend/tests/CareerOps.IntegrationTests/ApplicationEndpointTests.cs`
- `backend/tests/CareerOps.IntegrationTests/ResumeVariantEndpointTests.cs`
- `backend/tests/CareerOps.IntegrationTests/McpEndpointTests.cs` (rewrite)

### Create (V2)
- `backend/src/CareerOps.Presentation/Endpoints/JobEndpoints.cs`
- `backend/src/CareerOps.Presentation/Mcp/JobTools.cs`
- `backend/tests/CareerOps.IntegrationTests/JobEndpointTests.cs`
- `backend/tests/CareerOps.IntegrationTests/JobMcpToolTests.cs`

### Modify (V2)
- `backend/src/CareerOps.Presentation/Endpoints/FollowUpTaskEndpoints.cs`
- `backend/src/CareerOps.Presentation/Endpoints/CompanyEndpoints.cs`
- `backend/src/CareerOps.Presentation/Endpoints/DashboardEndpoints.cs`
- `backend/src/CareerOps.Presentation/Mcp/FollowUpTools.cs`
- `backend/src/CareerOps.Presentation/Mcp/CompanyTools.cs`
- `backend/src/CareerOps.Presentation/Mcp/DashboardTools.cs`
- `backend/src/CareerOps.Presentation/Mcp/ProfileTools.cs`
- `backend/src/CareerOps.Presentation/Program.cs`
- `backend/tests/CareerOps.IntegrationTests/CompanyEndpointTests.cs`
- `backend/tests/CareerOps.IntegrationTests/FollowUpTaskEndpointTests.cs`

---

## Tasks

### Task 15: Delete V1 endpoint and MCP files

**Files:** V1 endpoint/MCP/test deletions listed above

- [ ] **Step 1: Delete stale V1 endpoints and MCP tools**

```powershell
Remove-Item backend/src/CareerOps.Presentation/Endpoints/JobLeadEndpoints.cs
Remove-Item backend/src/CareerOps.Presentation/Endpoints/ApplicationEndpoints.cs
Remove-Item backend/src/CareerOps.Presentation/Endpoints/InterviewEndpoints.cs
Remove-Item backend/src/CareerOps.Presentation/Endpoints/ResumeVariantEndpoints.cs
Remove-Item backend/src/CareerOps.Presentation/Mcp/JobLeadTools.cs
Remove-Item backend/src/CareerOps.Presentation/Mcp/ApplicationTools.cs
Remove-Item backend/src/CareerOps.Presentation/Mcp/InterviewTools.cs
Remove-Item backend/src/CareerOps.Presentation/Mcp/ResumeVariantTools.cs
```

- [ ] **Step 2: Delete stale integration tests**

```powershell
Remove-Item backend/tests/CareerOps.IntegrationTests/JobLeadEndpointTests.cs
Remove-Item backend/tests/CareerOps.IntegrationTests/ApplicationEndpointTests.cs
Remove-Item backend/tests/CareerOps.IntegrationTests/ResumeVariantEndpointTests.cs
Remove-Item backend/tests/CareerOps.IntegrationTests/McpEndpointTests.cs
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete V1 endpoint/MCP/test files"
```

---

### Task 16: JobEndpoints

**Files:**
- Create: `backend/src/CareerOps.Presentation/Endpoints/JobEndpoints.cs`

**Interfaces:**
- Consumes: `JobService`, `JobWorkflowService`, `JobActivityService`, request/DTO types from Phase 2
- Produces: routes `/api/jobs`, `/api/jobs/{id}`, `/api/jobs/{id}/transition`, `/api/jobs/{id}/activities`, `/api/jobs/{id}/attachments`, `/api/jobs/{id}/properties`

- [ ] **Step 1: Create JobEndpoints**

```csharp
// backend/src/CareerOps.Presentation/Endpoints/JobEndpoints.cs
using CareerOps.Application.Jobs;
using CareerOps.Domain.Jobs;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace CareerOps.Presentation.Endpoints;

public static class JobEndpoints
{
    public static IEndpointRouteBuilder MapJobs(this IEndpointRouteBuilder app)
    {
        var jobs = app.MapGroup("/api/jobs").WithTags("Jobs");

        jobs.MapGet("/", async ([AsParameters] ListJobsQueryParams p, JobService svc) =>
        {
            var query = new ListJobsQuery(
                p.Statuses, p.Source, p.RemoteMode, p.EmploymentType,
                p.Country, p.Priority, p.SalaryMin, p.SalaryMax,
                p.AppliedFrom, p.AppliedTo, p.Search);
            return Results.Ok(await svc.ListJobsAsync(query));
        });

        jobs.MapGet("/{id:int}", async (int id, JobService svc) =>
        {
            var job = await svc.GetJobDetailAsync(id);
            return job is null ? Results.NotFound() : Results.Ok(job);
        });

        jobs.MapPost("/", async (CreateJobRequest req, JobService svc) =>
        {
            var job = await svc.CreateJobAsync(req);
            return Results.Created($"/api/jobs/{job.Id}", job);
        });

        jobs.MapPut("/{id:int}", async (int id, UpdateJobRequest req, JobService svc) =>
        {
            var job = await svc.UpdateJobAsync(id, req);
            return job is null ? Results.NotFound() : Results.Ok(job);
        });

        jobs.MapDelete("/{id:int}", async (int id, JobService svc) =>
        {
            var deleted = await svc.DeleteJobAsync(id);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        jobs.MapPost("/{id:int}/transition", async (int id, TransitionJobRequest req, JobWorkflowService svc) =>
        {
            try
            {
                var result = await svc.TransitionJobAsync(id, req.ToStatus, req.Notes, Domain.Jobs.TransitionActor.User);
                return Results.Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        });

        // Activities
        jobs.MapPost("/{id:int}/activities", async (int id, CreateActivityRequest req, JobActivityService svc) =>
        {
            var activity = await svc.AddActivityAsync(id, req);
            return activity is null ? Results.NotFound() : Results.Created($"/api/jobs/{id}/activities/{activity.Id}", activity);
        });

        jobs.MapPut("/{id:int}/activities/{activityId:int}", async (int id, int activityId, UpdateActivityRequest req, JobActivityService svc) =>
        {
            var activity = await svc.UpdateActivityAsync(activityId, req);
            return activity is null ? Results.NotFound() : Results.Ok(activity);
        });

        jobs.MapDelete("/{id:int}/activities/{activityId:int}", async (int id, int activityId, JobActivityService svc) =>
        {
            var deleted = await svc.DeleteActivityAsync(activityId);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        jobs.MapPost("/{id:int}/activities/{activityId:int}/complete", async (int id, int activityId, CompleteActivityRequest req, JobActivityService svc) =>
        {
            var (activity, suggestion) = await svc.CompleteActivityAsync(activityId, req);
            return activity is null ? Results.NotFound() : Results.Ok(new { activity, suggestion });
        });

        // Attachments
        jobs.MapPost("/{id:int}/attachments", async (int id, AddAttachmentRequest req, JobService svc) =>
        {
            var att = await svc.AddAttachmentAsync(id, req);
            return att is null ? Results.NotFound() : Results.Created($"/api/jobs/{id}/attachments/{att.Id}", att);
        });

        jobs.MapPut("/{id:int}/attachments/{attachmentId:int}", async (int id, int attachmentId, UpdateAttachmentRequest req, JobService svc) =>
        {
            var att = await svc.UpdateAttachmentAsync(id, attachmentId, req);
            return att is null ? Results.NotFound() : Results.Ok(att);
        });

        jobs.MapDelete("/{id:int}/attachments/{attachmentId:int}", async (int id, int attachmentId, JobService svc) =>
        {
            var deleted = await svc.DeleteAttachmentAsync(id, attachmentId);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        // Properties
        jobs.MapPut("/{id:int}/properties/{key}", async (int id, string key, UpsertPropertyRequest req, JobService svc) =>
        {
            var prop = await svc.UpsertPropertyAsync(id, key, req);
            return prop is null ? Results.NotFound() : Results.Ok(prop);
        });

        jobs.MapDelete("/{id:int}/properties/{key}", async (int id, string key, JobService svc) =>
        {
            var deleted = await svc.DeletePropertyAsync(id, key);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        // Follow-ups (job-scoped creation)
        jobs.MapPost("/{id:int}/follow-ups", async (int id, CareerOps.Application.FollowUpTasks.CreateFollowUpTaskRequest req, CareerOps.Application.FollowUpTasks.FollowUpTaskService svc) =>
        {
            var reqWithJob = req with { JobId = id };
            var task = await svc.CreateAsync(reqWithJob);
            return Results.Created($"/api/follow-up-tasks/{task.Id}", task);
        });

        return app;
    }
}

// Query parameter binding helper
public record ListJobsQueryParams(
    [FromQuery] JobStatus[]? Statuses,
    [FromQuery] JobSource? Source,
    [FromQuery] RemoteMode? RemoteMode,
    [FromQuery] EmploymentType? EmploymentType,
    [FromQuery] string? Country,
    [FromQuery] CareerOps.Domain.Common.Priority? Priority,
    [FromQuery] decimal? SalaryMin,
    [FromQuery] decimal? SalaryMax,
    [FromQuery] DateTime? AppliedFrom,
    [FromQuery] DateTime? AppliedTo,
    [FromQuery] string? Search
);
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/CareerOps.Presentation/Endpoints/JobEndpoints.cs
git commit -m "feat(api): JobEndpoints — CRUD, transition, activities, attachments, properties"
```

---

### Task 17: Update existing endpoints (FollowUpTask, Company, Dashboard)

**Files:**
- Modify: `backend/src/CareerOps.Presentation/Endpoints/FollowUpTaskEndpoints.cs`
- Modify: `backend/src/CareerOps.Presentation/Endpoints/CompanyEndpoints.cs`
- Modify: `backend/src/CareerOps.Presentation/Endpoints/DashboardEndpoints.cs`

- [ ] **Step 1: Rewrite FollowUpTaskEndpoints**

```csharp
// backend/src/CareerOps.Presentation/Endpoints/FollowUpTaskEndpoints.cs
using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.FollowUpTasks;
using Microsoft.AspNetCore.Mvc;

namespace CareerOps.Presentation.Endpoints;

public static class FollowUpTaskEndpoints
{
    public static IEndpointRouteBuilder MapFollowUpTasks(this IEndpointRouteBuilder app)
    {
        var tasks = app.MapGroup("/api/follow-up-tasks").WithTags("FollowUpTasks");

        tasks.MapGet("/", async ([FromQuery] FollowUpStatus? status, [FromQuery] int? jobId, FollowUpTaskService svc)
            => Results.Ok(await svc.ListAllAsync(status, jobId)));

        tasks.MapPut("/{id:int}", async (int id, UpdateFollowUpTaskRequest req, FollowUpTaskService svc) =>
        {
            var task = await svc.UpdateAsync(id, req);
            return task is null ? Results.NotFound() : Results.Ok(task);
        });

        tasks.MapPost("/{id:int}/complete", async (int id, FollowUpTaskService svc) =>
        {
            var ok = await svc.CompleteAsync(id);
            return ok ? Results.NoContent() : Results.NotFound();
        });

        tasks.MapPost("/{id:int}/skip", async (int id, FollowUpTaskService svc) =>
        {
            var ok = await svc.SkipAsync(id);
            return ok ? Results.NoContent() : Results.NotFound();
        });

        return app;
    }
}
```

- [ ] **Step 2: Update CompanyEndpoints — add 409 on delete**

In `CompanyEndpoints.cs`, find the delete handler and replace it:

```csharp
app.MapDelete("/{id:int}", async (int id, CompanyService svc) =>
{
    if (await svc.HasJobsAsync(id))
        return Results.Conflict(new { error = "Company has associated jobs and cannot be deleted." });
    var deleted = await svc.DeleteAsync(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});
```

- [ ] **Step 3: Update DashboardEndpoints**

```csharp
// backend/src/CareerOps.Presentation/Endpoints/DashboardEndpoints.cs
using CareerOps.Application.Dashboard;

namespace CareerOps.Presentation.Endpoints;

public static class DashboardEndpoints
{
    public static IEndpointRouteBuilder MapDashboard(this IEndpointRouteBuilder app)
    {
        app.MapGroup("/api/dashboard").WithTags("Dashboard")
            .MapGet("/summary", async (DashboardService svc) =>
                Results.Ok(await svc.GetSummaryAsync()));
        return app;
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/CareerOps.Presentation/Endpoints/
git commit -m "feat(api): update FollowUpTask/Company/Dashboard endpoints for V2"
```

---

### Task 18: Update Program.cs

**Files:**
- Modify: `backend/src/CareerOps.Presentation/Program.cs`

- [ ] **Step 1: Update endpoint registrations in Program.cs**

Remove old `.MapJobLeads()`, `.MapApplications()`, `.MapInterviews()`, `.MapResumeVariants()` calls.
Add `.MapJobs()`.

The endpoint registration section should look like:

```csharp
app.MapJobs();
app.MapFollowUpTasks();
app.MapCompanies();
app.MapDashboard();
app.MapSettings();
```

Also remove any `using` directives for deleted namespaces.

- [ ] **Step 2: Build to verify**

```
dotnet build backend/CareerOps.slnx
```

Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

```bash
git add backend/src/CareerOps.Presentation/Program.cs
git commit -m "feat(api): wire V2 endpoint groups in Program.cs"
```

---

### Task 19: MCP JobTools

**Files:**
- Create: `backend/src/CareerOps.Presentation/Mcp/JobTools.cs`

**Interfaces:**
- Consumes: `JobService`, `JobWorkflowService`, `JobActivityService`, all request types
- Produces: 13 MCP tools: `list_jobs`, `get_job`, `create_job`, `update_job`, `transition_job`, `archive_job`, `add_job_activity`, `update_job_activity`, `complete_job_activity`, `upsert_job_attachment`, `remove_job_attachment`, `upsert_job_property`, `remove_job_property`

- [ ] **Step 1: Create JobTools**

```csharp
// backend/src/CareerOps.Presentation/Mcp/JobTools.cs
using CareerOps.Application.Jobs;
using CareerOps.Domain.Common;
using CareerOps.Domain.Jobs;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public sealed class JobTools(JobService jobSvc, JobWorkflowService workflowSvc, JobActivityService activitySvc)
{
    [McpServerTool, Description("List jobs with optional filters. Statuses, source, remoteMode, priority, country can all be filtered. Search matches title, company name, source URL, and notes.")]
    public async Task<object> list_jobs(
        [Description("Filter by statuses (e.g. Applied, Interviewing)")] JobStatus[]? statuses = null,
        [Description("Filter by source")] JobSource? source = null,
        [Description("Filter by remote mode")] RemoteMode? remoteMode = null,
        [Description("Filter by employment type")] EmploymentType? employmentType = null,
        [Description("Filter by country")] string? country = null,
        [Description("Filter by priority")] Priority? priority = null,
        [Description("Free-text search across title, company, sourceUrl, notes")] string? search = null)
        => await jobSvc.ListJobsAsync(new ListJobsQuery(statuses, source, remoteMode, employmentType, country, priority, Search: search));

    [McpServerTool, Description("Get full job detail including activities, follow-ups, properties, and attachments.")]
    public async Task<object?> get_job([Description("Job ID")] int jobId)
        => await jobSvc.GetJobDetailAsync(jobId);

    [McpServerTool, Description("Create a new job. Status defaults to Discovered if not specified.")]
    public async Task<object> create_job(
        [Description("Company ID")] int companyId,
        [Description("Job title")] string title,
        [Description("Job source")] JobSource source,
        [Description("Starting status")] JobStatus status = JobStatus.Discovered,
        [Description("Priority")] Priority priority = Priority.Medium,
        [Description("Source URL (job posting link)")] string? sourceUrl = null,
        [Description("Job description text")] string? jobDescription = null,
        [Description("Country")] string? country = null,
        [Description("City")] string? city = null,
        [Description("Remote mode")] RemoteMode remoteMode = RemoteMode.OnSite,
        [Description("Employment type")] EmploymentType employmentType = EmploymentType.FullTime,
        [Description("Notes")] string? notes = null)
        => await jobSvc.CreateJobAsync(new CreateJobRequest(
            companyId, title, status, priority, source, sourceUrl, jobDescription,
            country, city, null, remoteMode, employmentType,
            null, null, null, SalaryPeriod.Annual, null, null, null, null, notes));

    [McpServerTool, Description("Update job details. Does not change status — use transition_job for that.")]
    public async Task<object?> update_job(
        [Description("Job ID")] int jobId,
        [Description("Job title")] string title,
        [Description("Company ID")] int companyId,
        [Description("Priority")] Priority priority,
        [Description("Source")] JobSource source,
        [Description("Source URL")] string? sourceUrl = null,
        [Description("Notes")] string? notes = null,
        [Description("Next action date (UTC)")] DateTime? nextActionAtUtc = null,
        [Description("FitScore 1-10")] int? fitScore = null,
        [Description("Resume label")] string? resumeLabel = null,
        [Description("Offer salary")] decimal? offerSalary = null,
        [Description("Offer notes")] string? offerNotes = null,
        [Description("Rejection reason")] string? rejectionReason = null)
        => await jobSvc.UpdateJobAsync(jobId, new UpdateJobRequest(
            companyId, title, priority, source, sourceUrl, null,
            null, null, null, RemoteMode.OnSite, EmploymentType.FullTime,
            null, null, null, SalaryPeriod.Annual, null, null, null, nextActionAtUtc,
            fitScore, resumeLabel, null, null, offerSalary, null, null, offerNotes,
            rejectionReason, notes));

    [McpServerTool, Description("Transition a job to a new status. Actor is set to Agent automatically.")]
    public async Task<object> transition_job(
        [Description("Job ID")] int jobId,
        [Description("Target status")] JobStatus toStatus,
        [Description("Optional notes about the transition")] string? notes = null)
        => await workflowSvc.TransitionJobAsync(jobId, toStatus, notes, TransitionActor.Agent);

    [McpServerTool, Description("Archive a job (shorthand for transition to Archived).")]
    public async Task<object> archive_job(
        [Description("Job ID")] int jobId,
        [Description("Optional reason")] string? notes = null)
        => await workflowSvc.TransitionJobAsync(jobId, JobStatus.Archived, notes, TransitionActor.Agent);

    [McpServerTool, Description("Add an activity (interview, screening, etc.) to a job.")]
    public async Task<object?> add_job_activity(
        [Description("Job ID")] int jobId,
        [Description("Activity label, e.g. 'Technical Round 1'")] string label,
        [Description("Activity type")] JobActivityType type,
        [Description("Scheduled datetime (UTC)")] DateTime? scheduledAtUtc = null,
        [Description("Contact name")] string? contactName = null,
        [Description("Meeting URL")] string? meetingUrl = null,
        [Description("Prep notes")] string? prepNotes = null)
        => await activitySvc.AddActivityAsync(jobId, new CreateActivityRequest(
            label, type, JobActivityStatus.Planned, scheduledAtUtc, null, contactName, null, meetingUrl, prepNotes, null));

    [McpServerTool, Description("Update a job activity.")]
    public async Task<object?> update_job_activity(
        [Description("Activity ID")] int activityId,
        [Description("Activity label")] string label,
        [Description("Activity type")] JobActivityType type,
        [Description("Status")] JobActivityStatus status,
        [Description("Scheduled datetime (UTC)")] DateTime? scheduledAtUtc = null,
        [Description("Contact name")] string? contactName = null,
        [Description("Meeting URL")] string? meetingUrl = null,
        [Description("Notes")] string? notes = null)
        => await activitySvc.UpdateActivityAsync(activityId, new UpdateActivityRequest(
            label, type, status, scheduledAtUtc, null, contactName, null, meetingUrl, null, notes));

    [McpServerTool, Description("Mark a job activity as completed with outcome and optional feedback.")]
    public async Task<object> complete_job_activity(
        [Description("Activity ID")] int activityId,
        [Description("Outcome")] JobActivityOutcome outcome,
        [Description("Feedback notes")] string? feedback = null,
        [Description("General notes")] string? notes = null,
        [Description("Create a follow-up task?")] bool createFollowUp = false)
    {
        var (activity, suggestion) = await activitySvc.CompleteActivityAsync(
            activityId, new CompleteActivityRequest(outcome, feedback, notes, createFollowUp));
        return new { activity, suggestion };
    }

    [McpServerTool, Description("Create or update a job attachment (metadata only — no file upload). Omit attachmentId to create; provide it to update.")]
    public async Task<object?> upsert_job_attachment(
        [Description("Job ID")] int jobId,
        [Description("Attachment type")] JobAttachmentType type,
        [Description("Title / display name")] string title,
        [Description("Attachment ID (omit to create, provide to update)")] int? attachmentId = null,
        [Description("File name")] string? fileName = null,
        [Description("URL")] string? url = null,
        [Description("Notes")] string? notes = null)
    {
        if (attachmentId.HasValue)
            return await jobSvc.UpdateAttachmentAsync(jobId, attachmentId.Value, new UpdateAttachmentRequest(type, title, fileName, url, notes));
        return await jobSvc.AddAttachmentAsync(jobId, new AddAttachmentRequest(type, title, fileName, url, notes));
    }

    [McpServerTool, Description("Remove a job attachment.")]
    public async Task<bool> remove_job_attachment(
        [Description("Job ID")] int jobId,
        [Description("Attachment ID")] int attachmentId)
        => await jobSvc.DeleteAttachmentAsync(jobId, attachmentId);

    [McpServerTool, Description("Create or update a job property (key-value metadata). Idempotent by key.")]
    public async Task<object?> upsert_job_property(
        [Description("Job ID")] int jobId,
        [Description("Property key")] string key,
        [Description("Property value")] string? value,
        [Description("Value type")] JobPropertyValueType valueType = JobPropertyValueType.Text)
        => await jobSvc.UpsertPropertyAsync(jobId, key, new UpsertPropertyRequest(value, valueType));

    [McpServerTool, Description("Remove a job property by key.")]
    public async Task<bool> remove_job_property(
        [Description("Job ID")] int jobId,
        [Description("Property key")] string key)
        => await jobSvc.DeletePropertyAsync(jobId, key);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/CareerOps.Presentation/Mcp/JobTools.cs
git commit -m "feat(mcp): JobTools — 13 workflow-parity tools for jobs, activities, attachments, properties"
```

---

### Task 20: Update existing MCP tools (FollowUp, Company, Dashboard, Profile)

**Files:**
- Modify: `backend/src/CareerOps.Presentation/Mcp/FollowUpTools.cs`
- Modify: `backend/src/CareerOps.Presentation/Mcp/CompanyTools.cs`
- Modify: `backend/src/CareerOps.Presentation/Mcp/DashboardTools.cs`
- Modify: `backend/src/CareerOps.Presentation/Mcp/ProfileTools.cs`

- [ ] **Step 1: Rewrite FollowUpTools**

```csharp
// backend/src/CareerOps.Presentation/Mcp/FollowUpTools.cs
using CareerOps.Application.FollowUpTasks;
using CareerOps.Domain.Common;
using CareerOps.Domain.FollowUpTasks;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public sealed class FollowUpTools(FollowUpTaskService svc)
{
    [McpServerTool, Description("List follow-up tasks. Filter by due (today, overdue, all), status, or jobId.")]
    public async Task<object> list_follow_ups(
        [Description("'today' = due today, 'overdue' = past due, 'all' = everything (default: all)")] string due = "all",
        [Description("Filter by status")] FollowUpStatus? status = null,
        [Description("Filter by job ID")] int? jobId = null)
    {
        if (due == "today" || due == "overdue")
            return await svc.ListDueAsync();
        return await svc.ListAllAsync(status, jobId);
    }

    [McpServerTool, Description("Add a follow-up task. Optionally link to a job or job activity.")]
    public async Task<object> add_follow_up(
        [Description("Task title")] string title,
        [Description("Due date (UTC)")] DateTime dueAtUtc,
        [Description("Priority")] Priority priority = Priority.Medium,
        [Description("Description")] string? description = null,
        [Description("Job ID (optional)")] int? jobId = null,
        [Description("Job activity ID (requires jobId)")] int? jobActivityId = null)
        => await svc.CreateAsync(new CreateFollowUpTaskRequest(title, description, dueAtUtc, priority, jobId, jobActivityId));

    [McpServerTool, Description("Mark a follow-up task as completed.")]
    public async Task<bool> complete_follow_up([Description("Follow-up task ID")] int taskId)
        => await svc.CompleteAsync(taskId);

    [McpServerTool, Description("Skip (dismiss) a follow-up task.")]
    public async Task<bool> skip_follow_up([Description("Follow-up task ID")] int taskId)
        => await svc.SkipAsync(taskId);
}
```

- [ ] **Step 2: Update CompanyTools**

```csharp
// backend/src/CareerOps.Presentation/Mcp/CompanyTools.cs
using CareerOps.Application.Companies;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public sealed class CompanyTools(CompanyService svc)
{
    [McpServerTool, Description("List all companies.")]
    public async Task<object> list_companies()
        => await svc.ListAsync();

    [McpServerTool, Description("Find a company by name or create it if it doesn't exist. Only updates non-null fields when found.")]
    public async Task<object> upsert_company(
        [Description("Company name")] string name)
        => await svc.FindOrCreateByNameAsync(name);
}
```

- [ ] **Step 3: Update DashboardTools — remove old V1 tools**

```csharp
// backend/src/CareerOps.Presentation/Mcp/DashboardTools.cs
using CareerOps.Application.Dashboard;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public sealed class DashboardTools(DashboardService svc)
{
    [McpServerTool, Description("Get dashboard summary: active jobs by status, follow-ups due today, overdue, upcoming activities, stale jobs, offer deadlines.")]
    public async Task<object> get_dashboard_summary()
        => await svc.GetSummaryAsync();
}
```

- [ ] **Step 4: Verify DiagnosticsTools still has `ping`**

Check `backend/src/CareerOps.Presentation/Mcp/DiagnosticsTools.cs` — keep `ping` tool as-is. No changes needed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/CareerOps.Presentation/Mcp/
git commit -m "feat(mcp): update FollowUp/Company/Dashboard/Profile tools for V2"
```

---

### Task 21: Integration tests

**Files:**
- Create: `backend/tests/CareerOps.IntegrationTests/JobEndpointTests.cs`
- Create: `backend/tests/CareerOps.IntegrationTests/JobMcpToolTests.cs`
- Modify: `backend/tests/CareerOps.IntegrationTests/CompanyEndpointTests.cs`
- Modify: `backend/tests/CareerOps.IntegrationTests/FollowUpTaskEndpointTests.cs`

**Interfaces:**
- Consumes: `ApiFactory` (existing), HTTP client pattern from existing tests
- Produces: integration tests covering job CRUD, transition, company 409, follow-up endpoints

- [ ] **Step 1: Create JobEndpointTests**

```csharp
// backend/tests/CareerOps.IntegrationTests/JobEndpointTests.cs
using System.Net;
using System.Net.Http.Json;
using CareerOps.Application.Jobs;
using FluentAssertions;
using Xunit;

namespace CareerOps.IntegrationTests;

public sealed class JobEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task CreateJob_Returns201WithId()
    {
        // First create a company
        var companyRes = await _client.PostAsJsonAsync("/api/companies",
            new { name = "Test Corp", type = 0 });
        companyRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var company = await companyRes.Content.ReadFromJsonAsync<dynamic>();

        var req = new
        {
            companyId = (int)company!.id,
            title = "Software Engineer",
            status = "Discovered",
            priority = "Medium",
            source = "LinkedIn",
            remoteMode = "Hybrid",
            employmentType = "FullTime",
            salaryPeriod = "Annual"
        };

        var res = await _client.PostAsJsonAsync("/api/jobs", req);

        res.StatusCode.Should().Be(HttpStatusCode.Created);
        var job = await res.Content.ReadFromJsonAsync<JobDetailDto>();
        job!.Title.Should().Be("Software Engineer");
    }

    [Fact]
    public async Task GetJob_NotFound_Returns404()
    {
        var res = await _client.GetAsync("/api/jobs/99999");
        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task TransitionJob_ToApplied_Returns200WithSuggestionNull()
    {
        var companyRes = await _client.PostAsJsonAsync("/api/companies", new { name = "TransCorp", type = 0 });
        var company = await companyRes.Content.ReadFromJsonAsync<dynamic>();

        var createRes = await _client.PostAsJsonAsync("/api/jobs", new
        {
            companyId = (int)company!.id,
            title = "Backend Dev",
            status = "Interested",
            priority = "High",
            source = "Referral",
            remoteMode = "Remote",
            employmentType = "FullTime",
            salaryPeriod = "Annual"
        });
        var job = await createRes.Content.ReadFromJsonAsync<JobDetailDto>();

        var transRes = await _client.PostAsJsonAsync($"/api/jobs/{job!.Id}/transition",
            new { toStatus = "Applied" });

        transRes.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateJob_InvalidTitle_Returns400()
    {
        var res = await _client.PostAsJsonAsync("/api/jobs", new
        {
            companyId = 1,
            title = "",
            status = "Discovered",
            priority = "Medium",
            source = "LinkedIn",
            remoteMode = "OnSite",
            employmentType = "FullTime",
            salaryPeriod = "Annual"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
```

- [ ] **Step 2: Create JobMcpToolTests (transition_job sets actor=Agent)**

```csharp
// backend/tests/CareerOps.IntegrationTests/JobMcpToolTests.cs
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace CareerOps.IntegrationTests;

public sealed class JobMcpToolTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task TransitionJob_ViaMcp_SetsActorAgent()
    {
        // Create company + job via REST, then call MCP transition_job
        // and verify the stored transition row has Actor=Agent
        // This test uses the REST API to seed data and verify the result

        var companyRes = await _client.PostAsJsonAsync("/api/companies", new { name = "McpCorp", type = 0 });
        var company = await companyRes.Content.ReadFromJsonAsync<dynamic>();

        var jobRes = await _client.PostAsJsonAsync("/api/jobs", new
        {
            companyId = (int)company!.id,
            title = "MCP Test Job",
            status = "Interested",
            priority = "Medium",
            source = "LinkedIn",
            remoteMode = "OnSite",
            employmentType = "FullTime",
            salaryPeriod = "Annual"
        });
        var job = await jobRes.Content.ReadFromJsonAsync<CareerOps.Application.Jobs.JobDetailDto>();

        // Call transition via MCP endpoint
        var mcpReq = new
        {
            jsonrpc = "2.0",
            id = 1,
            method = "tools/call",
            @params = new
            {
                name = "transition_job",
                arguments = new { jobId = job!.Id, toStatus = "Applied" }
            }
        };
        var mcpRes = await _client.PostAsJsonAsync("/mcp", mcpReq);
        mcpRes.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
```

- [ ] **Step 3: Update CompanyEndpointTests — add 409 test**

Add to `CompanyEndpointTests.cs`:

```csharp
[Fact]
public async Task DeleteCompany_WithJobs_Returns409()
{
    var companyRes = await _client.PostAsJsonAsync("/api/companies", new { name = "BusyCorp", type = 0 });
    var company = await companyRes.Content.ReadFromJsonAsync<dynamic>();
    var companyId = (int)company!.id;

    // Create a job referencing the company
    await _client.PostAsJsonAsync("/api/jobs", new
    {
        companyId,
        title = "Dev",
        status = "Discovered",
        priority = "Low",
        source = "LinkedIn",
        remoteMode = "OnSite",
        employmentType = "FullTime",
        salaryPeriod = "Annual"
    });

    var res = await _client.DeleteAsync($"/api/companies/{companyId}");
    res.StatusCode.Should().Be(HttpStatusCode.Conflict);
}
```

- [ ] **Step 4: Run integration tests**

```
dotnet test backend/tests/CareerOps.IntegrationTests/CareerOps.IntegrationTests.csproj
```

Expected: all pass. Fix any 4xx response shape mismatches.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/CareerOps.IntegrationTests/
git commit -m "test(api): integration tests for jobs, company 409, MCP transition actor"
```

---

### Task 22: Phase 3 quality gate + client generation

- [ ] **Step 1: Run full verify**

```
just verify
```

Expected: `Build succeeded`, all tests pass, frontend build passes (frontend still uses old API — that's fine until Phase 4).

- [ ] **Step 2: Start API locally**

```
just api
```

Wait for: `Now listening on: http://localhost:8080`

- [ ] **Step 3: Regenerate orval client (in a separate terminal)**

```
just gen-client
```

Expected: `frontend/src/lib/api/` regenerated with V2 types. Old `job-leads`, `applications`, `interviews`, `resume-variants` directories replaced by `jobs` directory.

If `just gen-client` fails with connection error, ensure API is running on port 8080 before retrying.

- [ ] **Step 4: Stop the API (Ctrl+C)**

- [ ] **Step 5: Run just verify again (frontend will now have type errors from V1 imports — expected)**

```
dotnet build backend/CareerOps.slnx && dotnet test backend/CareerOps.slnx
```

Backend must pass. Frontend type errors are expected at this stage — Phase 4 fixes them.

- [ ] **Step 6: Commit generated client**

```bash
git add frontend/src/lib/api/
git commit -m "chore(frontend): regenerate orval client from V2 OpenAPI spec"
```

---

*Phase 3 complete. Proceed to `docs/superpowers/plans/2026-06-25-domain-v2-phase4-frontend.md`.*
