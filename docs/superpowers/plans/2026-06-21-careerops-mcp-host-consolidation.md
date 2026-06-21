# MCP Host Consolidation + Presentation Rename — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `CareerOps.Api` → `CareerOps.Presentation` and host the MCP server inside it over HTTP (deleting the separate `CareerOps.Mcp` stdio console), so one process serves REST + Scalar + MCP.

**Architecture:** The Presentation host (ASP.NET Core) adds `ModelContextProtocol.AspNetCore` HTTP transport (`AddMcpServer().WithHttpTransport().WithToolsFromAssembly()` + `app.MapMcp("/mcp")`). The existing tool classes move into `CareerOps.Presentation/Mcp/`. No service/Domain/Infrastructure logic changes.

**Tech Stack:** .NET 10, ASP.NET Core, `ModelContextProtocol` 1.4.0 + `ModelContextProtocol.AspNetCore`, existing EF Core/Npgsql data layer, Docker Compose.

## Global Constraints

- Use the **dotnet CLI** for project/solution/package ops (D19). `git mv` to preserve history on renames/moves.
- **REST routes stay `/api/*`** — only the project/layer is renamed, not the REST surface.
- **No service/Domain/Infrastructure logic changes**; tools remain thin delegations; **no delete tools**; `IClock` audit stamping retained.
- MCP enum I/O uses **string names** (`JsonStringEnumConverter` + `TypeInfoResolver = new DefaultJsonTypeInfoResolver()` — the .NET 10 requirement proven in S6.1); domain enum ints stay pinned (D5).
- `ModelContextProtocol.AspNetCore` is the same 1.4.0 family — **verify the exact `WithHttpTransport`/`MapMcp`/serializer-options API against the installed package and adapt**; the build + HTTP smoke are the guards (this worked for the stdio host in S6.1).
- Historical `docs/superpowers/plans|specs/*` keep the old `CareerOps.Api` name (point-in-time); only **living** docs (`01-architecture.md`, PRD §8, delivery-plan, decisions, README) are updated.
- Each task ends green: `dotnet build backend/CareerOps.slnx` 0 errors; `dotnet test` 104 pass (no test count change except Task 3's +1).

### Reference: current files this plan edits (verbatim)
- `deploy/docker/api.Dockerfile`: `RUN dotnet publish backend/src/CareerOps.Api/CareerOps.Api.csproj -c Release -o /app` and `ENTRYPOINT ["dotnet", "CareerOps.Api.dll"]`.
- `deploy/compose/docker-compose.yml`: service `careerops-api:` with `dockerfile: deploy/docker/api.Dockerfile`.
- `justfile`: line 27 `dotnet watch --project backend/src/CareerOps.Api run`; line 49 `--startup-project backend/src/CareerOps.Api`.
- `backend/tests/CareerOps.IntegrationTests/CareerOps.IntegrationTests.csproj`: `<ProjectReference Include="..\..\src\CareerOps.Api\CareerOps.Api.csproj" />`.
- `backend/CareerOps.slnx`: `<Project Path="src/CareerOps.Api/CareerOps.Api.csproj" />` under `/src/`.
- Tool files to move (8): `backend/src/CareerOps.Mcp/Tools/{DiagnosticsTools,DashboardTools,JobLeadTools,ApplicationTools,InterviewTools,FollowUpTools,ProfileTools,ResumeVariantTools}.cs` — each has `namespace CareerOps.Mcp.Tools;`.

---

## Task 1: Rename `CareerOps.Api` → `CareerOps.Presentation`

**Files:** the whole `backend/src/CareerOps.Api/` project + `.slnx` + IntegrationTests csproj + `api.Dockerfile` + `docker-compose.yml` + `justfile` + `docs/knowledge-base/01-architecture.md` + PRD §8.

**Interfaces:**
- Produces: project `CareerOps.Presentation` (root namespace `CareerOps.Presentation`), serving the same REST endpoints; `Program` stays in the global namespace (tests' `WebApplicationFactory<Program>` unaffected).

- [ ] **Step 1: Remove the project from the solution (CLI), then move the folder + csproj**

```bash
dotnet sln backend/CareerOps.slnx remove backend/src/CareerOps.Api/CareerOps.Api.csproj
git mv backend/src/CareerOps.Api backend/src/CareerOps.Presentation
git mv backend/src/CareerOps.Presentation/CareerOps.Api.csproj backend/src/CareerOps.Presentation/CareerOps.Presentation.csproj
dotnet sln backend/CareerOps.slnx add backend/src/CareerOps.Presentation/CareerOps.Presentation.csproj --solution-folder src
```

- [ ] **Step 2: Replace the namespace across the moved project**

In every `.cs` under `backend/src/CareerOps.Presentation/`, replace the string `CareerOps.Api` with `CareerOps.Presentation`. This covers namespace declarations (`namespace CareerOps.Api.Endpoints;` → `…Presentation.Endpoints;`, `…Api.Filters` → `…Presentation.Filters`, `…Api.HealthChecks` → `…Presentation.HealthChecks`) AND the `using CareerOps.Api.*` lines in `Program.cs`/endpoints. Verify none remain:
```bash
grep -rn "CareerOps\.Api" backend/src/CareerOps.Presentation && echo "STILL PRESENT — fix" || echo "clean"
```
Expected: `clean`. (`Program.cs` top-level statements have no namespace; `public partial class Program { }` stays global — do not add a namespace to it.)

- [ ] **Step 3: Update the IntegrationTests reference**

Edit `backend/tests/CareerOps.IntegrationTests/CareerOps.IntegrationTests.csproj` — change the ProjectReference to:
```xml
    <ProjectReference Include="..\..\src\CareerOps.Presentation\CareerOps.Presentation.csproj" />
```
Confirm no test `.cs` imports the old namespace:
```bash
grep -rn "CareerOps\.Api" backend/tests && echo "FOUND — fix usings" || echo "clean"
```
Expected: `clean` (tests use `WebApplicationFactory<Program>`, no `using CareerOps.Api`).

- [ ] **Step 4: Rename + rewrite the Dockerfile**

```bash
git mv deploy/docker/api.Dockerfile deploy/docker/app.Dockerfile
```
Edit `deploy/docker/app.Dockerfile` lines 4 and 11 to:
```dockerfile
RUN dotnet publish backend/src/CareerOps.Presentation/CareerOps.Presentation.csproj -c Release -o /app
```
```dockerfile
ENTRYPOINT ["dotnet", "CareerOps.Presentation.dll"]
```

- [ ] **Step 5: Update compose + justfile**

In `deploy/compose/docker-compose.yml`: rename the service `careerops-api:` → `careerops-app:` and change its `dockerfile: deploy/docker/api.Dockerfile` → `dockerfile: deploy/docker/app.Dockerfile`. (Leave the `careerops-postgres` service, network, and the connection-string env unchanged.)

In `justfile`: line 27 `--project backend/src/CareerOps.Api run` → `--project backend/src/CareerOps.Presentation run`; line 49 `--startup-project backend/src/CareerOps.Api` → `--startup-project backend/src/CareerOps.Presentation`.

- [ ] **Step 6: Update living docs**

- `docs/knowledge-base/01-architecture.md`: replace `CareerOps.Api` references with `CareerOps.Presentation` (note it now hosts REST + MCP). 
- PRD `docs/CareerOps-PRD.md` §8 (project structure): rename the `CareerOps.Api` project entry to `CareerOps.Presentation`.
Do not touch dated `docs/superpowers/**` files.

- [ ] **Step 7: Build + test**

```bash
dotnet build backend/CareerOps.slnx -v q --nologo
dotnet test backend/CareerOps.slnx -v q --nologo
```
Expected: build 0 errors; 104 tests pass. (`CareerOps.Mcp` still builds here — it's untouched in Task 1.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: rename CareerOps.Api -> CareerOps.Presentation (hosts REST + MCP) (D48)"
```

---

## Task 2: Host MCP in Presentation over HTTP; move tools; delete the console

**Files:**
- Modify: `backend/src/CareerOps.Presentation/CareerOps.Presentation.csproj` (add package), `backend/src/CareerOps.Presentation/Program.cs`
- Move: the 8 tool files → `backend/src/CareerOps.Presentation/Mcp/`
- Delete: the entire `backend/src/CareerOps.Mcp/` project (+ `.slnx` entry)

**Interfaces:**
- Consumes: the existing services via DI (request-scoped); `ModelContextProtocol.AspNetCore`.
- Produces: an MCP endpoint at `/mcp` on the Presentation host exposing the 23 tools + `ping`.

- [ ] **Step 1: Add the ASP.NET MCP package**

```bash
dotnet add backend/src/CareerOps.Presentation package ModelContextProtocol.AspNetCore --prerelease
```
(If the exact version differs from the `ModelContextProtocol` 1.4.0 already referenced, align them; note it in the report.)

- [ ] **Step 2: Move the tool files into Presentation**

```bash
mkdir -p backend/src/CareerOps.Presentation/Mcp
git mv backend/src/CareerOps.Mcp/Tools/*.cs backend/src/CareerOps.Presentation/Mcp/
```
In each moved file, change `namespace CareerOps.Mcp.Tools;` → `namespace CareerOps.Presentation.Mcp;`. Nothing else changes (they import `CareerOps.Application.*` + `ModelContextProtocol.Server` + `System.ComponentModel`). Example (`DashboardTools.cs`):
```csharp
using System.ComponentModel;
using CareerOps.Application.Dashboard;
using ModelContextProtocol.Server;

namespace CareerOps.Presentation.Mcp;

[McpServerToolType]
public static class DashboardTools
{
    [McpServerTool, Description("Get the full dashboard summary: active application count, leads by status, applications by stage, follow-ups due today, overdue follow-ups, upcoming interviews (next 7 days), high-priority leads, stale applications, and the search-deadline countdown.")]
    public static Task<DashboardSummaryDto> GetDashboardSummary(DashboardService service, CancellationToken ct = default)
        => service.GetSummaryAsync(ct);
}
```
Verify: `grep -rn "CareerOps\.Mcp\.Tools" backend/src/CareerOps.Presentation` → no matches.

- [ ] **Step 3: Delete the console project**

```bash
dotnet sln backend/CareerOps.slnx remove backend/src/CareerOps.Mcp/CareerOps.Mcp.csproj
git rm -r backend/src/CareerOps.Mcp
```
(This removes `Program.cs`, `appsettings.json`, the now-empty `Tools/`, and the csproj — the stdio host, its stderr-logging, content-root fix, and duplicated dev-password config all go away.)

- [ ] **Step 4: Wire MCP into `Program.cs`**

Replace `backend/src/CareerOps.Presentation/Program.cs` with (additions: the 3 `System.Text.Json*` usings, the MCP service registration, and `app.MapMcp("/mcp")`):

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using CareerOps.Presentation.Endpoints;
using CareerOps.Presentation.HealthChecks;
using CareerOps.Application;
using CareerOps.Infrastructure;
using CareerOps.Infrastructure.Persistence;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration)
    .WriteTo.Console());

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("db", tags: ["db"]);

// MCP server over HTTP, sharing the same services. Enum names (not ints);
// TypeInfoResolver is required on .NET 10 when passing JsonSerializerOptions to the SDK.
var mcpJson = new JsonSerializerOptions(JsonSerializerDefaults.Web) { TypeInfoResolver = new DefaultJsonTypeInfoResolver() };
mcpJson.Converters.Add(new JsonStringEnumConverter());
builder.Services.AddMcpServer().WithHttpTransport().WithToolsFromAssembly(serializerOptions: mcpJson);

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddPolicy("frontend", policy =>
    policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment() && !EF.IsDesignTime)
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<CareerOpsDbContext>().Database.MigrateAsync();
}

app.UseExceptionHandler();
app.UseSerilogRequestLogging();
app.UseCors("frontend");
app.MapOpenApi();
app.MapScalarApiReference();

app.MapGet("/", () => Results.Redirect("/scalar/v1")).ExcludeFromDescription();

app.MapHealthChecks("/health", new HealthCheckOptions { Predicate = _ => false }).ExcludeFromDescription();
app.MapHealthChecks("/health/db", new HealthCheckOptions { Predicate = c => c.Tags.Contains("db") }).ExcludeFromDescription();

app.MapGroup("/api/settings").WithTags("Settings").MapSettings();
app.MapGroup("/api/companies").WithTags("Companies").MapCompanies();
app.MapGroup("/api/job-leads").WithTags("JobLeads").MapJobLeads();
app.MapGroup("/api/job-leads").WithTags("Applications").MapConvertToApplication();
app.MapGroup("/api/resume-variants").WithTags("ResumeVariants").MapResumeVariants();
app.MapGroup("/api/applications").WithTags("Applications").MapApplications();
app.MapGroup("/api/follow-up-tasks").WithTags("FollowUpTasks").MapFollowUpTasks();
app.MapGroup("/api/interviews").WithTags("Interviews").MapInterviews();
app.MapGroup("/api/dashboard").WithTags("Dashboard").MapDashboard();

app.MapMcp("/mcp");

app.Run();

public partial class Program { } // exposed for WebApplicationFactory in tests
```

**SDK-API note (verify against installed package):** `WithHttpTransport()`, `WithToolsFromAssembly(serializerOptions:)`, and `app.MapMcp("/mcp")` are the expected `ModelContextProtocol.AspNetCore` surface. If a name/signature differs in the installed build (e.g. `MapMcp()` takes no pattern, or the serializer hook lives on `AddMcpServer(opts)`), adapt to the installed API and note it. If `WithToolsFromAssembly()` does not pick up the tools, pass the Presentation assembly explicitly (`WithToolsFromAssembly(typeof(Program).Assembly, serializerOptions: mcpJson)`). Fallback for enums: if the serializer hook is unavailable, drop `serializerOptions` and document int enums.

- [ ] **Step 5: Build + endpoint-mapped check**

```bash
dotnet build backend/CareerOps.slnx -v q --nologo
```
Expected: 0 errors; `CareerOps.Mcp` is gone from the solution.

Then with the stack up (`just up`) confirm `/mcp` is mapped (not 404):
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"1.0"}}}'
```
Expected: `200` (a live MCP endpoint), not `404`. (Functional tools/list + tools/call is verified in Task 3 + the controller smoke.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(mcp): host MCP over HTTP in Presentation, move tools, delete console (D47)"
```

---

## Task 3: MCP endpoint integration test

**Files:**
- Create: `backend/tests/CareerOps.IntegrationTests/McpEndpointTests.cs`

**Interfaces:**
- Consumes: `ApiFactory` (existing `WebApplicationFactory<Program>` with `UseEnvironment("Testing")`).

The Testing environment has no database — `initialize` does not touch the DB, so this is a DB-free check that `/mcp` speaks MCP.

- [ ] **Step 1: Write the failing test**

`backend/tests/CareerOps.IntegrationTests/McpEndpointTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using FluentAssertions;

namespace CareerOps.IntegrationTests;

public class McpEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Mcp_endpoint_handles_initialize()
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/mcp")
        {
            Content = new StringContent(
                """{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}""",
                Encoding.UTF8, "application/json"),
        };
        req.Headers.Accept.ParseAdd("application/json");
        req.Headers.Accept.ParseAdd("text/event-stream");

        var res = await _client.SendAsync(req);

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        (await res.Content.ReadAsStringAsync()).Should().Contain("protocolVersion");
    }
}
```

- [ ] **Step 2: Run it**

Run: `dotnet test backend/tests/CareerOps.IntegrationTests/CareerOps.IntegrationTests.csproj`
Expected: PASS. **If the assertion shape differs** (the streamable-HTTP transport may frame the result as an SSE `data:` line or set status differently), adapt the assertion to the SDK's actual initialize response — assert `200 OK` and that the body contains the MCP protocol result (`"protocolVersion"` or `"serverInfo"`). Keep it DB-free (initialize only). Document any adaptation.

- [ ] **Step 3: Full verify + commit**

```bash
dotnet build backend/CareerOps.slnx -v q --nologo && dotnet test backend/CareerOps.slnx -v q --nologo
```
Expected: 105 tests pass (104 + this one).
```bash
git add backend/tests/CareerOps.IntegrationTests/McpEndpointTests.cs
git commit -m "test(mcp): integration test for the /mcp endpoint handshake (D47)"
```

---

## Task 4: Docs + `.mcp.json` + README

**Files:**
- Modify: `.mcp.json`, `docs/knowledge-base/03-decisions.md`, `docs/knowledge-base/02-delivery-plan.md`
- Move/rewrite: `backend/src/CareerOps.Mcp/README.md` content → `backend/src/CareerOps.Presentation/Mcp/README.md` (the console README was deleted with the project in Task 2 — recreate it for the new host)

- [ ] **Step 1: Switch `.mcp.json` to HTTP**

Replace `.mcp.json` (repo root):
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
Note in the commit body: confirm the `type` key Claude Code expects for a streamable-HTTP MCP server (`"http"`; if the running Claude Code build needs `"sse"` or a different shape, adjust). The API must be running (`just up`).

- [ ] **Step 2: New `CareerOps.Presentation/Mcp/README.md`**

Recreate the MCP README for the HTTP host (the console one was removed in Task 2). Cover: what it is (MCP over HTTP at `/mcp` on the Presentation host, no API key, D44); prerequisites (`just up`); registration via the HTTP `.mcp.json` above; that it's served by the same process as the REST API + Scalar; transport = HTTP (localhost, no auth — parity with the REST API); the tool list (11 read + 12 write + ping, snake_case, string enums); **no delete tools**. Adapt the prior README's content; drop the stdio/Debug-DLL/`dotnet build` launch instructions (no longer needed).

- [ ] **Step 3: Decisions D47 + D48**

Append D47 and D48 to `docs/knowledge-base/03-decisions.md`, copied from the spec §6 (`docs/superpowers/specs/2026-06-21-careerops-mcp-host-consolidation-design.md`), dated 2026-06-21, matching the existing entry format.

- [ ] **Step 4: Delivery-plan note**

In `docs/knowledge-base/02-delivery-plan.md`, under Phase 6, add:
```markdown
- **Note (2026-06-21):** MCP host consolidated into the renamed `CareerOps.Presentation` project over HTTP (`/mcp`); separate `CareerOps.Mcp` stdio console removed; `CareerOps.Api` → `CareerOps.Presentation`. D47–D48 logged.
```

- [ ] **Step 5: Commit**

```bash
git add .mcp.json docs/knowledge-base/03-decisions.md docs/knowledge-base/02-delivery-plan.md backend/src/CareerOps.Presentation/Mcp/README.md
git commit -m "docs: HTTP .mcp.json, MCP README, D47-D48, delivery-plan note (consolidation)"
```

---

## Final verification (after all tasks)

- `dotnet build backend/CareerOps.slnx` → 0 errors; only `CareerOps.Presentation` (no `CareerOps.Api`, no `CareerOps.Mcp`) under `/src/`.
- `dotnet test` → 105 pass.
- Controller HTTP smoke (stack up): `initialize` → capture `Mcp-Session-Id` header → `notifications/initialized` → `tools/call get_dashboard_summary`, confirming a tool reaches Postgres and returns enum names. (Or the MCP Inspector pointed at `http://localhost:8080/mcp`.)
- `docker compose` builds the `careerops-app` service from `app.Dockerfile` (optional: `just up` rebuilds clean).

## Suggested models

- Task 1 — sonnet (careful, broad mechanical rename + build/test gate).
- Task 2 — sonnet (host wiring + the AspNetCore SDK verification + tool move + project delete).
- Task 3 — sonnet (MCP-over-HTTP integration test may need shape adaptation).
- Task 4 — haiku (docs/config transcription).
- Final whole-branch review — opus.

## Notes
- `ModelContextProtocol.AspNetCore` is prerelease-family; adapt to the installed API where the plan's calls differ, and note it — build + the `/mcp` checks are the guardrails.
- The orval-generated client headers still say "CareerOps.Api | v1" (OpenAPI title derives from the assembly); the next `just gen-client` will refresh them. No functional impact; not regenerated in this slice.
