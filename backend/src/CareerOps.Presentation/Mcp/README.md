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

**Total: 44 tools** — full REST parity across all 7 resources + dashboard + a diagnostic, **including hard deletes** (D49). The service layer handles cascade/cleanup on delete (D35); the MCP tools are thin delegations. Tool names are snake_case; enum fields use string names.

### Dashboard (1)
- `get_dashboard_summary` — active app count, leads by status, applications by stage, due/overdue follow-ups, upcoming interviews, high-priority leads, stale apps, search-deadline countdown.

### Company (5)
- `list_companies`, `get_company`, `create_company`, `update_company`, `delete_company`.

### JobLead (5)
- `list_job_leads`, `get_job_lead`, `create_job_lead` (find-or-create company by name), `update_job_lead`, `delete_job_lead` (cascades to its application + interviews, cleans loose follow-ups).

### ResumeVariant (6)
- `list_resume_variants`, `get_resume_variant`, `create_resume_variant`, `update_resume_variant`, `delete_resume_variant` (blocked if referenced by an application), `make_resume_variant_default`.

### Application (9)
- `list_applications`, `get_application`, `convert_to_application`, `change_application_stage`, `mark_application_rejected`, `mark_application_offer`, `mark_application_ghosted`, `update_application`, `delete_application`.

### Interview (7)
- `list_interviews`, `list_upcoming_interviews`, `get_interview`, `create_interview`, `update_interview`, `mark_interview_completed`, `delete_interview`.

### FollowUpTask (8)
- `list_follow_ups`, `list_due_follow_ups`, `get_follow_up`, `create_follow_up`, `update_follow_up`, `complete_follow_up`, `skip_follow_up`, `delete_follow_up`.

### UserProfile (2)
- `get_user_profile`, `update_user_profile`.

### Diagnostics (1)
- `ping` — health check; returns `pong`.

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
