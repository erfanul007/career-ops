# Phase 6 / S6.1 — MCP Server + Core Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a thin `CareerOps.Mcp` console project that exposes CareerOps's core operations as MCP tools over stdio, so Claude Code / Codex can read and act on the data with no API key and no in-app AI provider.

**Architecture:** A new console project references `CareerOps.Application` + `CareerOps.Infrastructure`, registers the same services, and runs the official `ModelContextProtocol` C# SDK over stdio. `[McpServerTool]` methods are thin static delegations to the existing services, reusing the existing DTOs and request records — no new business logic.

**Tech Stack:** .NET 10 console, `ModelContextProtocol` (prerelease) + `Microsoft.Extensions.Hosting`, the existing EF Core / Npgsql data layer, same Postgres (`localhost:5432`).

## Global Constraints

- Use the **dotnet CLI** for all project/solution/package ops (D19) — never hand-author `.csproj`/`.slnx`/versions.
- The new `.csproj` inherits `TargetFramework`/`Nullable`/`ImplicitUsings` from **`backend/Directory.Build.props`** — match the sibling-project minimalism (no redundant `<PropertyGroup>`; ItemGroups only). Confirm by reading `backend/Directory.Build.props` and `backend/src/CareerOps.Api/CareerOps.Api.csproj`.
- **Reuse existing services + DTOs + request records** — no new business logic, no duplicated rules, no new entity/migration in S6.1.
- Tools = `[McpServerToolType]` classes, `[McpServerTool]` static methods taking a service (DI-injected) + `CancellationToken`, returning the service's result. Auto-discovered by `WithToolsFromAssembly()`.
- **stdout is reserved for MCP JSON-RPC** — route ALL logging to stderr (`LogToStandardErrorThreshold = LogLevel.Trace`). A single stray `Console.WriteLine`/log line on stdout breaks the transport.
- **Curated writes, no hard deletes** — expose create/update/status tools; do NOT expose any `DeleteAsync`. `IClock` audit stamping is retained through the services.
- stdio transport only — no HTTP, no auth, no network listener.
- Secret posture: `CareerOps.Mcp/appsettings.json` mirrors the API's **dev** connection string (`Host=localhost`); overridable via the `ConnectionStrings__DefaultConnection` env var. No AI keys.
- Enum domain integer values stay pinned (D5).

### Service signatures the tools wrap (exact — from the existing code)
```
DashboardService(IAppDbContext, IClock):    Task<DashboardSummaryDto> GetSummaryAsync(ct)
JobLeadService(IAppDbContext):               Task<IReadOnlyList<JobLeadDto>> ListAsync(ct); Task<JobLeadDto?> GetAsync(int id, ct);
                                             Task<JobLeadDto> CreateAsync(CreateJobLeadRequest, ct); Task<JobLeadDto?> UpdateAsync(int id, UpdateJobLeadRequest, ct)
ApplicationService(IAppDbContext):           Task<IReadOnlyList<ApplicationDto>> ListAsync(ct); Task<ApplicationDto?> GetAsync(int id, ct);
                                             Task<ConvertResult> ConvertAsync(int leadId, ConvertToApplicationRequest, ct);
                                             Task<ApplicationDto?> ChangeStageAsync(int id, ChangeStageRequest, ct);
                                             Task<ApplicationDto?> MarkRejectedAsync(int id, MarkRejectedRequest, ct);
                                             Task<ApplicationDto?> MarkOfferAsync(int id, ct); Task<ApplicationDto?> MarkGhostedAsync(int id, ct)
InterviewService(IAppDbContext, IClock):     Task<IReadOnlyList<InterviewDto>> ListAsync(ct); Task<IReadOnlyList<InterviewDto>> GetUpcomingAsync(ct);
                                             Task<InterviewDto?> GetAsync(int id, ct); Task<InterviewDto?> CreateAsync(CreateInterviewRequest, ct);
                                             Task<InterviewDto?> MarkCompletedAsync(int id, MarkInterviewCompletedRequest, ct)
FollowUpTaskService(IAppDbContext, IClock):  Task<IReadOnlyList<FollowUpTaskDto>> GetDueAsync(ct); Task<FollowUpTaskDto> CreateAsync(CreateFollowUpTaskRequest, ct);
                                             Task<FollowUpTaskDto?> CompleteAsync(int id, ct); Task<FollowUpTaskDto?> SkipAsync(int id, ct)
UserProfileService(IAppDbContext):           Task<UserProfileDto> GetAsync(ct)
ResumeVariantService(IAppDbContext):         Task<IReadOnlyList<ResumeVariantDto>> ListAsync(ct)
```
`ConvertResult` = `record(ConvertOutcome Outcome, ApplicationDto? Application)`; `ConvertOutcome` = `{ LeadNotFound, AlreadyConverted, Created }`. Request records (`CreateJobLeadRequest`, `UpdateJobLeadRequest`, `ConvertToApplicationRequest`, `ChangeStageRequest`, `MarkRejectedRequest`, `CreateFollowUpTaskRequest`, `CreateInterviewRequest`, `MarkInterviewCompletedRequest`) already exist in the Application layer — pass them straight through as tool inputs. All live under namespaces `CareerOps.Application.{JobLeads,Applications,Interviews,FollowUpTasks,Settings,ResumeVariants,Dashboard}`.

---

## Task 1: Scaffold the `CareerOps.Mcp` project

**Files:**
- Create (via CLI): `backend/src/CareerOps.Mcp/CareerOps.Mcp.csproj` + default `Program.cs`
- Modify: `backend/CareerOps.slnx` (add the project)

**Interfaces:**
- Produces: a buildable console project referencing Application + Infrastructure, with the MCP + Hosting packages.

- [ ] **Step 1: Create the project and add references/packages via the dotnet CLI**

Run from repo root (`E:\personal\projects\CareerOps`):
```bash
dotnet new console -o backend/src/CareerOps.Mcp -n CareerOps.Mcp
dotnet add backend/src/CareerOps.Mcp reference backend/src/CareerOps.Application backend/src/CareerOps.Infrastructure
dotnet add backend/src/CareerOps.Mcp package ModelContextProtocol --prerelease
dotnet add backend/src/CareerOps.Mcp package Microsoft.Extensions.Hosting
dotnet sln backend/CareerOps.slnx add backend/src/CareerOps.Mcp --solution-folder src
```

- [ ] **Step 2: Align the csproj to the repo convention**

Read `backend/Directory.Build.props` and `backend/src/CareerOps.Api/CareerOps.Api.csproj`. `Directory.Build.props` already supplies `TargetFramework`/`Nullable`/`ImplicitUsings`. Edit `backend/src/CareerOps.Mcp/CareerOps.Mcp.csproj` to **remove any `<PropertyGroup>` properties that duplicate `Directory.Build.props`** (keep `<OutputType>Exe</OutputType>` if the SDK default needs it — console SDK sets it implicitly, so it can be omitted). The result should be ItemGroups (`ProjectReference` × 2, `PackageReference` × 2) only, matching `CareerOps.Api.csproj`'s shape.

- [ ] **Step 3: Build to verify the project compiles and references resolve**

Run: `dotnet build backend/CareerOps.slnx -v q --nologo`
Expected: build succeeds, 0 errors. (The default `Program.cs` `Console.WriteLine("Hello, World!")` is fine for now — replaced in Task 2.)

- [ ] **Step 4: Commit**

```bash
git add backend/src/CareerOps.Mcp backend/CareerOps.slnx
git commit -m "chore(mcp): scaffold CareerOps.Mcp console project (S6.1)"
```

---

## Task 2: Host wiring + diagnostics tool + stdio smoke

**Files:**
- Modify: `backend/src/CareerOps.Mcp/Program.cs`
- Create: `backend/src/CareerOps.Mcp/appsettings.json`
- Create: `backend/src/CareerOps.Mcp/Tools/DiagnosticsTools.cs`

**Interfaces:**
- Consumes: `AddInfrastructure(IConfiguration)` + `AddApplication()` (existing). 
- Produces: a runnable MCP stdio server with tool auto-discovery and string-enum I/O; a `ping` tool proving the toolchain.

- [ ] **Step 1: Write `Program.cs`**

```csharp
// backend/src/CareerOps.Mcp/Program.cs
using System.Text.Json;
using System.Text.Json.Serialization;
using CareerOps.Application;
using CareerOps.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var builder = Host.CreateApplicationBuilder(args);

// stdout is reserved for MCP JSON-RPC. Route ALL logs to stderr.
builder.Logging.ClearProviders();
builder.Logging.AddConsole(o => o.LogToStandardErrorThreshold = LogLevel.Trace);

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();

// Agent-friendly enum names (e.g. "Applied" not 2) for tool inputs/outputs.
var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
jsonOptions.Converters.Add(new JsonStringEnumConverter());

builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly(serializerOptions: jsonOptions);

await builder.Build().RunAsync();
```

**SDK-API note (preview package):** `WithToolsFromAssembly(serializerOptions:)` is the intended hook for the converter. If the installed `ModelContextProtocol` build names this differently, wire the `JsonStringEnumConverter` via whatever serializer-options hook the package exposes (e.g. an `AddMcpServer(o => …)` option or `WithTools(...)` overload — check the package's public API) and confirm with the Step 4 smoke. **Fallback if no hook exists:** drop the `serializerOptions` argument (`.WithToolsFromAssembly()`), accept integer enums, and add enum value tables to the `[Description]` of enum parameters in Tasks 3–4. The tool surface works either way — do not block on this.

- [ ] **Step 2: Write `appsettings.json`**

Mirror the API's dev connection string (read `backend/src/CareerOps.Api/appsettings.Development.json` for the exact value, including the dev password already used there — this is the same local-only dev credential, not a new secret):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=careerops;Username=careerops;Password=<same dev password as CareerOps.Api appsettings.Development.json>"
  }
}
```

Ensure the csproj copies it to output — add to `CareerOps.Mcp.csproj`:
```xml
  <ItemGroup>
    <None Update="appsettings.json" CopyToOutputDirectory="PreserveNewest" />
  </ItemGroup>
```

- [ ] **Step 3: Write the diagnostics tool**

```csharp
// backend/src/CareerOps.Mcp/Tools/DiagnosticsTools.cs
using System.ComponentModel;
using ModelContextProtocol.Server;

namespace CareerOps.Mcp.Tools;

[McpServerToolType]
public static class DiagnosticsTools
{
    [McpServerTool, Description("Health check — returns 'pong'. Confirms the MCP server is reachable.")]
    public static string Ping() => "pong";
}
```

- [ ] **Step 4: Build and smoke the stdio server**

```bash
dotnet build backend/src/CareerOps.Mcp -v q --nologo
DLL=$(ls backend/src/CareerOps.Mcp/bin/Debug/net10.0/CareerOps.Mcp.dll)
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | dotnet "$DLL" 2>/dev/null
```
Expected on stdout: a JSON-RPC `initialize` result, then a `tools/list` result whose `tools` array contains `"Ping"`. (Logs appear on stderr, not stdout.) If stdout is empty or contains non-JSON, the logging/stdout separation is wrong — fix before proceeding.

- [ ] **Step 5: Commit**

```bash
git add backend/src/CareerOps.Mcp
git commit -m "feat(mcp): stdio host + DI + diagnostics ping tool (S6.1)"
```

---

## Task 3: Read tools

**Files:**
- Create: `backend/src/CareerOps.Mcp/Tools/DashboardTools.cs`, `JobLeadTools.cs`, `ApplicationTools.cs`, `InterviewTools.cs`, `FollowUpTools.cs`, `ProfileTools.cs`, `ResumeVariantTools.cs`

**Interfaces:**
- Consumes: the services in Global Constraints.
- Produces: read tools (`get_dashboard_summary`, `list_job_leads`, `get_job_lead`, `list_applications`, `get_application`, `list_interviews`, `list_upcoming_interviews`, `get_interview`, `list_due_follow_ups`, `get_user_profile`, `list_resume_variants`). The Task 4 write tools live in the same files (add methods).

Each tool is a static method that delegates to the injected service. `JobLeadService.ListAsync` returns ALL leads (no server-side filter exists — the agent filters from the full list; do not add a filter method).

- [ ] **Step 1: Dashboard + Profile + ResumeVariant read tools**

```csharp
// backend/src/CareerOps.Mcp/Tools/DashboardTools.cs
using System.ComponentModel;
using CareerOps.Application.Dashboard;
using ModelContextProtocol.Server;

namespace CareerOps.Mcp.Tools;

[McpServerToolType]
public static class DashboardTools
{
    [McpServerTool, Description("Get the full dashboard summary: active application count, leads by status, applications by stage, follow-ups due today, overdue follow-ups, upcoming interviews (next 7 days), high-priority leads, stale applications, and the search-deadline countdown.")]
    public static Task<DashboardSummaryDto> GetDashboardSummary(DashboardService service, CancellationToken ct = default)
        => service.GetSummaryAsync(ct);
}
```

```csharp
// backend/src/CareerOps.Mcp/Tools/ProfileTools.cs
using System.ComponentModel;
using CareerOps.Application.Settings;
using ModelContextProtocol.Server;

namespace CareerOps.Mcp.Tools;

[McpServerToolType]
public static class ProfileTools
{
    [McpServerTool, Description("Get the user's job-search profile: target roles, target salary, and search deadline.")]
    public static Task<UserProfileDto> GetUserProfile(UserProfileService service, CancellationToken ct = default)
        => service.GetAsync(ct);
}
```

```csharp
// backend/src/CareerOps.Mcp/Tools/ResumeVariantTools.cs
using System.ComponentModel;
using CareerOps.Application.ResumeVariants;
using ModelContextProtocol.Server;

namespace CareerOps.Mcp.Tools;

[McpServerToolType]
public static class ResumeVariantTools
{
    [McpServerTool, Description("List all resume variants (name, target role, default flag).")]
    public static Task<IReadOnlyList<ResumeVariantDto>> ListResumeVariants(ResumeVariantService service, CancellationToken ct = default)
        => service.ListAsync(ct);
}
```

- [ ] **Step 2: JobLead + Application + Interview + FollowUp read tools**

```csharp
// backend/src/CareerOps.Mcp/Tools/JobLeadTools.cs
using System.ComponentModel;
using CareerOps.Application.JobLeads;
using ModelContextProtocol.Server;

namespace CareerOps.Mcp.Tools;

[McpServerToolType]
public static class JobLeadTools
{
    [McpServerTool, Description("List all job leads with company, status, priority, salary, and AI fields.")]
    public static Task<IReadOnlyList<JobLeadDto>> ListJobLeads(JobLeadService service, CancellationToken ct = default)
        => service.ListAsync(ct);

    [McpServerTool, Description("Get one job lead by id, including its full pasted job description. Returns null if not found.")]
    public static Task<JobLeadDto?> GetJobLead(int id, JobLeadService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);
}
```

```csharp
// backend/src/CareerOps.Mcp/Tools/ApplicationTools.cs
using System.ComponentModel;
using CareerOps.Application.Applications;
using ModelContextProtocol.Server;

namespace CareerOps.Mcp.Tools;

[McpServerToolType]
public static class ApplicationTools
{
    [McpServerTool, Description("List all applications with their job title, company, stage, and status.")]
    public static Task<IReadOnlyList<ApplicationDto>> ListApplications(ApplicationService service, CancellationToken ct = default)
        => service.ListAsync(ct);

    [McpServerTool, Description("Get one application by id. Returns null if not found.")]
    public static Task<ApplicationDto?> GetApplication(int id, ApplicationService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);
}
```

```csharp
// backend/src/CareerOps.Mcp/Tools/InterviewTools.cs
using System.ComponentModel;
using CareerOps.Application.Interviews;
using ModelContextProtocol.Server;

namespace CareerOps.Mcp.Tools;

[McpServerToolType]
public static class InterviewTools
{
    [McpServerTool, Description("List all interviews (most recent first).")]
    public static Task<IReadOnlyList<InterviewDto>> ListInterviews(InterviewService service, CancellationToken ct = default)
        => service.ListAsync(ct);

    [McpServerTool, Description("List interviews scheduled within the next 7 days.")]
    public static Task<IReadOnlyList<InterviewDto>> ListUpcomingInterviews(InterviewService service, CancellationToken ct = default)
        => service.GetUpcomingAsync(ct);

    [McpServerTool, Description("Get one interview by id. Returns null if not found.")]
    public static Task<InterviewDto?> GetInterview(int id, InterviewService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);
}
```

```csharp
// backend/src/CareerOps.Mcp/Tools/FollowUpTools.cs
using System.ComponentModel;
using CareerOps.Application.FollowUpTasks;
using ModelContextProtocol.Server;

namespace CareerOps.Mcp.Tools;

[McpServerToolType]
public static class FollowUpTools
{
    [McpServerTool, Description("List follow-up tasks that are due now or overdue (pending, due-at <= now).")]
    public static Task<IReadOnlyList<FollowUpTaskDto>> ListDueFollowUps(FollowUpTaskService service, CancellationToken ct = default)
        => service.GetDueAsync(ct);
}
```

- [ ] **Step 3: Build**

Run: `dotnet build backend/src/CareerOps.Mcp -v q --nologo`
Expected: 0 errors.

- [ ] **Step 4: Smoke a read tool against the live DB**

Ensure the stack is up (`just up`), then:
```bash
DLL=$(ls backend/src/CareerOps.Mcp/bin/Debug/net10.0/CareerOps.Mcp.dll)
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"GetDashboardSummary","arguments":{}}}' \
  | dotnet "$DLL" 2>/dev/null
```
Expected on stdout: a `tools/call` result containing the dashboard summary JSON (with `leadsByStatus` etc.). Confirm enum values appear as **names** (e.g. `"Applied"`); if they appear as integers, the Task 2 enum converter isn't wired — apply the Task 2 SDK-API note's fix or fallback.

- [ ] **Step 5: Commit**

```bash
git add backend/src/CareerOps.Mcp
git commit -m "feat(mcp): read tools for dashboard, leads, applications, interviews, follow-ups, profile, resumes (S6.1)"
```

---

## Task 4: Curated write tools

**Files:**
- Modify: `JobLeadTools.cs`, `ApplicationTools.cs`, `InterviewTools.cs`, `FollowUpTools.cs` (add write methods to the existing classes)

**Interfaces:**
- Consumes: the write service methods + request records in Global Constraints.
- Produces: write tools (`create_job_lead`, `update_job_lead`, `convert_to_application`, `change_application_stage`, `mark_application_rejected`, `mark_application_offer`, `mark_application_ghosted`, `create_follow_up`, `complete_follow_up`, `skip_follow_up`, `create_interview`, `mark_interview_completed`). **No delete tools.**

The request records are passed straight through as tool inputs — the SDK builds the input schema from them.

- [ ] **Step 1: JobLead write tools**

Add to `JobLeadTools.cs` (inside the class, plus `using CareerOps.Application.JobLeads;` is already present):
```csharp
    [McpServerTool, Description("Create a job lead. Either CompanyId or NewCompanyName must be set (a new company is created by name if needed).")]
    public static Task<JobLeadDto> CreateJobLead(CreateJobLeadRequest request, JobLeadService service, CancellationToken ct = default)
        => service.CreateAsync(request, ct);

    [McpServerTool, Description("Update an existing job lead (full update, including status and priority). Returns null if not found.")]
    public static Task<JobLeadDto?> UpdateJobLead(int id, UpdateJobLeadRequest request, JobLeadService service, CancellationToken ct = default)
        => service.UpdateAsync(id, request, ct);
```

- [ ] **Step 2: Application write tools**

Add to `ApplicationTools.cs`:
```csharp
    [McpServerTool, Description("Convert a job lead into an application (selecting a resume variant). Returns the outcome (Created, LeadNotFound, or AlreadyConverted) and the created application.")]
    public static Task<ConvertResult> ConvertToApplication(int leadId, ConvertToApplicationRequest request, ApplicationService service, CancellationToken ct = default)
        => service.ConvertAsync(leadId, request, ct);

    [McpServerTool, Description("Change an application's stage (e.g. Applied, TechnicalScreen, Offer). Auto-advances the linked job lead. Returns null if not found.")]
    public static Task<ApplicationDto?> ChangeApplicationStage(int id, ChangeStageRequest request, ApplicationService service, CancellationToken ct = default)
        => service.ChangeStageAsync(id, request, ct);

    [McpServerTool, Description("Mark an application rejected, with an optional reason. Returns null if not found.")]
    public static Task<ApplicationDto?> MarkApplicationRejected(int id, MarkRejectedRequest request, ApplicationService service, CancellationToken ct = default)
        => service.MarkRejectedAsync(id, request, ct);

    [McpServerTool, Description("Mark an application as an offer. Returns null if not found.")]
    public static Task<ApplicationDto?> MarkApplicationOffer(int id, ApplicationService service, CancellationToken ct = default)
        => service.MarkOfferAsync(id, ct);

    [McpServerTool, Description("Mark an application as ghosted. Returns null if not found.")]
    public static Task<ApplicationDto?> MarkApplicationGhosted(int id, ApplicationService service, CancellationToken ct = default)
        => service.MarkGhostedAsync(id, ct);
```

- [ ] **Step 3: Interview + FollowUp write tools**

Add to `InterviewTools.cs`:
```csharp
    [McpServerTool, Description("Schedule an interview for an application. Returns null if the application does not exist.")]
    public static Task<InterviewDto?> CreateInterview(CreateInterviewRequest request, InterviewService service, CancellationToken ct = default)
        => service.CreateAsync(request, ct);

    [McpServerTool, Description("Mark an interview completed with an outcome and optional feedback; optionally creates a follow-up task. Returns null if not found.")]
    public static Task<InterviewDto?> MarkInterviewCompleted(int id, MarkInterviewCompletedRequest request, InterviewService service, CancellationToken ct = default)
        => service.MarkCompletedAsync(id, request, ct);
```

Add to `FollowUpTools.cs`:
```csharp
    [McpServerTool, Description("Create a follow-up task (title, due date, priority; optionally linked to a job lead / application / interview).")]
    public static Task<FollowUpTaskDto> CreateFollowUp(CreateFollowUpTaskRequest request, FollowUpTaskService service, CancellationToken ct = default)
        => service.CreateAsync(request, ct);

    [McpServerTool, Description("Mark a follow-up task complete. Returns null if not found.")]
    public static Task<FollowUpTaskDto?> CompleteFollowUp(int id, FollowUpTaskService service, CancellationToken ct = default)
        => service.CompleteAsync(id, ct);

    [McpServerTool, Description("Skip a follow-up task. Returns null if not found.")]
    public static Task<FollowUpTaskDto?> SkipFollowUp(int id, FollowUpTaskService service, CancellationToken ct = default)
        => service.SkipAsync(id, ct);
```

- [ ] **Step 4: Build**

Run: `dotnet build backend/src/CareerOps.Mcp -v q --nologo`
Expected: 0 errors. Confirm **no** delete tool exists (grep the Tools folder for `Delete` — should be none).

- [ ] **Step 5: Smoke a reversible write against the live DB**

With the stack up:
```bash
DLL=$(ls backend/src/CareerOps.Mcp/bin/Debug/net10.0/CareerOps.Mcp.dll)
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"CreateFollowUp","arguments":{"request":{"title":"MCP smoke task","description":null,"relatedEntityType":"None","relatedEntityId":null,"dueAtUtc":"2026-06-25T09:00:00Z","status":"Pending","priority":"Medium"}}}}' \
  | dotnet "$DLL" 2>/dev/null
```
Expected: a `tools/call` result containing the created follow-up task with an `id`. (If the enum fallback from Task 2 is in effect, pass integer enum values instead: `relatedEntityType:0, status:0, priority:1`.) This writes one row to the dev DB — harmless; it shows up under due/overdue follow-ups.

- [ ] **Step 6: Commit**

```bash
git add backend/src/CareerOps.Mcp
git commit -m "feat(mcp): curated write tools for leads, applications, interviews, follow-ups (S6.1)"
```

---

## Task 5: Claude Code registration + docs reconciliation

**Files:**
- Create: `.mcp.json` (repo root)
- Modify: `docs/knowledge-base/03-decisions.md` (append D44–D46), `docs/knowledge-base/02-delivery-plan.md` (rewrite Phase 6/7), `docs/knowledge-base/00-index.md` (note the new component if it lists components)

- [ ] **Step 1: Add the Claude Code MCP config**

```json
// .mcp.json  (repo root)
{
  "mcpServers": {
    "careerops": {
      "command": "dotnet",
      "args": ["run", "--project", "backend/src/CareerOps.Mcp", "--no-build"]
    }
  }
}
```
Note in the commit body: run `dotnet build backend/src/CareerOps.Mcp` once first; if `dotnet run` emits build noise to stdout, switch `args` to the built DLL path (`["backend/src/CareerOps.Mcp/bin/Debug/net10.0/CareerOps.Mcp.dll"]`). The MCP server needs Postgres up (`just up`).

- [ ] **Step 2: Append decisions D44–D46**

Read the end of `docs/knowledge-base/03-decisions.md` to match the existing dated-entry format, then append D44, D45, D46 using the verbatim text from the spec §4 (`docs/superpowers/specs/2026-06-21-careerops-mcp-server-design.md`), dated 2026-06-21.

- [ ] **Step 3: Rewrite the delivery plan's AI phases**

In `docs/knowledge-base/02-delivery-plan.md`, replace the bodies of `## Phase 6 — AI baseline / Mock (PRD D5)` and `## Phase 7 — Real AI provider (PRD D6)` so that:
- Phase 6 becomes **"Phase 6 — Agent-native AI via MCP (PRD D5/D6, see D44)"** with two slices: **S6.1** (MCP server + read + curated-write tools — delivered note) and **S6.2** (AiAnalysis write-back store + UI surfacing — planned).
- Add a one-line **superseded** note under the old Phase 6/7 headers: *"The in-app `IAiAssistant`/`MockAiAssistant` (old Phase 6) and real-provider (old Phase 7) approach is superseded by D44 — AI is delivered via the MCP server. See `docs/superpowers/specs/2026-06-21-careerops-mcp-server-design.md`."*
- Add a dated delivered note: `- **Note (2026-06-21):** S6.1 delivered — CareerOps.Mcp stdio MCP server with read + curated-write tools over the existing services. D44–D46 logged.`

- [ ] **Step 4: Note the component in the knowledge-base index (only if it enumerates components)**

Read `docs/knowledge-base/00-index.md`. If it lists the solution's projects/components, add `CareerOps.Mcp` (the MCP server). If it does not enumerate components, make no change and note that in the commit body.

- [ ] **Step 5: Commit**

```bash
git add .mcp.json docs/knowledge-base/03-decisions.md docs/knowledge-base/02-delivery-plan.md docs/knowledge-base/00-index.md
git commit -m "docs: register MCP server (.mcp.json), log D44-D46, supersede in-app AI phases (S6.1)"
```

---

## Final verification (after all tasks)

- `dotnet build backend/CareerOps.slnx` → 0 errors (the MCP project builds within the solution).
- `dotnet test` → the existing 104 tests still pass (no test changes in S6.1; confirm nothing broke).
- The Task 4 stdio smoke returns a created follow-up — proving initialize → tools/list → tools/call (read + write) end-to-end.
- (Manual, user) register `.mcp.json` in Claude Code and confirm the `careerops` server's tools appear.

## Suggested models (subagent-driven execution)

- Task 1 — sonnet (CLI scaffolding + csproj alignment judgment).
- Task 2 — sonnet (host wiring + the preview-SDK enum-serialization decision + smoke).
- Task 3 — haiku (repetitive thin read-tool transcription) — but verify the build + smoke.
- Task 4 — haiku (repetitive thin write-tool transcription) — verify build + smoke.
- Task 5 — haiku (docs + config transcription).
- Final whole-branch review — opus.

## Notes

- Tools are thin delegations over services already covered by unit/integration tests; S6.1 adds **no** unit tests (YAGNI). The stdio JSON-RPC smoke per task is the end-to-end gate, and the final review + manual Claude Code registration are acceptance.
- If the `ModelContextProtocol` package's public API differs from the code above (it is prerelease), adapt to the installed API and note the adaptation in the task report — the build + smoke are the guardrails.
