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
- **Audit stamping:** All writes are `IClock`-stamped and audit-traceable. No hard deletes; all mutations use archive/status changes.
- **Enum I/O:** Tool I/O uses string names for enums (e.g., `"Applied"`, `"Interviewing"`) via `JsonStringEnumConverter`.

## Tools

### Read Tools (11)

1. `get_dashboard_summary` — Dashboard metrics: active app count, leads by status, applications by stage, due/overdue follow-ups, upcoming interviews, high-priority leads, stale apps, search-deadline countdown.
2. `list_job_leads` — All job leads with summaries.
3. `get_job_lead` — Single job lead details.
4. `list_applications` — All applications with stage/status.
5. `list_interviews` — All interviews scheduled.
6. `list_upcoming_interviews` — Interviews in the next 7 days.
7. `list_due_follow_ups` — Follow-ups due today or overdue.
8. `get_user_profile` — User settings and profile.
9. `list_resume_variants` — Resume versions and variants.
10. `get_fit_analysis` — Fit analysis for a job lead (if available).
11. `ping` — Health check; no-op, always succeeds.

### Write Tools (12)

1. `create_job_lead` — Create a new job lead.
2. `update_job_lead` — Update lead title, company, seniority, or priority.
3. `convert_to_application` — Convert a lead to an application (creates first application).
4. `change_application_stage` — Advance application stage (RecruiterScreen → TechnicalScreen → TakeHome → SystemDesign → HiringManager → Final).
5. `mark_application_rejected` — Mark application rejected (auto-advances lead status).
6. `mark_application_offer` — Mark application offer received (auto-advances lead status).
7. `mark_application_ghosted` — Mark application ghosted (auto-advances lead status).
8. `create_follow_up` — Schedule a follow-up task.
9. `complete_follow_up` — Mark follow-up complete.
10. `skip_follow_up` — Skip a follow-up.
11. `create_interview` — Schedule an interview.
12. `mark_interview_completed` — Mark interview completed.

All write tools **never cascade-delete**; orphaned rows (e.g., loose `AiAnalysis` or `FollowUpTask` entries) are cleaned on entity archive/delete.

## Testing & Visualization

- **Integration test:** Run `dotnet test` to verify tools are listed and callable over HTTP.
- **MCP Inspector:** To inspect the live server, run:
  ```bash
  npx @modelcontextprotocol/inspector http://localhost:8080/mcp
  ```
  Opens a browser UI to list tools, inspect schemas, and test calls in real time.

## Architecture

The MCP server is implemented using **`ModelContextProtocol.AspNetCore`** (matches SDK 1.4.0):

- `Program.cs` registers the MCP server with `builder.Services.AddMcpServer().WithHttpTransport().WithToolsFromAssembly()` and maps the `/mcp` endpoint.
- Tools are stateless, attribute-decorated (`[McpServerTool]`) methods in files under this folder.
- Each tool injects the Application services (e.g., `DashboardService`, `JobLeadService`) and `CancellationToken` via ASP.NET Core DI (resolved per HTTP request).
- Enum fields in request/response DTOs are serialized as string names, configured via `JsonStringEnumConverter` on the MCP server's `JsonSerializerOptions`.

## Related Decisions

- **D44** — Agent-native AI via MCP; no in-app AI provider.
- **D45** — MCP tools = reads + curated writes; string-enum I/O; no hard deletes; `IClock` audit stamping.
- **D47** — MCP server hosted over HTTP in `CareerOps.Presentation` (supersedes D45's stdio-only transport). Separate `CareerOps.Mcp` console removed.
- **D48** — `CareerOps.Api` renamed to `CareerOps.Presentation` (Clean Architecture presentation layer).
