# CareerOps Phase 6 — Agent-native AI via an MCP Server — Design

**Date:** 2026-06-21
**Status:** Approved (brainstorming → plan)
**Supersedes:** the in-app AI plan (delivery-plan Phase 6 "AI baseline/Mock" + Phase 7 "real provider"). PRD §16 outcomes are still delivered — by an external agent via MCP — see D44.

## 1. Goal

Expose CareerOps's core operations as **MCP tools** so the user drives AI workflows
(fit analysis, interview prep, referral drafting, "what should I do today") from **Claude
Code / Codex** against their own data — no API key, no in-app provider. The platform stays
bloat-free: CRUD + dashboard + a thin tool surface; the AI reasoning lives in the external
client's model.

This aligns with PRD §16 ("AI must be useful but optional; the app must work without AI keys")
better than an embedded provider would.

## 2. Architecture

A new thin console project **`backend/src/CareerOps.Mcp`** that references `CareerOps.Application`
+ `CareerOps.Infrastructure`, registers the **same** services, and runs the **official C# MCP SDK**
(`modelcontextprotocol/csharp-sdk`, Microsoft collaboration) over **stdio**:

```csharp
var builder = Host.CreateApplicationBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole(o => o.LogToStandardErrorThreshold = LogLevel.Trace); // stdout = JSON-RPC only
builder.Services.AddInfrastructure(builder.Configuration);  // same DbContext → same Postgres
builder.Services.AddApplication();                          // same sealed services + IClock
builder.Services.AddMcpServer().WithStdioServerTransport().WithToolsFromAssembly();
await builder.Build().RunAsync();
```

- **Packages:** `ModelContextProtocol` (prerelease) + `Microsoft.Extensions.Hosting`, added via the
  dotnet CLI (D19). csproj inherits TFM/Nullable/ImplicitUsings from `backend/Directory.Build.props`
  — match the sibling-project minimalism (no redundant `<PropertyGroup>`).
- **Tools** are `[McpServerToolType]` classes with `[McpServerTool]` methods that take a service
  (DI-injected) + `CancellationToken` and return the **existing DTOs** — **zero new business logic,
  zero duplicated rules, no reinvention**. The SDK builds each tool's input schema; **write tools
  reuse the existing request records** (`CreateJobLeadRequest`, `ChangeStageRequest`, …) directly as
  the typed input.
- Separate process from the API; both hit the same Postgres (`localhost:5432`). EF handles concurrent
  connections. No keys, **no network, no auth** (stdio = local single-user — fits the MVP guardrail).
- Claude Code/Codex launch it via an MCP config entry (`dotnet run --project backend/src/CareerOps.Mcp`).

### Enum serialization
The agent should see/​send enum **names**, not integers. Configure a `JsonStringEnumConverter` on the
MCP server's serializer options so `status: "Applied"` not `status: 2` (verified in the smoke). If the
installed SDK build doesn't expose serializer options cleanly, fall back to documenting each enum's
values in the tool `[Description]`. (Domain enum integer values stay pinned — D5.)

### Config / secret posture
`CareerOps.Mcp/appsettings.json` mirrors the API's **dev** connection string
(`Host=localhost;Port=5432;…`). `Host.CreateApplicationBuilder` layers `appsettings` + environment by
default, so the MCP client config can override `ConnectionStrings__DefaultConnection`. This matches the
existing API's dev-credential posture (a local-only dev cred already in the repo) — no new production
secret introduced. No AI keys anywhere.

## 3. Slices

- **S6.1 — MCP server + core tools** (planned/built now). Scaffold + host + DI + string-enum config,
  then **read** tools and **curated write** tools. **No DB changes.** A JSON-RPC stdio smoke proves
  Claude Code/Codex can `initialize` → `tools/list` → `tools/call`.
- **S6.2 — AI analysis store + write-back + UI** (next). `AiAnalysis` entity + migration (polymorphic
  `EntityType`/`EntityId`, like FollowUpTask; `Kind`, `Content`, `Model`, timestamp). Tools
  `save_fit_analysis` (updates the existing JobLead AI fields `FitScore`/`AiSummary`/`MissingKeywords`/
  `SuggestedResumeAngle`, latest-wins, + a history row) and `save_ai_analysis` (generic, e.g. interview
  prep). Read tool `get_ai_analysis`. UI: read-only AI panel on JobLead + Interview detail. This is
  where the four PRD `IAiAssistant` outcomes land — produced by the agent, persisted for ISO 42001
  traceability.

### S6.1 tool surface
Reads (no enum inputs): `get_dashboard_summary`, `list_job_leads` (optional status/priority filters),
`get_job_lead` (incl. job description), `list_applications`, `list_interviews`, `list_upcoming_interviews`,
`list_due_follow_ups`, `get_user_profile`, `list_resume_variants`.
Curated writes (no hard deletes — archive/status only): `create_job_lead`, `update_job_lead`,
`convert_to_application`, `change_application_stage`, `mark_application_rejected`/`offer`/`ghosted`,
`create_follow_up`, `complete_follow_up`, `skip_follow_up`, `create_interview`, `mark_interview_completed`.
Every tool delegates to an existing service method — no new logic. `IClock` audit stamping is retained
through the services.

## 4. Decisions (to append to 03-decisions.md)

- **D44** — AI is delivered via an in-process MCP server (`CareerOps.Mcp`, stdio, official
  `ModelContextProtocol` SDK + `Microsoft.Extensions.Hosting`), tools wrapping existing Application
  services. **Supersedes** delivery-plan Phase 6 (`IAiAssistant`/`MockAiAssistant`) and Phase 7 (real
  provider + AI-provider settings), which are dropped. Satisfies the AI-features org policy as an
  agent-native capability; PRD §16 "AI optional, no keys" upheld. The `IAiAssistant` seam can be added
  later if an in-app provider is ever wanted.
- **D45** — MCP tools = reads + curated writes; **no hard deletes** (archive/status only); `IClock`
  audit stamping retained; **stdio-only** (no network, no auth). Enum I/O uses string names
  (`JsonStringEnumConverter`); domain enum integer values stay pinned (D5).
- **D46** — AI output is persisted via agent **write-back** tools into an `AiAnalysis` store (no in-app
  provider), surfaced read-only in the UI (S6.2).

## 5. Docs reconciliation (the "make previous docs consistent" ask)

- `02-delivery-plan.md`: rewrite **Phase 6** as "Agent-native AI via MCP" (S6.1, S6.2) and mark the old
  Phase 6 (Mock) / Phase 7 (real provider) **superseded by D44**, with a pointer to this spec.
- `03-decisions.md`: append D44–D46.
- PRD (`docs/CareerOps-PRD.md`) stays the authority and is **not** rewritten; the supersession is
  recorded in the decisions log + delivery plan (the knowledge base governs *how* we build).
- A short note in the knowledge-base index/architecture about the new `CareerOps.Mcp` component.

## 6. Testing

Light tool-wrapper tests (tools delegate to already-tested services — assert a tool returns the expected
DTO for seeded data, against EF InMemory) + a **JSON-RPC stdio smoke** (`initialize` → `tools/list` →
one `tools/call`) run by the controller. A Claude Code `.mcp.json` snippet is provided so the user can
register the server.

## 7. Out of scope

Contacts (separate un-sliced non-AI gap — unchanged by this). HTTP/SSE transport (stdio only; seam left
open). In-app AI provider / Mock / AI-provider settings (dropped per D44). No new auth/multi-user.
