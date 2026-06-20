# Decisions (ADR-lite)

One entry per locked decision: the choice, why, and what we rejected. A decision changes
only by adding a new dated entry here — never silently. All entries below are dated
**2026-06-19** unless noted.

---

### D1 — Minimal APIs (not Controllers)
- **Decision:** Minimal APIs, one `MapGroup` endpoint module per resource.
- **Why:** Less boilerplate; modern .NET; fits "no ceremony" (PRD §5.3).
- **Rejected:** Controllers — more recognizable for some reviewers, but more ceremony than
  this CRUD-shaped app needs.
- **Consequence:** Endpoints must set explicit `operationId` (`.WithName(...)`) for clean
  orval output. See `04-conventions.md`.

### D2 — Mapster (not manual mapping)
- **Decision:** Mapster for entity ↔ DTO mapping.
- **Why:** Low boilerplate; source-generated; cheap at this domain size.
- **Rejected:** Manual mapping — zero deps but more hand-written code as DTOs grow.

### D3 — Direct EF Core, no generic repositories
- **Decision:** Application services use `IAppDbContext` directly. No `IRepository<T>`.
- **Why:** PRD §11.3/§19.1. Fewest abstractions; still testable through the interface.
- **Rejected:** Generic repository (PRD explicitly says push back); per-aggregate repos
  (unnecessary now — revisit only if a query becomes genuinely complex).

### D4 — orval codegen from day one
- **Decision:** Frontend API client = orval-generated (typed client + TanStack Query hooks +
  Zod) from the runtime OpenAPI document.
- **Why:** Tightest backend↔frontend feedback loop; the generated client *is* the contract.
- **Rejected:** Hand-written client (drift risk); openapi-typescript types-only (kept as the
  documented **fallback** if orval proves heavy).
- **Time-box (guard):** if orval is not generating a clean client by the end of **S1.2**,
  switch to the openapi-typescript + thin-fetch fallback. Do not spend more than **half a
  day** fighting client generation. The feedback cycle outranks the tool choice.
- **Consequence:** `lib/api/` is generated, never hand-edited; `just gen-client` regenerates.

### D5 — Enums persist as ints, pinned values
- **Decision:** Store enums as integers (EF default). Pin explicit values in each enum;
  **never reorder or renumber**; append new members with the next free integer.
- **Why:** Simplest mapping; no `HasConversion` needed.
- **Rejected:** Strings (more readable in the DB, but the user chose ints); native PG enum
  types (painful migrations).
- **Risk & guard:** Reordering corrupts existing rows silently — enforced by the pinned-value
  convention (`04-conventions.md`) and code review.
- **Consequence:** The generated frontend client surfaces numbers; `lib/enums.ts` owns the
  int → label mapping.

### D6 — Application events auto-advance `JobLead.Status`
- **Decision:** When an Application is created or changes stage/status, `JobLead.Status` is
  updated through one explicit, unit-tested mapping function.
- **Why:** The dashboard/pipeline must reflect reality; one source of truth.
- **Rejected:** Independent statuses (lead view drifts from reality); derived/read-only lead
  status (more UI complexity than needed now).
- **Transition map** (single function, unit-tested in S3.2):

  | Application trigger | → `JobLead.Status` |
  |---------------------|--------------------|
  | created (convert-to-application) | `Applied` |
  | stage → `RecruiterScreen` / `TechnicalScreen` / `TakeHome` / `SystemDesign` / `HiringManager` / `Final` | `Interviewing` |
  | `mark-offer` (Offer) | `Offer` |
  | `mark-rejected` (Rejected) | `Rejected` |
  | `mark-ghosted` (Ghosted) | `Ghosted` |
  | stage/status → `Withdrawn` | `Withdrawn` |

- **`Archived` is terminal:** auto-advance never overwrites `Archived`; leaving it requires a
  manual unarchive. The map is keyed off the lead's *current* state, so it is idempotent.

### D7 — AI provider deferred to Phase 7
- **Decision:** `IAiAssistant` stays provider-agnostic; `MockAiAssistant` first; the one real
  provider (Anthropic vs OpenAI) is chosen at Phase 7.
- **Why:** App must work with no keys (PRD §16); no need to commit early. Org default leans
  toward the latest Claude models, which biases — but does not yet fix — the Phase 7 choice.
- **Status:** **Open** until Phase 7.

### D8 — CI deferred to Phase 8
- **Decision:** GitHub Actions added at S8.2 (build + test + Docker build + `gen-client` check).
- **Why:** Solo MVP; local `just test` suffices until polish (PRD marks CI "optional later").
- **Rejected:** CI from Delivery 1 (earlier breakage detection, but setup cost now); no CI
  (weaker portfolio signal).

### D9 — Manual data first; seed only if needed
- **Decision:** No seed/automation initially. Add toggleable dev seed at Phase 8 *only if*
  manual entry proves painful.
- **Why:** Don't build automation before the manual path is validated (PRD §5.4).
- **Trade-off:** Hand-crafting overdue/stale scenarios to test dashboard rules is tedious;
  accepted, revisited at S8.2.

### D10 — Frontend is host-only and self-contained
- **Decision:** The frontend never runs in Docker. Everything frontend lives under
  `frontend/` (own `package.json`, vite/orval config, `.env`, `.gitignore`) so it can move to
  its own repository unchanged. A production `frontend/Dockerfile` is added later *only if
  needed*, under `frontend/`.
- **Why:** User requirement — cleaner separation, independent deployment. Bonus: removes the
  Windows Docker bind-mount HMR risk entirely.
- **Rejected:** `careerops-web` Docker service (PRD §17) — couples frontend to backend infra.
- **Consequence:** PRD §17/§8/§5.5 deviations (see spec §8). Fresh-clone run is two commands.

### D11 — Compose runs Postgres + API; host `dotnet watch` for the inner loop
- **Decision:** `docker-compose` runs `careerops-postgres` + `careerops-api` (Docker-first
  fresh-clone proof). Daily backend dev uses `dotnet watch` on the host (`just api`) against
  the dockerized Postgres. Frontend always runs on the host via Vite (`just web`).
- **Why:** Keeps the PRD Docker-first guarantee while giving a fast, native inner loop with no
  bind-mount file-watching pain.
- **Rejected:** Postgres-only in Docker (weakens the containerized-API proof); rebuild/restart
  the api container to iterate (slowest loop); full dev-compose with bind-mount watch (Windows
  HMR flakiness).

---

### D12 — Delete behavior: cascade-clean + archive-first UI
*(2026-06-19, from external PRD review)*
- **Decision:** Hard delete stays in the API, but a parent delete is a **clean** operation:
  - FK children (e.g. `Application` → `Interview`) cascade-delete.
  - **Loose-reference** children (`FollowUpTask`, `AiAnalysis`, which carry an
    `EntityType`/`EntityId` discriminator and **no** FK) are removed in the **same
    application-service operation** as the parent — no orphan rows left behind.
  - The **UI prefers Archive over Delete** for `JobLead` and `Application` (set status to
    `Archived`/terminal) and surfaces hard delete only as a deliberate, confirmed action.
- **Why:** Polymorphic references + hard delete would otherwise orphan rows pointing at dead
  ids. Cascade-clean keeps data consistent without introducing soft delete (PRD §13).
- **Rejected:** Block delete when children exist (more friction); plain hard delete accepting
  orphans (data-integrity bug).

### D13 — Manual AI Prompt Export added early (slice S3.4)
*(2026-06-19, from external PRD review)*
- **Decision:** Add a **Manual AI Prompt Export** slice **after S3.3** (end of Phase 3),
  *before* the Mock-AI phase. It assembles a copyable prompt (Analyze fit / Tailor resume
  bullets / Prepare interview topics) from the JobLead, profile, and resume variant — **no
  API key, no provider call, no stored analysis**.
- **Why:** The user is under active job-search pressure and already has a Claude subscription.
  This delivers AI leverage immediately at near-zero cost and matches PRD §16.2's
  `ManualPromptAssistant` / §12.8 `AiProvider.Manual`. Strictly simpler than provider
  integration, which correctly stays at Phase 7.
- **Consequence:** Prompt templates live in one place and are reused by `MockAiAssistant`
  (Phase 6) and the real provider (Phase 7) — no throwaway work.
- **Rejected:** Placing it after S2.2 (chosen later instead, so the core tracker is fully
  usable first); bringing real-provider AI forward (still deferred — App must work keyless).

---

### D14 — Target framework: .NET 10 (LTS)
*(2026-06-19, plan kickoff)*
- **Decision:** Backend targets **.NET 10** (LTS), C# latest, `Nullable` + `ImplicitUsings`
  enabled, warnings as errors.
- **Why:** Latest LTS (Nov 2025); modern Minimal APIs and built-in OpenAPI; longest support.
- **Rejected:** .NET 9 (STS, superseded, shorter support window).

### D15 — OpenAPI via built-in `Microsoft.AspNetCore.OpenApi` + Scalar
*(2026-06-19, plan kickoff)*
- **Decision:** The OpenAPI document is produced by the built-in
  `Microsoft.AspNetCore.OpenApi` at **`/openapi/v1.json`**; the browsable UI is **Scalar** at
  `/scalar/v1`. **orval reads `/openapi/v1.json`.**
- **Why:** .NET-native, fewer dependencies, keeps pace with the framework major; Scalar is a
  clean modern UI. orval only needs the JSON document.
- **Rejected:** Swashbuckle/Swagger UI — familiar `/swagger/v1/swagger.json`, but historically
  lags new .NET majors and adds a dependency we do not need.
- **Consequence:** Supersedes the `/swagger/v1/swagger.json` URL previously referenced in
  `05-feedback-loop.md` (updated in the same change). Endpoints still require explicit
  `operationId`s (D1) for clean orval output.

### D16 — Primary keys: `int` identity; `UserProfile` is a fixed singleton
*(2026-06-19, plan kickoff)*
- **Decision:** Entity primary keys are **`int`** (PostgreSQL `GENERATED … AS IDENTITY`).
  `UserProfile` is a **single row with `Id = 1`** (`ValueGeneratedNever`), get-or-created on
  first read.
- **Why:** Simplest readable keys for a single-user app; the profile is genuinely one row
  (PRD §12.9 "single local user profile").
- **Rejected:** `Guid` keys (no enumeration benefit needed for a local personal app; larger,
  less readable); a profile table with arbitrary ids (a singleton is clearer).

### D17 — `UserProfile` validation rules
*(2026-06-19, plan kickoff — PRD §20 omits UserProfile)*
- **Decision:** `FullName` required (≤200); `Email` valid email if present;
  `LinkedInUrl`/`GitHubUrl`/`PortfolioUrl` absolute http(s) URL if present;
  `TargetSalaryMin ≥ 0` if present; `TargetSalaryCurrency` 3-letter code if present.
- **Why:** PRD §20 lists no UserProfile rules; these are the minimal sensible guards consistent
  with the validation discipline used elsewhere.
- **Rejected:** No validation (lets bad data through, and the tracer bullet must exercise the
  `ProblemDetails` path).

### D18 — Pragmatic / tactical DDD (not full DDD, not anemic)
*(2026-06-19, working-rules setup)*
- **Decision:** Clean Architecture with **pragmatic/tactical DDD**: ubiquitous language,
  aggregates as consistency boundaries, state-transition behaviour on entities where it protects
  an invariant, value objects only when they remove real duplication. **No** repositories,
  MediatR/CQRS, or domain-event infrastructure until a slice needs them.
- **Why:** Matches PRD §11 ("pragmatic DDD") and KISS/YAGNI; preserves D3 (direct EF Core).
- **Rejected:** Strict/full DDD (repositories + domain events + MediatR — contradicts D3, adds
  ceremony); anemic-everywhere (loses the modeling benefit). Detail in
  `06-engineering-practices.md`.

### D19 — CLI-first for project, dependency, and migration operations
*(2026-06-19, working-rules setup)*
- **Decision:** Use the `dotnet` CLI for solution/project creation, references, NuGet packages,
  EF migrations, and the tool manifest; use `npm` / `npx` (vite, shadcn, orval) for frontend
  scaffolding, dependencies, and codegen. Do **not** hand-author `.sln`/`.csproj` package
  entries or `package.json` dependency versions.
- **Why:** Reproducible setup, correct version resolution, fewer transcription mistakes.
- **Rejected:** Hand-authoring project/dependency files (drift and version-mismatch risk).
- **Scope:** Source code and CLI-unowned config files are still hand-edited. Full detail in
  `06-engineering-practices.md`.

### D20 — Solution file is `.slnx` (XML), not classic `.sln`
*(2026-06-19, S0.1 execution)*
- **Decision:** The solution is `backend/CareerOps.slnx` — the XML solution format the .NET 10
  SDK now emits by default from `dotnet new sln`. Build/test/format target it directly
  (`dotnet build backend/CareerOps.slnx`); the `justfile` `sln` variable points at it.
- **Why:** It is the CLI default (consistent with D19 — the CLI owns the solution file), and is
  cleaner/diff-friendlier than the legacy `.sln`. Fully supported by the .NET 10 CLI and current
  IDEs/CI (GitHub Actions uses the dotnet CLI).
- **Rejected:** Forcing a legacy `.sln` for maximum tool familiarity — unnecessary churn against
  the SDK default; no concrete tool in our pipeline requires it.
- **Consequence:** Docs and the plan that said `CareerOps.sln` now read `.slnx`. The PRD §8
  folder diagram still shows `CareerOps.sln` (governed PRD body; the deviation is noted here and
  in the PRD amendment banner).

### D21 — Connection string is set per run context, not in `.env`
*(2026-06-19, S1.1 execution)*
- **Decision:** The DB connection string is **not** carried in `.env`. The host inner loop
  (`just api`) reads `appsettings.Development.json` → `Host=localhost`; the container
  (`just up`) gets a **literal** `Host=careerops-postgres` from `docker-compose.yml`'s
  `environment:` block (which overrides the Development appsettings inside the container).
  `appsettings.json` keeps `Host=careerops-postgres` as a safe default. The host API loop runs
  on **port 8080** (`launchSettings.json`), matching compose and `VITE_API_BASE_URL`.
- **Why:** the `justfile` uses `dotenv-load`, so any connection string in `.env` would be
  applied to **every** recipe — including the host loop, where `Host=careerops-postgres` does
  not resolve. Splitting by context keeps both the host loop and the container correct, with no
  per-recipe env juggling.
- **Rejected:** (a) connection string in `.env` = `careerops-postgres` — breaks `just api`;
  (b) `${ConnectionStrings__DefaultConnection}` interpolation in compose from `.env` — couples
  the container's value to the host file and reintroduces (a); (c) dropping `dotenv-load` —
  then `POSTGRES_*`/`ASPNETCORE_ENVIRONMENT` no longer reach compose/recipes reliably.
- **Consequence:** copy `.env` from the updated `.env.example` (no `ConnectionStrings__` line).
  compose vars also carry `:-` defaults so `just up` runs even without `.env`.

### D22 — CORS allows the host frontend origin (config-driven)
*(2026-06-19, S1.2 execution)*
- **Decision:** The API enables CORS for the frontend origin, read from `Cors:AllowedOrigins`
  in configuration. Development sets `http://localhost:5280` (Vite; 5173 was taken by another
  project, so the frontend uses a dedicated port). Empty/absent config means no cross-origin
  access (safe default).
- **Why:** the frontend is host-only on a separate origin (`:5280`) from the API (`:8080`,
  D10), so browser calls are cross-origin and require CORS. Config-driven keeps the origin out
  of code and ready for the frontend's eventual separate deployment.
- **Rejected:** `AllowAnyOrigin` (too permissive, and incompatible with credentialed requests
  later); hard-coding the origin in `Program.cs` (less flexible than config).

### D23 — Generated client uses server-authoritative validation (Zod not wired as form resolver)
*(2026-06-19, S1.2 execution)*
- **Decision:** orval generates the typed client, TanStack Query hooks, **and** Zod schemas
  (all committed). The profile form uses the generated hooks but relies on the API's
  FluentValidation (D17) for validation, displaying the returned 400 `ProblemDetails`. The
  generated Zod is available but **not** wired as the React Hook Form resolver yet.
- **Why:** the generated Zod encodes `number|string` unions (salary) and `iso.datetime`
  (deadline) that don't map cleanly onto string-based HTML inputs without coercion gymnastics;
  forcing it now would add fragile glue. Validation is already server-authoritative (D17), so
  the form stays simple and correct.
- **Rejected:** wiring `zodResolver(UpdateUserProfileBody)` now (coercion friction, little gain
  over server validation); hand-writing a parallel client schema (drift from the contract).
- **Consequence:** client-side Zod validation can be layered in later for snappier UX without
  backend changes. Note: malformed JSON not produced by the generated client returns 500 (not
  400) in Development — an accepted edge, since the generated client always sends valid bodies.

### D24 — Phase 2 search, filter, and dashboard counts are client-side
*(2026-06-19, Phase 2 planning / S2.1 execution)*
- **Decision:** `GET /api/job-leads` returns the full lead list; the Job Leads page filters
  (status, priority, title/company contains) and the Phase 2 dashboard placeholder counts leads
  **in the browser** over the fetched list. No server-side query params and no `/api/dashboard`
  endpoint in Phase 2.
- **Why:** the personal dataset is small (~30–50 leads); client-side keeps the fewest moving
  parts (no extra endpoint surface, no orval regen, instant UX) and matches the design's
  "simpler first" principle.
- **Rejected:** server-side filtering query params now (more endpoint surface + tests for no
  current benefit at this scale).
- **Escape hatch:** add optional query params to `GET /api/job-leads` and a real
  `GET /api/dashboard/summary` at Phase 5 if the list grows or the dashboard needs cross-entity
  aggregates (follow-ups, interviews, stale applications).

### D25 — JobLead create resolves company by CompanyId XOR NewCompanyName (find-or-create)
*(2026-06-19, Phase 2 planning / S2.2 execution)*
- **Decision:** `CreateJobLeadRequest` carries `int? CompanyId` and `string? NewCompanyName`;
  the service uses `CompanyId` when present, otherwise find-or-creates a `Company` by
  case-insensitive trimmed name (enums default to `Unknown`). Exactly one must be provided
  (validator). `UpdateJobLeadRequest` takes `CompanyId` only (required) — no inline create on edit.
- **Why:** PRD §12.2 fast-entry — entering 30–50 leads must not require a separate trip to the
  Companies page. A single atomic call avoids a two-round-trip race and dedupes companies by name.
- **Rejected:** two frontend round-trips (create company, then create lead) — duplicate-company
  risk + non-atomic; a dedicated find-or-create endpoint — more surface than needed.
- **Consequence:** `Company` stays required (PRD §20). Company resolution is set by the service,
  so the Mapster request→entity config ignores `CompanyId`.

### D26 — UI/UX overhaul ("Phase 2.5"): shadcn app shell + kanban board
*(2026-06-20, frontend slice between Phase 2 and Phase 3)*
- **Decision:** Adopt a shadcn **Sidebar** app shell and the shadcn component set across all current
  pages. Job Leads gets a **dnd-kit** kanban board (5 active columns + a "Show closed" toggle) plus a
  list view (URL-synced `?view=board|list`); dragging a card issues an **optimistic**
  `PUT /api/job-leads/{id}` status change (rollback + error toast on failure) — **no new endpoint**
  (reuses the Phase-2 PUT). Create/edit moves into **Sheet/Dialog** slide-overs, removing the
  full-page lead `new`/`:id` routes. Dashboard uses stat cards + a CSS pipeline bar. Frontend-only —
  no backend, API, or schema change.
- **Why:** user-directed modern UX; makes the app look finished now and shrinks Phase 8 `S8.1` to a
  top-up. Builds on the already-installed shadcn (`radix-nova`), whose theme already carries sidebar
  and chart tokens.
- **Rejected:** switching component libraries (shadcn already chosen, PRD §10.2); a dedicated
  status-PATCH endpoint (reuse PUT, D24/YAGNI); board-only with no list (loses dense scan);
  `@dnd-kit/sortable` (no intra-column order is persisted — `@dnd-kit/core` + `utilities` suffice).
- **Deferred (unchanged):** Recharts and a dark-mode toggle stay Phase 8 / backlog; the applications
  board arrives with Phase 3.
- **Notes:** `TooltipProvider` is mounted in `providers.tsx` (this shadcn sidebar version needs it for
  `SidebarMenuButton`'s tooltip). Per-task gate was typecheck + build + manual check — there is no
  frontend test runner (intentional; validation stays server-authoritative, D23).

---

### D27 — Applications board + list mirrors Job Leads
*(2026-06-20, Phase 3 / S3.2 execution)*
- **Decision:** The Applications view is a **board + list toggle** mirroring the Job Leads view
  (D26). Kanban columns are by `ApplicationStage`; active columns `Applied → Offer`; `Rejected /
  Ghosted / Withdrawn` behind a "Show closed" toggle. Dragging a card maps the target stage to the
  right action (`change-stage`, `mark-offer`, `mark-rejected`, `mark-ghosted`) and auto-advances
  `JobLead.Status` via the D6 transition map. Optimistic update + rollback + error toast, reusing
  the D26 pattern. **No new status-PATCH endpoint** — reuses existing action endpoints.
- **Why:** Consistent UX with Job Leads; the D26 board pattern is already established and tested;
  YAGNI on a dedicated PATCH.
- **Rejected:** Applications-only list (loses the pipeline scan); a new dedicated status endpoint
  (extra surface, no benefit over existing actions).
- **Consequence:** Frontend drag handler must map `ApplicationStage` integers to the correct
  action endpoint; `lib/enums.ts` owns the stage → label mapping (D5).

### D28 — Dedicated Tasks nav page (deviation from PRD §15.2)
*(2026-06-20, Phase 3 / S3.3 execution)*
- **Decision:** A **Tasks** nav item is added, deviating from PRD §15.2's nav list. It shows all
  `FollowUpTask` rows (pending/done filter, ad-hoc + entity-linked create, complete/skip). The
  dashboard gains **Today's actions** (due) and **Overdue** cards.
- **Why:** Follow-up tasks are a first-class workflow object (PRD §12.7, §18.4 "create a next
  action, see today's actions"); burying them under leads/applications only would hide them.
  A dedicated page + dashboard cards matches the stated acceptance criteria.
- **Rejected:** Tasks only visible from parent lead/application sheets (hard to scan across all
  tasks); embedding a full tasks list in the dashboard (too heavy for a card).
- **Consequence:** PRD §15.2 nav list is superseded; this entry records the deviation.

### D29 — Application creation is convert-only; ResumeVariant→Application delete is Restrict
*(2026-06-20, Phase 3 / S3.2 execution)*
- **Decision:** `POST /api/applications` (a freestanding create endpoint) is **omitted** (YAGNI).
  Applications are created exclusively via `POST /api/job-leads/{id}/convert-to-application`. The
  `ResumeVariant → Application` FK uses `OnDelete(Restrict)` — deleting a referenced variant is
  blocked and surfaced as a UI error. A **unique index on `job_lead_id`** enforces one application
  per lead in the baseline.
- **Why:** Every application in the real workflow starts from a lead; a freestanding create adds
  surface with no clear use case now. Restrict on ResumeVariant protects referential integrity
  without cascading deletes that would silently destroy application history. One-application-per-lead
  keeps the model simple for a single-user app.
- **Rejected:** `POST /api/applications` freestanding endpoint (YAGNI; adds surface); cascade
  delete on ResumeVariant→Application (would silently wipe application history); allowing multiple
  applications per lead (complicates queries and UI before any need is demonstrated).
- **Consequence:** The UI "Convert to application" button is the only creation path; lead must not
  already have an application (409 on duplicate).

### D30 — Phase 3 dashboard stays client-side; real /api/dashboard/summary deferred to Phase 5
*(2026-06-20, Phase 3 / S3.3 execution)*
- **Decision:** Phase 3 dashboard additions (Today's actions, Overdue, Active applications count)
  are computed **client-side** from already-fetched list endpoints, except `GET
  /api/follow-up-tasks/due` which is PRD-mandated. The real `GET /api/dashboard/summary`
  aggregate endpoint remains **Phase 5** (D24 escape hatch).
- **Why:** The dataset is small; client-side keeps the fewest moving parts (consistent with D24).
  The `/due` endpoint is the only cross-entity server-side aggregation needed now (it must apply
  `DueAtUtc <= now` on the server, not after a full fetch). Overdue is split from `/due` results
  client-side (`DueAtUtc < start-of-today`).
- **Rejected:** a new `/api/dashboard/summary` now (more surface + tests; PRD already defers it to
  Phase 5 via D24); pure client-side for `/due` (would require fetching all tasks and filtering
  client-side, masking overdue vs due distinction).
- **Consequence:** Phase 5 will add `GET /api/dashboard/summary` with cross-entity aggregates,
  stale-application rule, and interview countdown (D24 escape hatch).

### D31 — Manual AI prompt export is frontend-only; no AiAnalysis row
*(2026-06-20, Phase 3 / S3.4 execution)*
- **Decision:** The AI prompt export (D13) assembles the prompt **entirely on the frontend** from
  already-fetched data (lead, `UserProfile`, chosen `ResumeVariant`, defaulting to the default
  variant). Prompt templates live in `frontend/src/lib/aiPrompts.ts`. No backend call, no
  `AiAnalysis` row is created.
- **Why:** D13 intent is to deliver AI leverage immediately with zero backend cost; storing a
  prompt assembles nothing new to the user and adds schema work before it adds value. Templates
  in one place ensure Phase 6 (`MockAiAssistant`) and Phase 7 (real provider) reuse the same text.
- **Rejected:** Storing the assembled prompt as an `AiAnalysis` row now (premature; schema work
  deferred to Phase 6); a backend endpoint to assemble the prompt (no benefit over client-side
  at this stage, adds surface).
- **Consequence:** `lib/aiPrompts.ts` becomes the single source of prompt template text; Phase 6
  imports from it directly. No migration needed for S3.4.
