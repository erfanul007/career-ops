# Capability Parity — Slice 1: MCP Full Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring MCP to full parity with the REST API for all 7 resources — add ~20 thin tool wrappers (including hard deletes) over existing services, plus the one missing REST endpoint (`GET /api/follow-up-tasks/{id}`).

**Architecture:** New `[McpServerTool]` methods in `CareerOps.Presentation/Mcp/` delegating to already-registered Application services. No new business logic, no migration. The MCP server (HTTP at `/mcp`) auto-discovers them via `WithToolsFromAssembly`.

**Tech Stack:** .NET 10, ASP.NET Core, `ModelContextProtocol(.AspNetCore)` 1.4.0, existing EF/Npgsql services.

## Global Constraints

- Tools are `public static` methods on `[McpServerToolType]` classes in namespace `CareerOps.Presentation.Mcp`; signature pattern: `(… typed args …, TService service, CancellationToken ct = default)` returning the service's `Task<...>` directly — **one-line delegation, no logic, no `async`/`await`**. Mirror the existing `ApplicationTools`/`ResumeVariantTools`.
- All backing services are already registered in `AddApplication()` (DI resolves them) — **no DI changes**.
- Reuse existing request records + DTOs verbatim as tool inputs/outputs — **no new DTOs**.
- **Deletes ARE in scope** (D49). Delete tools return `Task<bool>` (true=deleted, false=not found) — the services already handle cascade/loose-row cleanup (D35). No new cleanup logic.
- snake_case tool names + string-enum I/O are already configured on the MCP server — nothing to re-wire.
- Gate per task: `dotnet build backend/CareerOps.slnx` 0 errors; existing 105 tests still pass; an HTTP `/mcp` `tools/list` smoke shows the new tools.
- The MCP HTTP smoke needs the session handshake: POST `initialize` (capture the `Mcp-Session-Id` response header) → POST `notifications/initialized` with that header → POST `tools/list` (or `tools/call`) with that header. `Accept: application/json, text/event-stream`. Responses are SSE `data:` lines.

### Verified service signatures (delegate targets)
```
CompanyService(IAppDbContext):        ListAsync→IReadOnlyList<CompanyDto>; GetAsync(int)→CompanyDto?;
                                      CreateAsync(CreateCompanyRequest)→CompanyDto; UpdateAsync(int,UpdateCompanyRequest)→CompanyDto?; DeleteAsync(int)→bool
ResumeVariantService(IAppDbContext):  GetAsync(int)→ResumeVariantDto?; CreateAsync(CreateResumeVariantRequest)→ResumeVariantDto;
                                      UpdateAsync(int,UpdateResumeVariantRequest)→ResumeVariantDto?; DeleteAsync(int)→bool; MakeDefaultAsync(int)→ResumeVariantDto?
UserProfileService(IAppDbContext):    UpdateAsync(UpdateUserProfileRequest)→UserProfileDto   (singleton, no id)
ApplicationService(IAppDbContext):    UpdateAsync(int,UpdateApplicationRequest)→ApplicationDto?; DeleteAsync(int)→bool
InterviewService(IAppDbContext,IClock): UpdateAsync(int,UpdateInterviewRequest)→InterviewDto?; DeleteAsync(int)→bool
FollowUpTaskService(IAppDbContext,IClock): ListAsync→IReadOnlyList<FollowUpTaskDto>; GetAsync(int)→FollowUpTaskDto?;
                                      UpdateAsync(int,UpdateFollowUpTaskRequest)→FollowUpTaskDto?; DeleteAsync(int)→bool
JobLeadService(IAppDbContext):        DeleteAsync(int)→bool
```
Request records (existing): `CreateCompanyRequest`/`UpdateCompanyRequest` (Name + 3 enums + nullable url/loc/notes), `CreateResumeVariantRequest`/`UpdateResumeVariantRequest` (Name + nullable TargetRole/Summary/Notes), `UpdateUserProfileRequest` (FullName + 12 nullable), `UpdateApplicationRequest`, `UpdateInterviewRequest`, `UpdateFollowUpTaskRequest`.

---

## Task 1: Company + ResumeVariant + Profile MCP tools

**Files:**
- Create: `backend/src/CareerOps.Presentation/Mcp/CompanyTools.cs`
- Modify: `backend/src/CareerOps.Presentation/Mcp/ResumeVariantTools.cs`, `backend/src/CareerOps.Presentation/Mcp/ProfileTools.cs`

- [ ] **Step 1: New `CompanyTools.cs`**

```csharp
// backend/src/CareerOps.Presentation/Mcp/CompanyTools.cs
using System.ComponentModel;
using CareerOps.Application.Companies;
using ModelContextProtocol.Server;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public static class CompanyTools
{
    [McpServerTool, Description("List all companies (name, type, market, compensation fit, location).")]
    public static Task<IReadOnlyList<CompanyDto>> ListCompanies(CompanyService service, CancellationToken ct = default)
        => service.ListAsync(ct);

    [McpServerTool, Description("Get one company by id. Returns null if not found.")]
    public static Task<CompanyDto?> GetCompany(int id, CompanyService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);

    [McpServerTool, Description("Create a company (name required; type/market/compensation-fit default to Unknown if not set).")]
    public static Task<CompanyDto> CreateCompany(CreateCompanyRequest request, CompanyService service, CancellationToken ct = default)
        => service.CreateAsync(request, ct);

    [McpServerTool, Description("Update a company. Returns null if not found.")]
    public static Task<CompanyDto?> UpdateCompany(int id, UpdateCompanyRequest request, CompanyService service, CancellationToken ct = default)
        => service.UpdateAsync(id, request, ct);

    [McpServerTool, Description("Delete a company by id. Returns true if deleted, false if not found.")]
    public static Task<bool> DeleteCompany(int id, CompanyService service, CancellationToken ct = default)
        => service.DeleteAsync(id, ct);
}
```

- [ ] **Step 2: Extend `ResumeVariantTools.cs`** — add inside the existing class (keep `ListResumeVariants`):

```csharp
    [McpServerTool, Description("Get one resume variant by id. Returns null if not found.")]
    public static Task<ResumeVariantDto?> GetResumeVariant(int id, ResumeVariantService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);

    [McpServerTool, Description("Create a resume variant (the first one created becomes the default).")]
    public static Task<ResumeVariantDto> CreateResumeVariant(CreateResumeVariantRequest request, ResumeVariantService service, CancellationToken ct = default)
        => service.CreateAsync(request, ct);

    [McpServerTool, Description("Update a resume variant. Returns null if not found.")]
    public static Task<ResumeVariantDto?> UpdateResumeVariant(int id, UpdateResumeVariantRequest request, ResumeVariantService service, CancellationToken ct = default)
        => service.UpdateAsync(id, request, ct);

    [McpServerTool, Description("Delete a resume variant by id (blocked if referenced by an application). Returns true if deleted, false if not found.")]
    public static Task<bool> DeleteResumeVariant(int id, ResumeVariantService service, CancellationToken ct = default)
        => service.DeleteAsync(id, ct);

    [McpServerTool, Description("Make a resume variant the default. Returns null if not found.")]
    public static Task<ResumeVariantDto?> MakeResumeVariantDefault(int id, ResumeVariantService service, CancellationToken ct = default)
        => service.MakeDefaultAsync(id, ct);
```

- [ ] **Step 3: Extend `ProfileTools.cs`** — add inside the existing class (keep `GetUserProfile`; add the `using CareerOps.Application.Settings;` is already present):

```csharp
    [McpServerTool, Description("Update the user's job-search profile (full name required; target roles, salary, search deadline, links, etc.).")]
    public static Task<UserProfileDto> UpdateUserProfile(UpdateUserProfileRequest request, UserProfileService service, CancellationToken ct = default)
        => service.UpdateAsync(request, ct);
```

- [ ] **Step 4: Build + smoke**

```bash
dotnet build backend/CareerOps.slnx -v q --nologo
```
Expected: 0 errors. Then with the stack up (`just up`), do a `tools/list` over `/mcp` (handshake per Global Constraints) and confirm the new tool names appear: `list_companies`, `get_company`, `create_company`, `update_company`, `delete_company`, `get_resume_variant`, `create_resume_variant`, `update_resume_variant`, `delete_resume_variant`, `make_resume_variant_default`, `update_user_profile`. Optional functional check: `create_company` → `get_company` round-trip.

- [ ] **Step 5: Commit**

```bash
git add backend/src/CareerOps.Presentation/Mcp/CompanyTools.cs backend/src/CareerOps.Presentation/Mcp/ResumeVariantTools.cs backend/src/CareerOps.Presentation/Mcp/ProfileTools.cs
git commit -m "feat(mcp): company + resume-variant + profile-update tools (parity)"
```

---

## Task 2: Application + Interview + FollowUpTask + JobLead tools + REST get-by-id

**Files:**
- Modify: `Mcp/ApplicationTools.cs`, `Mcp/InterviewTools.cs`, `Mcp/FollowUpTools.cs`, `Mcp/JobLeadTools.cs`, `Endpoints/FollowUpTaskEndpoints.cs`

- [ ] **Step 1: Extend `ApplicationTools.cs`** — add inside the existing class:

```csharp
    [McpServerTool, Description("Update an application (resume variant, applied date, salary, notice period, next step/action, notes). Returns null if not found.")]
    public static Task<ApplicationDto?> UpdateApplication(int id, UpdateApplicationRequest request, ApplicationService service, CancellationToken ct = default)
        => service.UpdateAsync(id, request, ct);

    [McpServerTool, Description("Delete an application by id (also cleans up its interviews' loose follow-ups). Returns true if deleted, false if not found.")]
    public static Task<bool> DeleteApplication(int id, ApplicationService service, CancellationToken ct = default)
        => service.DeleteAsync(id, ct);
```

- [ ] **Step 2: Extend `InterviewTools.cs`** — add inside the existing class:

```csharp
    [McpServerTool, Description("Update an interview (round type, schedule, duration, interviewer, meeting URL, status, prep notes). Returns null if not found.")]
    public static Task<InterviewDto?> UpdateInterview(int id, UpdateInterviewRequest request, InterviewService service, CancellationToken ct = default)
        => service.UpdateAsync(id, request, ct);

    [McpServerTool, Description("Delete an interview by id (cleans up its loose follow-ups). Returns true if deleted, false if not found.")]
    public static Task<bool> DeleteInterview(int id, InterviewService service, CancellationToken ct = default)
        => service.DeleteAsync(id, ct);
```

- [ ] **Step 3: Extend `FollowUpTools.cs`** — add inside the existing class:

```csharp
    [McpServerTool, Description("List ALL follow-up tasks (not only those due/overdue).")]
    public static Task<IReadOnlyList<FollowUpTaskDto>> ListFollowUps(FollowUpTaskService service, CancellationToken ct = default)
        => service.ListAsync(ct);

    [McpServerTool, Description("Get one follow-up task by id. Returns null if not found.")]
    public static Task<FollowUpTaskDto?> GetFollowUp(int id, FollowUpTaskService service, CancellationToken ct = default)
        => service.GetAsync(id, ct);

    [McpServerTool, Description("Update a follow-up task (title, description, related entity, due date, status, priority). Returns null if not found.")]
    public static Task<FollowUpTaskDto?> UpdateFollowUp(int id, UpdateFollowUpTaskRequest request, FollowUpTaskService service, CancellationToken ct = default)
        => service.UpdateAsync(id, request, ct);

    [McpServerTool, Description("Delete a follow-up task by id. Returns true if deleted, false if not found.")]
    public static Task<bool> DeleteFollowUp(int id, FollowUpTaskService service, CancellationToken ct = default)
        => service.DeleteAsync(id, ct);
```

- [ ] **Step 4: Extend `JobLeadTools.cs`** — add inside the existing class:

```csharp
    [McpServerTool, Description("Delete a job lead by id (cascades to its application + interviews and cleans loose follow-ups). Returns true if deleted, false if not found.")]
    public static Task<bool> DeleteJobLead(int id, JobLeadService service, CancellationToken ct = default)
        => service.DeleteAsync(id, ct);
```

- [ ] **Step 5: Add `GET /api/follow-up-tasks/{id}`** to `Endpoints/FollowUpTaskEndpoints.cs` — insert after the `/due` mapping (before the `MapPost("/")`):

```csharp
        group.MapGet("/{id:int}", async Task<Results<Ok<FollowUpTaskDto>, NotFound>> (
                int id, FollowUpTaskService svc, CancellationToken ct) =>
                await svc.GetAsync(id, ct) is { } dto ? TypedResults.Ok(dto) : TypedResults.NotFound())
             .WithName("GetFollowUpTask");
```

- [ ] **Step 6: Build + smoke**

```bash
dotnet build backend/CareerOps.slnx -v q --nologo
dotnet test backend/CareerOps.slnx -v q --nologo
```
Expected: 0 errors; 105 tests still pass. Then with the stack up, `tools/list` over `/mcp` shows `update_application`, `delete_application`, `update_interview`, `delete_interview`, `list_follow_ups`, `get_follow_up`, `update_follow_up`, `delete_follow_up`, `delete_job_lead`. Functional delete round-trip (handshake per Global Constraints): `create_follow_up` → `delete_follow_up` returns `true`. Also `curl -s http://localhost:8080/api/follow-up-tasks/1` returns the task or 404 (new REST endpoint).

- [ ] **Step 7: Commit**

```bash
git add backend/src/CareerOps.Presentation/Mcp/ApplicationTools.cs backend/src/CareerOps.Presentation/Mcp/InterviewTools.cs backend/src/CareerOps.Presentation/Mcp/FollowUpTools.cs backend/src/CareerOps.Presentation/Mcp/JobLeadTools.cs backend/src/CareerOps.Presentation/Endpoints/FollowUpTaskEndpoints.cs
git commit -m "feat(mcp): update/delete tools for application/interview/follow-up + delete_job_lead + REST get follow-up by id (parity)"
```

---

## Task 3: Regenerate the orval client (controller-run)

Only the new `GET /api/follow-up-tasks/{id}` REST endpoint changes the OpenAPI document (MCP tools are not in OpenAPI). Regenerate so the client gains `useGetFollowUpTask` (used by Slice 2's detail work).

- [ ] **Step 1:** Stack up: `just up` (API rebuilt with the new endpoint; Postgres healthy).
- [ ] **Step 2:** `just gen-client`. Expected: `useGetFollowUpTask` added under `frontend/src/lib/api/follow-up-tasks/`.
- [ ] **Step 3:** `cd frontend && npm run typecheck` → PASS.
- [ ] **Step 4:** Commit:
```bash
git add frontend/src/lib/api
git commit -m "chore(web): regenerate orval client for get-follow-up-by-id (parity)"
```

---

## Task 4: Docs

**Files:**
- Modify: `docs/knowledge-base/03-decisions.md` (append D49), `docs/knowledge-base/02-delivery-plan.md` (note), `backend/src/CareerOps.Presentation/Mcp/README.md` (tool list)

- [ ] **Step 1: Append D49** to `docs/knowledge-base/03-decisions.md` (match the existing dated-entry format), using the verbatim text from the spec §2 (`docs/superpowers/specs/2026-06-21-careerops-capability-parity-design.md`), dated 2026-06-21. (D50 is logged in Slice 2.)

- [ ] **Step 2: Update the MCP README** (`backend/src/CareerOps.Presentation/Mcp/README.md`): update the tool section to reflect **full parity** — Reads now also include `list_companies`/`get_company`, `get_resume_variant`, `list_follow_ups`/`get_follow_up`; Writes now include `create/update/delete_company`, `create/update/delete/make_default resume_variant`, `update_application`, `delete_application`, `update_interview`, `delete_interview`, `update_follow_up`, `delete_follow_up`, `delete_job_lead`, `update_user_profile`. State that **MCP now mirrors the REST API for all 7 resources, including hard deletes (D49)** — replace the prior "no delete tools" wording. Keep counts accurate (recount the actual `[McpServerTool]` methods).

- [ ] **Step 3: Delivery-plan note** in `docs/knowledge-base/02-delivery-plan.md`:
```markdown
- **Note (2026-06-21):** MCP brought to full REST parity (Company/ResumeVariant/Profile CRUD + update/delete across all resources, incl. hard deletes — D49); added `GET /api/follow-up-tasks/{id}`. UI + data parity follows in the next slice (D50).
```

- [ ] **Step 4: Commit**

```bash
git add docs/knowledge-base/03-decisions.md docs/knowledge-base/02-delivery-plan.md backend/src/CareerOps.Presentation/Mcp/README.md
git commit -m "docs: log D49, update MCP README to full parity, delivery-plan note (parity slice 1)"
```

---

## Final verification
- `dotnet build backend/CareerOps.slnx` → 0 errors; `dotnet test` → 105 pass (no test changes this slice; tools are thin delegations over already-tested services).
- `/mcp` `tools/list` shows the full set (prior 23 + ~20 new + `ping`); a delete round-trip works.
- New REST `GET /api/follow-up-tasks/{id}` responds.

## Suggested models
- Task 1 — sonnet (new file + multi-file edits + MCP smoke).
- Task 2 — sonnet (multi-file + REST endpoint + smoke).
- Task 3 — controller-run (gen-client).
- Task 4 — haiku (docs; copy D49 verbatim from spec; recount tools accurately — do NOT invent tool names).
- Final whole-branch review — opus.

## Notes
- Tools are thin delegations over services already covered by tests; this slice adds no unit tests (YAGNI). Build + `tools/list` smoke + existing suite are the gates.
- If `tools/list` over HTTP is awkward to script, the MCP Inspector (`npx @modelcontextprotocol/inspector http://localhost:8080/mcp`) lists every tool visually — acceptable as the smoke evidence.
