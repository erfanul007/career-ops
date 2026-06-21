# CareerOps — MCP Host Consolidation into the API — Design

**Date:** 2026-06-21
**Status:** Approved (brainstorming → plan)
**Supersedes:** D45's "stdio-only, separate console host" (the transport/hosting part only). D44's core — agent-native AI via MCP, no in-app provider — stands. The rest of D45 (reads + curated writes, no hard deletes, `IClock` audit stamping, string-enum I/O, pinned enum ints) is unchanged.

## 1. Goal

Host the MCP server inside the existing `CareerOps.Api` over HTTP, alongside the REST API and Scalar, and delete the separate `CareerOps.Mcp` console project. One deployable, one process; MCP is live whenever the stack is up.

## 2. Why

- **One deployable** — the `just up` API container already running *is* the MCP server. No separate console build, no host-side `dotnet`, no subprocess launch.
- **Removes three stdio-only workarounds** the console needed: stdout-reserved/stderr-only logging, the `ContentRootPath = AppContext.BaseDirectory` fix, and the **duplicated `appsettings.json` + dev password** (the API's config/connection string is reused — cleaner secret posture).
- MCP **always available** when the stack runs; the MCP Inspector connects by URL (no build/launch).
- Per-request DI scope is native to ASP.NET Core (cleaner than the console's per-call scoping).

## 3. Architecture

### 3.0 Rename `CareerOps.Api` → `CareerOps.Presentation` (first)

"Api" implies REST-only; the host now serves REST **and** MCP, so the layer is renamed to the conventional Clean Architecture name **`CareerOps.Presentation`**. Done first so the MCP tools land in `CareerOps.Presentation/Mcp/`.

Scope (mechanical, build+test-gated):
- `git mv backend/src/CareerOps.Api backend/src/CareerOps.Presentation`; rename the csproj to `CareerOps.Presentation.csproj`.
- Replace `namespace CareerOps.Api` → `namespace CareerOps.Presentation` across all ~13 files (Program.cs, the 8 Endpoints, `Filters/`, `HealthChecks/`); update any `using CareerOps.Api…` in tests.
- `.slnx`: update the project path/name. `CareerOps.IntegrationTests.csproj`: update the ProjectReference.
- **Full deploy rename:** `deploy/docker/api.Dockerfile` → `deploy/docker/app.Dockerfile` (and inside: publish `CareerOps.Presentation.csproj`, entrypoint `CareerOps.Presentation.dll`); `docker-compose.yml` service `careerops-api` → `careerops-app` (+ its `dockerfile:` path); `justfile` lines 27 & 49 (`--project`/`--startup-project` → `CareerOps.Presentation`).
- Living docs updated: `docs/knowledge-base/01-architecture.md`, PRD §8 project list. **Historical** `docs/superpowers/plans|specs/*` keep the old name (point-in-time records) — not rewritten.
- **REST routes stay `/api/*`** (they are the REST API; not renamed). `WebApplicationFactory<Program>` is unaffected (`Program` is in the global namespace).
- Verify: `dotnet build backend/CareerOps.slnx` 0 errors + `dotnet test` 104 pass before moving on.

### 3.1 Host MCP in the renamed Presentation project

Use **`ModelContextProtocol.AspNetCore`** (matches the installed `ModelContextProtocol` 1.4.0) for HTTP transport in the Presentation host's Kestrel:

```csharp
// Program.cs (additions)
builder.Services.AddMcpServer()
    .WithHttpTransport()
    .WithToolsFromAssembly();   // scans CareerOps.Api (where the tools now live)
...
app.MapMcp("/mcp");             // alongside /api/*, /scalar, /health
```

- **Tool placement:** move the 8 `Tools/*.cs` from `CareerOps.Mcp` into `CareerOps.Presentation/Mcp/` (namespace `CareerOps.Presentation.Mcp`). The 23 tools + `ping` carry over unchanged (only namespace/project changes). They keep injecting the existing Application services (now resolved from the request scope) + `CancellationToken`.
- **Enum serialization:** keep string-enum names. Configure the `JsonStringEnumConverter` (+ `TypeInfoResolver = new DefaultJsonTypeInfoResolver()` as on .NET 10) on the MCP server's serializer options via whatever `ModelContextProtocol.AspNetCore` exposes (e.g. the `WithToolsFromAssembly(serializerOptions:)` overload or the `AddMcpServer`/`McpServerOptions` hook) — verified by the HTTP smoke; fallback documented in the plan.
- **Delete `CareerOps.Mcp`** entirely: project, `Program.cs`, `appsettings.json`, `Tools/`, and its `.slnx` entry (via `dotnet sln remove`). Its README content folds into the API/MCP doc.
- **`.mcp.json`** switches to an HTTP entry: `{ "mcpServers": { "careerops": { "type": "http", "url": "http://localhost:8080/mcp" } } }` (confirm the exact `type`/transport key Claude Code expects for the SDK's streamable-HTTP endpoint during the smoke).
- Logging reverts to the API's normal Serilog (stdout is no longer a JSON-RPC channel) — the stderr-only constraint is gone.

## 4. Security / exposure (flagged)

MCP-over-HTTP is a network listener with unauthenticated write tools — but this is **parity** with the existing REST API, which already exposes the same mutations unauthenticated on the same `:8080`. So **no new exposure** for local/personal use. The unchanged caveat: if the API is ever deployed publicly, **both** REST and MCP require auth (a pre-existing API concern, not introduced here). Keep it localhost. No hard deletes; all writes `IClock`-stamped.

## 5. Testing

- The existing 104 tests must still pass (the tool move + Program.cs change touch no service logic).
- **New DB-free integration test** (the Testing env has no DB): over HTTP, `initialize` → `tools/list` against `/mcp` and assert the `careerops` tools are listed (tools/list does not touch the DB). This is stronger than the console had (the console had no integration test).
- A manual HTTP smoke (`initialize` → `tools/list` → one `tools/call` against the running API) confirms a tool call reaches Postgres.

## 6. Decisions (to append to 03-decisions.md)

- **D47** — The MCP server is hosted inside the Presentation host over HTTP (`ModelContextProtocol.AspNetCore`, `WithHttpTransport()` + `app.MapMcp("/mcp")`); the separate `CareerOps.Mcp` stdio console is deleted. One deployable; tools live in `CareerOps.Presentation/Mcp/`. **Supersedes** D45's stdio-only/separate-host transport choice. D44 (agent-native AI via MCP, no in-app provider) and the rest of D45 (curated writes, no deletes, audit stamping, string enums) are unchanged. HTTP exposure is at parity with the already-unauthenticated REST API; public deployment of either requires auth (future).
- **D48** — The host project `CareerOps.Api` is renamed to **`CareerOps.Presentation`** (Clean Architecture presentation layer) because it now serves REST **and** MCP uniformly. REST routes remain `/api/*`. The deploy artifacts rename too: compose service `careerops-api` → `careerops-app`, `deploy/docker/api.Dockerfile` → `app.Dockerfile`. Historical plan/spec docs keep the old name; living docs are updated.

## 7. Sequencing & scope

This consolidation ships as its own slice, merged before the refined S6.2. S6.2's new tools (`update_application`/`interview`/`follow_up`, `AiAnalysis` write-back) then land in the consolidated API host.

Out of scope: auth (MVP guardrail), public deployment, HTTPS, the S6.2 features.
