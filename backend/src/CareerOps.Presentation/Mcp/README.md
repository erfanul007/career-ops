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
- **Surface:** A **curated, workflow-oriented** tool set over the **Job aggregate** (plus follow-ups, companies, dashboard, profile, and a diagnostic). This is **not** full REST parity — tools cover the real agent workflows (D53). If the API is ever deployed publicly, both REST and MCP would require authentication (future concern, not introduced here). See D44 (agent-native AI; no in-app provider) and D47 (HTTP hosting over `ModelContextProtocol.AspNetCore`).
- **Logging:** stdout is normal application logging.
- **Audit stamping:** All writes are `IClock`-stamped and audit-traceable. The available deletes (`delete_job_activity`, `delete_follow_up`, attachment/property removal) are safe: the service layer cleans loose references in the same operation — deleting an activity nulls the activity link on its follow-ups while preserving the job link (D35). Archive/status changes remain the UI preference (D12).
- **Enum I/O:** Tool I/O uses string names for enums (e.g., `"Applied"`, `"Interviewing"`) via `JsonStringEnumConverter`.

## Tools

**Total: 25 tools** — a curated, workflow-oriented surface over the Job aggregate, plus follow-ups, companies, dashboard, profile, and a diagnostic (D53). Tool names are snake_case; enum fields use string names.

### Dashboard (1)
- `get_dashboard_summary` — active jobs by status, follow-ups due today / overdue, upcoming activities, stale jobs, offer deadlines.

### Job (14)
- `list_jobs` — list with filters (statuses, source, remote mode, employment type, countries, company search, priority, free-text across title/company/sourceUrl/notes).
- `get_job` — full detail including activities, follow-ups, properties, and attachments.
- `create_job` — provide `companyId` **or** `companyName` (find-or-create); status defaults to `Discovered`.
- `update_job` — patch job fields (does **not** change status — use `transition_job`).
- `transition_job` — move to a new status; actor recorded as `Agent`.
- `archive_job` — shorthand transition to `Archived`.
- `add_job_activity`, `update_job_activity`, `complete_job_activity`, `delete_job_activity` — manage activities (interviews, screenings, etc.).
- `upsert_job_attachment`, `remove_job_attachment` — attachment metadata (no file upload).
- `upsert_job_property`, `remove_job_property` — key-value metadata (idempotent by key).

### FollowUpTask (5)
- `list_follow_ups` — filter by `due` (`today`/`overdue`/`all`), status, or jobId.
- `add_follow_up` — optionally link to a job or job activity.
- `complete_follow_up`, `skip_follow_up`, `delete_follow_up`.

### Company (2)
- `list_companies`, `upsert_company` — find-or-create a company by name (trim/case-insensitive).

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

The MCP server is implemented using **`ModelContextProtocol.AspNetCore`**:

- `Program.cs` registers the MCP server with `builder.Services.AddMcpServer().WithHttpTransport().WithToolsFromAssembly(...)` and maps it via `app.MapMcp("/mcp")`.
- Tools are attribute-decorated (`[McpServerTool]`) methods grouped by `[McpServerToolType]` classes in this folder (`JobTools`, `FollowUpTools`, `CompanyTools`, `DashboardTools`, `ProfileTools`, `DiagnosticsTools`).
- Each tool injects the Application services (e.g., `JobService`, `JobWorkflowService`, `JobActivityService`, `DashboardService`) via ASP.NET Core DI (resolved per HTTP request).
- Enum fields are serialized as string names via `JsonStringEnumConverter` on the MCP server's `JsonSerializerOptions`.

## Related Decisions

- **D35** — Delete behavior: cascade-clean + archive-first UI (loose-reference cleanup in the service layer, no orphans).
- **D44** — Agent-native AI via MCP; no in-app AI provider.
- **D45** — MCP tools = reads + curated writes; string-enum I/O; `IClock` audit stamping.
- **D47** — MCP server hosted over HTTP in `CareerOps.Presentation`.
- **D48** — `CareerOps.Api` renamed to `CareerOps.Presentation` (Clean Architecture presentation layer).
- **D53** — V2 MCP is a curated, workflow-oriented tool set over the Job aggregate (25 tools); supersedes D49's full-REST-parity stance.
