# CareerOps.Mcp

MCP (Model Context Protocol) server that exposes CareerOps to AI agents such as
Claude Code / Codex. The agent reads and acts on your job-search data through
tools; the AI reasoning runs in the agent's own model — **no API key, no in-app
AI provider** (decision D44).

## Prerequisites

- Postgres running: `just up` (the server connects to the same database at
  `localhost:5432`).
- A build present: `dotnet build backend/src/CareerOps.Mcp` (the launch config
  below uses the **Debug** output).

## Register in Claude Code

Repo-root `.mcp.json`:

```json
{
  "mcpServers": {
    "careerops": {
      "command": "dotnet",
      "args": ["backend/src/CareerOps.Mcp/bin/Debug/net10.0/CareerOps.Mcp.dll"]
    }
  }
}
```

Launch assumptions:

- The DLL path points at the **Debug** build output — rebuild after changes; a
  `Release` build needs the path adjusted.
- Claude Code launches with the working directory at the repo root, so the
  relative DLL path resolves. The host sets its content root to the binary's own
  folder (`AppContext.BaseDirectory`), so `appsettings.json` (copied next to the
  DLL) is found regardless of the working directory.
- The connection string comes from `appsettings.json` (local dev database) and
  can be overridden via the `ConnectionStrings__DefaultConnection` environment
  variable.

## Transport & safety

- **stdio only** (local, single-user) — no network listener, no auth. `stdout`
  carries JSON-RPC; all logs go to `stderr`.
- Tools are thin wrappers over the existing Application services (audit-stamped
  via `IClock`). **No delete tools** — writes are create / update / status only.

## Tools

Tool names are `snake_case`; enum fields use string names (e.g. `"Applied"`).

- **Reads (11):** `get_dashboard_summary`, `list_job_leads`, `get_job_lead`,
  `list_applications`, `get_application`, `list_interviews`,
  `list_upcoming_interviews`, `get_interview`, `list_due_follow_ups`,
  `get_user_profile`, `list_resume_variants`.
- **Writes (12):** `create_job_lead`, `update_job_lead`, `convert_to_application`,
  `change_application_stage`, `mark_application_rejected`, `mark_application_offer`,
  `mark_application_ghosted`, `create_follow_up`, `complete_follow_up`,
  `skip_follow_up`, `create_interview`, `mark_interview_completed`.
- Plus `ping` (health check).
