# CareerOps MCP Server

## Overview

This folder contains the Model Context Protocol (MCP) server implementation, exposing CareerOps data and operations to AI agents (Claude Code / Codex, and others). The MCP server is **hosted in the `CareerOps.Presentation` process over HTTP** at the `/mcp` endpoint, alongside the REST API and Scalar documentation.

No separate console or host build is needed — the running API container *is* the MCP server.

## Prerequisites

- `just up` — starts the Docker-composed stack with Postgres (`:5432`) and the API container (`:8080`), which runs the MCP server.

## Registration

Register the MCP server in Claude Code by adding the entry in `.mcp.json` at the repository root:

```json
{
  "mcpServers": {
    "careerops": {
      "type": "http",
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

## Transport & Safety

- **Transport:** HTTP (localhost, no authentication).
- **Parity:** The MCP server exposes the same mutations as the REST API, both unauthenticated. If the API is ever deployed publicly, both REST and MCP require authentication (future concern, not introduced here). See D44 (agent-native AI; no in-app provider) and D47 (HTTP hosting over `ModelContextProtocol.AspNetCore`).
- **Logging:** stdout is normal application logging (not a JSON-RPC channel anymore).
- **Audit stamping:** All writes are `IClock`-stamped and audit-traceable. Hard deletes are safe: the service layer cascade-cleans (FK children delete automatically; loose-reference rows like `FollowUpTask` and `AiAnalysis` are cleaned in the same operation, D35). Archive/status changes are still the UI preference (D12).
- **Enum I/O:** Tool I/O uses string names for enums (e.g., `"Applied"`, `"Interviewing"`) via `JsonStringEnumConverter`.

## Tools

**Total: 44 tools** — 11 reads, 1 diagnostic, 32 writes. MCP now mirrors the REST API for all 7 resources, including hard deletes. The service layer handles cascade/cleanup (D35); the MCP tools are thin delegations.

### Diagnostics (1)

- `ping` — Health check; returns `pong`.

### Read Tools (11)

#### Dashboard & JobLead
1. `get_dashboard_summary` — Dashboard metrics: active app count, leads by status, applications by stage, due/overdue follow-ups, upcoming interviews, high-priority leads, stale apps, search-deadline countdown.
2. `list_job_leads` — All job leads with summaries.
3. `get_job_lead` — Single job lead details (incl. the full job description).

#### Company
4. `list_companies` — All companies (name, type, market, compensation fit, location).
5. `get_company` — Single company by id.

#### ResumeVariant
6. `list_resume_variants` — Resume variants.
7. `get_resume_variant` — Single resume variant by id.

#### Application
8. `list_applications` — All applications with stage/status.
9. `get_application` — Single application details.

#### Interview
10. `list_interviews` — All interviews (most recent first).
11. `list_upcoming_interviews` — Interviews in the next 7 days.
12. `get_interview` — Single interview details.

#### FollowUpTask
13. `list_follow_ups` — All follow-up tasks (pending and completed).
14. `get_follow_up` — Single follow-up task by id.

#### UserProfile
15. `get_user_profile` — User settings and profile.

### Write Tools (32)

#### Company (5)
1. `create_company` — Create a company (name required; type/market/compensation-fit default to Unknown).
2. `update_company` — Update company details.
3. `delete_company` — Delete a company (returns true if deleted, false if not found).

#### ResumeVariant (5)
4. `create_resume_variant` — Create a resume variant.
5. `update_resume_variant` — Update resume variant details.
6. `delete_resume_variant` — Delete a resume variant.
7. `make_resume_variant_default` — Set a resume variant as default.

#### JobLead (2)
8. `create_job_lead` — Create a new job lead (find-or-create company by name).
9. `update_job_lead` — Update lead title, company, seniority, priority, or fit score.
10. `delete_job_lead` — Delete a job lead.

#### Application (6)
11. `convert_to_application` — Convert a lead to an application (creates first application).
12. `change_application_stage` — Advance application stage (RecruiterScreen → TechnicalScreen → TakeHome → SystemDesign → HiringManager → Final).
13. `mark_application_rejected` — Mark application rejected (auto-advances lead status).
14. `mark_application_offer` — Mark application offer received (auto-advances lead status).
15. `mark_application_ghosted` — Mark application ghosted (auto-advances lead status).
16. `update_application` — Update application details.
17. `delete_application` — Delete an application.

#### Interview (4)
18. `create_interview` — Schedule an interview.
19. `mark_interview_completed` — Mark interview completed.
20. `update_interview` — Update interview details.
21. `delete_interview` — Delete an interview.

#### FollowUpTask (4)
22. `create_follow_up` — Schedule a follow-up task.
23. `complete_follow_up` — Mark follow-up complete.
24. `skip_follow_up` — Skip a follow-up.
25. `update_follow_up` — Update follow-up details.
26. `delete_follow_up` — Delete a follow-up task.

#### UserProfile (1)
27. `update_user_profile` — Update user profile (name, email, links, target salary, deadline).

## Testing & Visualization

- **Integration test:** Run `dotnet test` to verify tools are listed and callable over HTTP.
- **MCP Inspector:** To inspect the live server, run:
  ```bash
  npx @modelcontextprotocol/inspector http://localhost:8080/mcp
  ```
  Opens a browser UI to list tools, inspect schemas, and test calls in real time.

## Architecture

The MCP server is implemented using **`ModelContextProtocol.AspNetCore`** (matches SDK 1.4.0):

- `Program.cs` registers the MCP server with `builder.Services.AddMcpServer().WithHttpTransport().WithToolsFromAssembly(typeof(Program).Assembly, serializerOptions)` and maps it via `app.MapMcp("/mcp")`.
- Tools are stateless, attribute-decorated (`[McpServerTool]`) methods in files under this folder.
- Each tool injects the Application services (e.g., `DashboardService`, `JobLeadService`) and `CancellationToken` via ASP.NET Core DI (resolved per HTTP request).
- Enum fields in request/response DTOs are serialized as string names, configured via `JsonStringEnumConverter` on the MCP server's `JsonSerializerOptions`.

## Related Decisions

- **D35** — Delete behavior: cascade-clean + archive-first UI (loose-reference cleanup in service layer, no orphans).
- **D44** — Agent-native AI via MCP; no in-app AI provider.
- **D45** — MCP tools = reads + curated writes; string-enum I/O; `IClock` audit stamping.
- **D47** — MCP server hosted over HTTP in `CareerOps.Presentation` (supersedes D45's stdio-only transport). Separate `CareerOps.Mcp` console removed.
- **D48** — `CareerOps.Api` renamed to `CareerOps.Presentation` (Clean Architecture presentation layer).
- **D49** — MCP reaches **full REST parity, including hard deletes** (~20 new tools; 44 total; safe because services cascade-clean).
