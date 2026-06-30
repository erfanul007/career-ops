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
- **Status:** **Resolved by D51 (2026-06-22)** — no AI provider will ever be added to the
  solution; AI lives entirely in external agents that consume the MCP. Phase 7 dropped.

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

---

### D32 — `EnteredInterviewStage` forward-only in `JobLeadStatusTransitions.Advance`
*(2026-06-20, Phase 4 / S4.1 execution)*
- **Decision:** The `EnteredInterviewStage` status (entered when an `Interview` is created,
  D6 transition map trigger) is **forward-only**: `JobLeadStatusTransitions.Advance` accepts
  it only from `Discovered`, `Interested`, or `Applied` states. No regression from `Offer` or
  closed states.
- **Why:** Fixes a latent Phase-3 bug where an out-of-order interview creation on a
  `Ghosted` or `Rejected` lead would incorrectly advance it back to `Interviewing`. The
  forward-only guard ensures state transitions are monotonic.
- **Rejected:** Allowing the transition from any state (weaker guard); blocking interviews
  on leads that have closed/rejected (would conflict with a real workflow where an interview
  is scheduled *before* a rejection lands).
- **Consequence:** The `JobLeadStatusTransitions` test suite grows to cover the forward-only
  guard.

### D33 — Creating an Interview auto-advances the parent lead (not the application)
*(2026-06-20, Phase 4 / S4.1 execution)*
- **Decision:** When an `Interview` is created (POST endpoint or derived object creation),
  the parent `Application` stays in its current stage/status. The parent `JobLead.Status` is
  auto-advanced via D6/D32 (triggered by the presence of an Interview). The interview's own
  status is always initialized to `Scheduled`.
- **Why:** D6 defines auto-advance as an Application-event concern; an Interview creation is
  a downstream event. The lead advances (to `EnteredInterviewStage` if applicable), not the
  application. This cleanly separates concerns.
- **Rejected:** Also advancing the Application stage (conflates two different lifecycle
  events); only advancing the Interview itself (ignores D6's lead-centric advancement).
- **Consequence:** Interview creation does not emit Application-level state changes; D6
  remains the sole declarative map of Application → lead advancement.

### D34 — `mark-completed` auto-creates a linked `FollowUpTask` when flagged
*(2026-06-20, Phase 4 / S4.1 execution)*
- **Decision:** `POST /api/interviews/{id}/mark-completed` accepts
  `MarkInterviewCompletedRequest(Outcome, Feedback?, FollowUpRequired, FollowUpAtUtc?)`.
  When the interview transitions into `Completed` for the **first time** AND `FollowUpRequired`
  is `true` AND `FollowUpAtUtc` is provided, it creates **one** `FollowUpTask`:
  `RelatedEntityType.Interview`, `RelatedEntityId = interview.Id`,
  `DueAtUtc = FollowUpAtUtc` (caller-supplied — there is no default offset),
  `Status = Pending`, `Priority = Medium`,
  title `"Follow up — {RoundType} interview"`.
  Re-completing an already-`Completed` interview is **silently skipped** — no duplicate task
  is created and no user-facing message is returned. The "first completion" check is
  `Interview.Complete(...)` returning a `bool`.
- **Why:** The user's real workflow is: interview → thank-you note due in N days → reflect on
  feedback → next interview prep. This captures the common case of "I interviewed, now I need
  a follow-up" without requiring a separate create call. The silent-skip on re-completion
  prevents duplicate tasks without surfacing a confusing error.
- **Rejected:** Auto-creating always (user must opt in); requiring a separate FollowUpTask
  create call (extra friction); returning an error on re-completion (the operation is
  idempotent from the user's perspective).
- **Consequence:** Interview and FollowUpTask are linked polymorphically; tests cover
  first-completion follow-up creation, re-completion silence, and the no-follow-up path.

### D35 — Multi-level delete cascade-clean via `FollowUpCleanup`
*(2026-06-20, Phase 4 / S4.1 execution)*
- **Decision:** When a parent entity is deleted (JobLead, Application, Interview), a
  `FollowUpCleanup` service scans and removes any loose `FollowUpTask` rows that reference
  the deleted entity or its children (e.g., deleting an Application removes interviews + all
  interviews' follow-ups). The operation is **atomic within a transaction** — either all
  orphans are cleaned or none are. FK children (e.g. Interview → Application) cascade-delete
  in the DB; polymorphic children (`FollowUpTask`) are cleaned in code.
- **Why:** Closes the pre-existing orphan gap (D12); ensures no dangling follow-up rows after
  a complex delete (lead → application → interview hierarchy). A single cleanup service is
  DRY and testable.
- **Rejected:** Orphaning loose rows (violates D12); a trigger per entity (harder to test);
  separate cleanup calls per entity type (more surface).
- **Consequence:** Delete tests verify that orphans are cleaned; the Cleanup service is
  injected into JobLead, Application, and Interview delete handlers.

### D36 — `Application → Interview` FK OnDelete Cascade
*(2026-06-20, Phase 4 / S4.1 execution)*
- **Decision:** The foreign key `Interview.ApplicationId → Application.Id` uses
  `OnDelete(Cascade)`. Deleting an Application hard-deletes all its Interviews in the DB,
  and the delete handler then runs `FollowUpCleanup` to remove orphaned follow-ups.
- **Why:** An interview without an application is nonsensical (inherently child of the
  application). Cascade is the right semantic for a hard delete workflow (D12). Cascade +
  cleanup is simpler than Restrict + UI flow (and matches the PRD's delete-allowed stance).
- **Rejected:** `OnDelete(Restrict)` (would require a separate delete-or-unlink step in the
  UI); orphaning interviews (violates the cascade-clean principle).
- **Consequence:** DB-level cascade is enforced by the EF migration; the delete handler still
  runs cleanup on the remaining loose references.

### D37 — Global `MutationCache.onSettled → invalidateQueries()` is the single cross-entity sync
*(2026-06-20, Phase 4 / S4.1 execution)*
- **Decision:** A global TanStack Query mutation cache hook (`MutationCache` with
  `onSettled` callback in `frontend/src/app/providers.tsx`) invalidates all queries when
  any mutation settles (succeeds or fails). Existing per-mutation invalidation logic in
  individual hooks is **left as harmless redundancy** (not removed).
- **Why:** Interviews touch Interview queries, Application queries (via cascade checks), and
  FollowUpTask queries (if auto-created). A blanket invalidation avoids coupling each mutation
  to the list of entities it might affect. Trade-off: overfetching on some mutations (e.g.,
  marking an interview completed re-fetches all interviews + all follow-ups), accepted for
  the personal single-user baseline. Scaling would revisit (targeted invalidation via
  optimistic updates or server-side sync hints).
- **Rejected:** Hyper-granular per-mutation invalidation logic (maintenance burden as the app
  grows); no syncing (leads to stale caches and confused UI).
- **Consequence:** Frontend mutation code is simpler; query staleness is prevented at the cost
  of broader refetches.

### D38 — Strategy pattern assessed for interview/transition logic; rejected (KISS)
*(2026-06-20, Phase 4 / S4.1 execution)*
- **Decision:** Interview creation and status transitions do not use the Strategy pattern
  and do not use a `GetTransitionHandler()` switch or any handler registry. The existing
  static `JobLeadStatusTransitions.Advance` switch-map plus small `InterviewService`
  methods suffice for the baseline.
- **Why:** Interview transitions are not complex: create (initialize to Scheduled),
  mark-completed (update status, optional follow-up). Each is a small, direct method;
  no indirection layer is needed. KISS: no abstraction until a real complexity (e.g.,
  parallel approval workflows) appears (YAGNI, D18 pragmatic DDD).
- **Rejected:** Full Strategy pattern (adds ceremony and polymorphic types for no current
  benefit); a handler registry / `GetTransitionHandler()` switch (assessed and not built —
  the direct method calls are clearer); cascading if-statements (less readable than the
  existing switch-map).
- **Consequence:** `InterviewService.cs` is a modest service, not a mini-framework. Tests
  cover the transition routes and their side effects (D32/D33/D34/D35/D36).

---

### D39 — Dashboard reads a single `GET /api/dashboard/summary`; UI components are presentational
*(2026-06-21, Phase 5 / S5.1 execution)*
- **Decision:** The dashboard reads a single `GET /api/dashboard/summary` endpoint returning
  a complete `DashboardSummaryDto`. `TodaysActions` and `UpcomingInterviews` become
  presentational components (data via props). Standalone `/api/follow-up-tasks/due` and
  `/api/interviews/upcoming` endpoints are retained — their own pages continue to use them.
- **Why:** One read-only aggregate endpoint is the single source of truth for the dashboard,
  eliminating client-side aggregation and simplifying cache invalidation (D37). Standalone
  endpoints stay separate to serve their own dedicated pages without duplication.
- **Rejected:** Multiple endpoints fetched client-side (cache-invalidation coupling; D37
  mitigation gets complex); freestanding presentational components with no props (forces
  client-side logic back into the component).
- **Consequence:** The dashboard endpoint has no DB-backed integration test because the
  Testing environment runs without a database (existing convention); `DashboardServiceTests`
  covers the logic, and an OpenAPI-presence integration test covers wiring.

### D40 — Follow-ups are a non-overlapping partition: overdue vs due-today via `IClock`
*(2026-06-21, Phase 5 / S5.1 execution)*
- **Decision:** Follow-ups are partitioned as non-overlapping sets: `OverdueFollowUps` =
  `Pending AND DueAtUtc < startOfToday`; `FollowUpsDue` (today) = `Pending AND startOfToday <= DueAtUtc <= now`.
  `startOfToday` is computed in UTC via `IClock.Today.ToDateTime(TimeOnly.MinValue)`. This
  refines the prior dashboard behavior that could double-list overdue items in both cards.
- **Why:** The PRD §21 field names mandate this semantic: "overdue" must be strictly before
  today, and "due today" must be today-only. The prior client-side split was imprecise and
  "complete and polish the dashboard" is this phase's explicit mandate (D30).
- **Counterargument:** Changing the follow-up partition alters the current card behavior,
  but it is an objective correctness fix matching the field names, and the phase intent is
  to deliver a polished, rule-correct dashboard.
- **Implementation note:** The `startOfToday` value passed to the EF query must be UTC-kinded
  (`clock.Today.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc)`) because Npgsql rejects
  Unspecified-kind `DateTimes` as `timestamptz` parameters; the EF-InMemory unit tests
  cannot catch this, so the controller smoke test is the guard.
- **Consequence:** `DashboardServiceTests` covers the partition boundary (overdue vs
  due-today, exact `startOfToday` semantics).

### D41 — `LeadsByStatus`/`ApplicationsByStage` are typed count lists, not dictionaries
*(2026-06-21, Phase 5 / S5.1 execution)*
- **Decision:** Status and stage counts are returned as typed lists (`IReadOnlyList<StatusCount>`
  and `IReadOnlyList<StageCount>`, where `StatusCount` is `(JobLeadStatus Status, int Count)`)
  rather than enum-keyed dictionaries.
- **Why:** Strongly typed (`StatusCount` records compile-time-verified); orval-friendly
  (generates clean TypeScript `{enum, count}` tuples without custom discriminators). The
  frontend loop-maps these to build the pipeline bar.
- **Rejected:** Enum-keyed dictionaries (orval struggles with enum keys; weaker type safety
  in TypeScript).
- **Consequence:** Frontend iterates the list to build charts/summaries; no need for custom
  orval dictionary codegen.

### D42 — Search-deadline `DaysRemaining` is a whole-day diff (UTC dates) via `IClock`
*(2026-06-21, Phase 5 / S5.1 execution)*
- **Decision:** `SearchDeadlineUtc` from `UserProfile` is rendered as a `DeadlineCountdown`
  record with `DaysRemaining = DateOnly.FromDateTime(deadline).DayNumber - clock.Today.DayNumber`.
  This is displayed as a header chip ("⏳ N days left" / "⏳ due today" / "⚠ N days over");
  the chip is hidden when `SearchDeadlineUtc` is null.
- **Why:** Days-remaining is a whole-day, locale-agnostic count; UTC dates avoid timezone
  confusion. The header chip is a prominent affordance for the user's primary timeline.
- **Rejected:** Rendering as a countdown timer (adds real-time updates; overkill for a
  whole-day metric); storing it as a separate counter field (redundant; compute on read).
- **Consequence:** The dashboard frontend renders the chip conditionally based on the
  presence of `SearchDeadline` in the response.

### D43 — "Recently updated" card dropped; replaced by Stale-applications card
*(2026-06-21, Phase 5 / S5.1 execution)*
- **Decision:** The "Recently updated" dashboard card is removed. It was not a PRD §14.2
  field and has no summary data (would require a separate "updated" timestamp aggregate).
  In its place, a new **Stale-applications card** displays applications matching the
  stale rule (PRD §21).
- **Stale rule:** `Active AND ((NextActionAtUtc is null AND UpdatedAtUtc < now-7d) OR (NextActionAtUtc < now))`.
  Two branches: leads with no next action that haven't been touched in 7+ days, or leads
  whose next action is overdue (now > NextActionAtUtc).
- **Why:** Stale applications are a key user-workflow signal ("which leads need attention?");
  "recently updated" offers no actionable insight and costs a new aggregate field. This
  rebalances the dashboard toward user priorities.
- **Rejected:** Keeping "recently updated" (no clear use case, no PRD mandate); card-less
  stale indicator (loses visibility).
- **Consequence:** The Stale-applications card uses `IReadOnlyList<ApplicationDto>` from
  the summary; the UI can link each application back to its lead.

### D44 — AI via an in-process MCP server (`CareerOps.Mcp`), stdio, official SDK
*(2026-06-21, Phase 6 / S6.1 delivery)*
- **Decision:** AI is delivered via an in-process MCP server (`CareerOps.Mcp`, stdio, official
  `ModelContextProtocol` SDK + `Microsoft.Extensions.Hosting`), tools wrapping existing Application
  services. **Supersedes** delivery-plan Phase 6 (`IAiAssistant`/`MockAiAssistant`) and Phase 7 (real
  provider + AI-provider settings), which are dropped. Satisfies the AI-features org policy as an
  agent-native capability; PRD §16 "AI optional, no keys" upheld. The `IAiAssistant` seam can be added
  later if an in-app provider is ever wanted.
- **MCP tool names are exposed in snake_case** (e.g. `get_dashboard_summary`, `create_follow_up`).
- **Why:** Agent-native AI is the preferred model for tool-use integration; MCP over stdio is
  standard and requires no network/auth (fits MVP). Avoids in-app provider complexity; the user
  drives AI workflows from Claude Code / Codex against their own data.
- **Rejected:** In-app `IAiAssistant`/`MockAiAssistant` (scope creep, provider-specific logic);
  HTTP transport (adds network/auth burden); in-process LLM (resource cost, latency).
- **Consequence:** No `IAiAssistant` interface or in-app provider. AI outcomes are persisted via
  agent **write-back** tools (D46).

### D45 — MCP tools = reads + curated writes; no hard deletes; string-enum I/O
*(2026-06-21, Phase 6 / S6.1 delivery)*
- **Decision:** MCP tools = **reads** (11 tools: dashboards, lists, details) + **curated writes**
  (12 tools: create/update/action endpoints). **No hard deletes** — archive/status only; `IClock`
  audit stamping retained through the services; **stdio-only** (no network, no auth). Enum I/O uses
  **string names** via `JsonStringEnumConverter` **PLUS** `TypeInfoResolver = new DefaultJsonTypeInfoResolver()`
  on the `JsonSerializerOptions` (a .NET 10 requirement); domain enum integer values stay pinned (D5).
- **Why:** Thin tools delegate to existing, tested services — zero new business logic. String enums
  are human-readable in MCP tool I/O; the converter + resolver ensures correct serialization.
  Curated writes match PRD §16 outcomes (fit analysis, interview prep, next actions); no cascading
  deletes in user workflows.
- **Rejected:** Hard deletes (breaks user workflow trust and audit trail, PRD §23); integers in
  enum I/O (opaque to the agent); write-all surface (invites API misuse; prune to declared use cases).
- **Consequence:** Tools reuse existing request records (`CreateJobLeadRequest`, `ChangeStageRequest`
  …) as typed input; the SDK builds each tool's schema from method signatures.

### D46 — AI output persisted via agent write-back tools; AiAnalysis store (S6.2)
*(2026-06-21, Phase 6 / S6.1 delivery)*
- **Decision:** AI output is persisted via agent **write-back** tools into an `AiAnalysis` store
  (no in-app provider inference), surfaced read-only in the UI (S6.2). S6.1 (this slice) delivers
  the MCP server + read + curated-write tools; S6.2 adds the `AiAnalysis` entity, `save_fit_analysis`
  and `save_ai_analysis` write-back tools, and UI read-only panels.
- **Why:** Decouples AI reasoning (in Claude Code) from persistence (in CareerOps). The agent is
  responsible for producing and storing output; the app is responsible for displaying it.
  Audit-friendly (every analysis is traceable to its origin timestamp and model). Supports ISO 42001
  compliance (AI management system traceability).
- **Rejected:** In-app inference (D44 supersedes this); no write-back (agent output is ephemeral,
  user must re-run to see results); storing prompts instead of results (shifts work to S6.2+ with
  no immediate value).
- **Consequence:** S6.2 will add `AiAnalysis` table, two write-back tools, and UI panels (no work
  in S6.1).

### D47 — MCP server hosted over HTTP in Presentation; `CareerOps.Mcp` console deleted
*(2026-06-21, Phase 6 / S6.1 delivery)*
- **Decision:** The MCP server is hosted inside the Presentation host over HTTP (`ModelContextProtocol.AspNetCore`, `WithHttpTransport()` + `app.MapMcp("/mcp")`); the separate `CareerOps.Mcp` stdio console is deleted. One deployable; tools live in `CareerOps.Presentation/Mcp/`. **Supersedes** D45's stdio-only/separate-host transport choice. D44 (agent-native AI via MCP, no in-app provider) and the rest of D45 (curated writes, no deletes, audit stamping, string enums) are unchanged. HTTP exposure is at parity with the already-unauthenticated REST API; public deployment of either requires auth (future).
- **Why:** One deployable — the `just up` API container already running *is* the MCP server; no separate console build/launch. Removes stdio workarounds (stdout reservation, stderr-only logging, `ContentRootPath` fix, duplicated `appsettings.json`). Per-request DI scope is native to ASP.NET Core.
- **Rejected:** Separate stdio console (D45's choice; still valid for isolated testing, but adds deployment complexity and duplicated secrets).
- **Consequence:** `.mcp.json` switches to HTTP; `just up` brings both REST and MCP online. MCP Inspector connects to `http://localhost:8080/mcp` by URL.

### D48 — Project rename: `CareerOps.Api` → `CareerOps.Presentation`
*(2026-06-21, Phase 6 / S6.1 delivery)*
- **Decision:** The host project `CareerOps.Api` is renamed to **`CareerOps.Presentation`** (Clean Architecture presentation layer) because it now serves REST **and** MCP uniformly. REST routes remain `/api/*`. The deploy artifacts rename too: compose service `careerops-api` → `careerops-app`, `deploy/docker/api.Dockerfile` → `app.Dockerfile`. Historical plan/spec docs keep the old name; living docs are updated.
- **Why:** "Api" implies REST-only; the host now serves both REST and MCP. `Presentation` is the conventional Clean Architecture layer name. Clearer intent for future contributors.
- **Rejected:** Keep "Api" (misleading; MCP is not REST); "Host" or "Server" (less specific).
- **Consequence:** Namespace changes to `CareerOps.Presentation`; csproj name updates; WebApplicationFactory still works (`Program` is in global namespace). Orval-generated client headers retain "CareerOps.Api" until the next `just gen-client` (no functional impact).

### D49 — MCP reaches **full REST parity, including hard deletes** (Slice 1 / S6.1 parity)
*(2026-06-21, Phase 6 / parity-slice1-mcp delivery)*
- **Decision:** MCP exposes **full REST parity** — ~20 new tools (44 total, including reads and writes) across all 7 resources: **Company** (list, get, create, update, delete), **ResumeVariant** (get, create, update, delete, make-default), **Application** (update, delete), **Interview** (update, delete), **FollowUpTask** (list, get, update, delete), **JobLead** (delete), **UserProfile** (update), plus **read tools** (dashboard, list/get leads, applications, interviews, follow-ups, variants, profile) and the `ping` diagnostic. **Supersedes D45's no-delete stance.** Each tool is a thin delegation to an existing Application service method. Hard deletes are safe: the service cascade-clean (FK children delete automatically; loose-reference rows like `FollowUpTask` and `AiAnalysis` are cleaned in the same operation, D35).
- **Why:** Achieving true agent parity: every operation the UI and REST API surface is available to the external agent. The agent can fully autonomously manage job search workflows (create/update leads, track applications, schedule follow-ups, etc.) without manual UI intervention. Thin tools delegate to tested services — zero new business logic.
- **Rejected:** Keeping D45's no-delete stance (blocks agent workflows; asymmetric parity); adding new delete logic (services already handle cleanup via D35).
- **REST completeness:** added `GET /api/follow-up-tasks/{id}` so MCP `get_follow_up` and REST agree (the service `GetAsync` exists; only the endpoint was missing).
- **Consequence:** MCP == REST for all 7 resources (UI parity follows in the next slice, D50). Tools use string enums (D45), audit-stamped writes (D44), HTTP hosting (D47). Full tool surface: **44 total** (16 reads + 1 diagnostic + 27 writes); the MCP README enumerates them by resource.

### D50 — JobLead AI fields become plain writable data slots; AiAnalysis write-back plan cancelled (Slice 2 / UI+data parity)
*(2026-06-21, Phase 6 / parity-slice2-ui delivery)*
- **Decision:** The JobLead AI-named fields (`FitScore`, `AiSummary`, `MissingKeywords`, `SuggestedResumeAngle`) are exposed as **plain writable data slots** in `UpdateJobLeadRequest` and `CreateJobLeadRequest` (shared UI form), editable in the lead form and via MCP `update_job_lead`. There is **no** in-platform AI analysis feature; the external agent writes findings into these slots and `Notes` / interview `PrepNotes`. **The earlier `AiAnalysis` entity / `save_fit_analysis` / AI-panel plan (D46) is cancelled.**
- **Why:** Simpler model: job-lead AI fields are ordinary form data, just like any other input. The agent (external) owns analysis; the app owns display. No new storage, no write-back tools, no persisted analysis history. The UI reflects agent writes live via global-invalidate (D37).
- **Rejected:** In-platform analysis storage (`AiAnalysis` entity, D46); read-only AI panels (adds UI complexity before the agent flow is proven); storing prompts instead of results (the agent must own its reasoning).
- **Consequence:** UI + REST + MCP achieve full parity for all 7 resources. Delete controls wired for Application, FollowUpTask, and JobLead (from board view). Read-only detail sheets added for Company, ResumeVariant, and Interview. Full UI = REST = MCP parity achieved.

### D51 — No AI provider in the solution, ever; MCP = REST parity; all AI in external agents
*(2026-06-22, scope lock)*
- **Decision:** CareerOps ships **zero** AI/LLM provider integration — the product has no
  in-solution AI capability. The **MCP server does exactly what the REST API does** (resource
  parity, no AI logic of its own); all AI/agentic capability is provided by **external
  agents/hosts** (Claude Code, ChatGPT, etc.) that consume the MCP. JobLead AI-named fields
  stay plain agent-writable data slots (D50). **Closes D7** (no provider will be chosen) and
  removes **Phase 7** (AI-provider integration) from the roadmap. **Supersedes PRD §16**'s
  provider / `MockAiAssistant` / Phase-7 plan. D44 (agent-native AI via MCP) and D50 (writable
  slots) stand. The frontend `AiPromptDialog` (clipboard prompt-export, no provider call —
  D13/D31) is unaffected: it is a convenience, not an AI capability.
- **Why:** User directive. Keeps the app provider-agnostic and key-free (no runtime AI deps,
  no key management, no provider lock-in) and cleanly separates concerns — the app owns data +
  workflow; external agents own reasoning. Matches the already-realized architecture
  (D44 → D46 → D50 evolution).
- **Rejected:** Choosing a provider at Phase 7 (D7's deferred plan — dropped); in-app inference
  (D44 already rejected it); a built-in "Analyze fit" button calling an LLM (re-introduces
  keys/cost/provider coupling).
- **Counterargument / risk:** Users without an MCP-capable agent get no in-app AI assist beyond
  the copy-paste prompt export; there is no one-click "analyze fit" inside the product.
  **Accepted** — CareerOps is positioned as an agent-consumable system of record, and the
  prompt-export (D13/D31) covers the keyless manual path.
- **Consequence:** No `Microsoft.Extensions.AI` / OpenAI / Anthropic SDK in the backend (none
  exists today — grep-confirmed). Phase 7 deleted from the roadmap. D7 marked resolved (pointer
  to D51). No code change required; this is a documented scope lock.

### D52 — Repo-wide doc/config cleanup to the no-in-solution-AI scope; historical specs rewritten fresh
*(2026-06-22, alignment pass following D51)*
- **Decision:** Aligned the whole doc/config corpus to D51 (no in-solution AI; MCP = REST parity;
  all AI in external agents). Changes: (1) removed the stale, unbound `AI__Provider` /
  `AI__OpenAI__ApiKey` / `AI__Anthropic__ApiKey` keys from `.env` (local); (2) rewrote PRD **§16**
  to "AI Integration (External Agents via MCP)" and deleted the `AiAnalysis` entity + `AiProvider`
  enum (§12), the AI REST endpoints (`analyze-fit`, `generate-prep`, `generate-referral-message`,
  `/settings/ai`), the `.env` AI example, the `Ai/` layer folders, and the AI-provider deliveries
  (Delivery 5–6, Epic 6–7) — replaced by the agent-native MCP delivery; (3) reconciled
  `01-architecture.md` (dropped `IAiAssistant`/`MockAiAssistant`, the `Ai/` folder, the diagram
  "AI"), `04-conventions.md` (dropped `ai_analyses`, the `AiAnalysis` loose-ref, the `Ai/`
  folders, reworded the guardrail), `02-delivery-plan.md` ("Mock AI provider tests" → MCP tool
  tests), and the verbatim guardrail block in both `04-conventions.md` and `CLAUDE.md`; (4)
  rewrote the three early historical specs (2026-06-19 delivery-plan-design, 2026-06-20 phase-3,
  2026-06-21 mcp-server-design) in place to the current scope.
- **Why:** User directive — the corpus should read "fresh" so no future reader or external agent
  infers the solution builds AI. **KEEP:** the JobLead data slots
  (`FitScore`/`AiSummary`/`MissingKeywords`/`SuggestedResumeAngle`), the frontend clipboard prompt
  export (`aiPrompts.ts` / `AiPromptDialog`, D13/D31), and every dated decision entry.
- **Overrides D48** ("leave historical superpowers plans/specs as-is") **for the three
  contradicting specs only**, on explicit user instruction. The 10 historical plans were already
  aligned (0 contradictions) and were left untouched.
- **Counterargument / risk:** Rewriting dated point-in-time specs erases the record of what was
  originally planned (the in-app AI path) — a document-control downside; the superseded-banner
  alternative was offered and the user chose in-place rewrite. The immutable decision log
  (D7 → D44 → D46 → D50 → D51) still preserves the full evolution, mitigating the loss.
- **Consequence:** No code change (backend already had zero provider — grep-confirmed); build and
  tests unaffected. A repo grep for `IAiAssistant|MockAiAssistant|AiProvider|analyze-fit|
  /settings/ai|AI__Provider` now returns only dated decision-log entries and explicitly
  superseded/negating context (e.g. the "Phase 7 … is dropped" banner).

### D53 — V2 MCP is a curated, workflow-oriented tool set over the Job aggregate (supersedes D49 parity)
- **Date:** 2026-06-29
- **Decision:** After Domain V2 unified `JobLead`/`Application`/`Interview` into the **Job aggregate**,
  the MCP server exposes a **curated, workflow-oriented** surface of **25 tools** built around the Job
  aggregate, follow-ups, companies, dashboard, profile, and a diagnostic — **not** the old
  seven-resource "full REST parity" set. The MCP README enumerates the live tools.
- **Why:** The V2 model has one job aggregate, not seven resources; "full REST parity" (D49) and the
  "MCP = REST parity" framing (D51) no longer describe the surface. Agents drive workflows
  (transition, activities, follow-ups), not CRUD over a wide resource matrix.
- **Supersedes:** D49 (44 tools / full parity / hard-delete parity) and the *parity wording* of D51.
  The no-in-solution-AI core of D51 (all AI lives in external agents via MCP, D44) still stands.
- **Cleanup deletes added this pass:** `delete_follow_up` and `delete_job_activity` (the only
  deletes agents need for self-correction); `delete_company` is deliberately excluded (company
  delete is already blocked while jobs exist).
- **Counterargument / risk:** REST and MCP are no longer 1:1, so an agent cannot reach every REST
  operation. Accepted — the curated set covers the real agent workflows; widening toward parity is
  explicitly rejected (re-introduces the churn V2 removed).

### D54 — Disable `react-refresh/only-export-components` for vendored shadcn `ui/**`
- **Date:** 2026-06-29
- **Decision:** Add an ESLint override turning off `react-refresh/only-export-components` for
  `src/components/ui/**`. Vendored shadcn primitives (`badge`, `button`, `sidebar`, `tabs`, …)
  export `cva` variant builders next to their components by design. Our own feature code still
  obeys the rule: the Jobs filter model (`JobFilters`, `DEFAULT_FILTERS`, `GroupBy` re-export)
  moved out of `JobFilterBar.tsx` into `src/features/jobs/jobFilters.ts`.
- **Why:** The rule's value (Vite fast-refresh) does not justify rewriting generated files on every
  shadcn update; the variant exports are intrinsic to those primitives. Keeping the rule on
  everywhere else preserves fast-refresh for code we author.
- **Rejected:** Splitting each primitive's variants into a sibling `*-variants.ts` file — churns
  vendored files and diverges from upstream shadcn output for no runtime gain.
- **Counterargument / risk:** Fast-refresh is silently weaker inside `ui/**` (edits there may force
  a full reload). Accepted — those files change rarely and are not where iterative UI work happens.

### D55 — Drop FluentAssertions; use native xUnit `Assert`
- **Date:** 2026-06-29
- **Decision:** Remove the `FluentAssertions` package and all `.Should()` usage from the test suite.
  Assert with the built-in xUnit `Assert` API (`Assert.Equal`, `Assert.Contains`, `Assert.True`,
  `Assert.Null`). Removed the central `PackageVersion`, the test-project `PackageReference`, and the
  PRD §10.1 stack entry. The 28 call sites across the 7 `CareerOps.IntegrationTests` files were
  converted in place.
- **Why:** FluentAssertions 8.x moved to a commercial licence; the default .NET 10 / xUnit assertions
  cover everything this suite needs. Fewer deps, no licence exposure (relevant under our regulated
  ISO 27001 posture).
- **Mapping used:** `Should().Be(x)` → `Assert.Equal(x, actual)`; `Should().Contain(s)` (string) →
  `Assert.Contains(s, actual)`; `Should().Contain(pred)` (collection) → `Assert.Contains(coll, pred)`;
  `Should().BeTrue()` → `Assert.True`; `Should().BeNull()` → `Assert.Null`; `Should().BeOneOf(a, b)` →
  `Assert.Contains(actual, new[] { a, b })`.
- **Rejected:** Shouldly / AwesomeAssertions (another fluent dep — contradicts "use default .NET 10
  capabilities"); pinning FluentAssertions ≤7 on the old licence (lingering licence/maintenance risk).
- **Not rewritten:** historical execution plans under `docs/superpowers/plans/` still show
  FluentAssertions — they are dated records of past work and are left as-is per the no-rewriting-history
  convention.
- **Counterargument / risk:** xUnit assertion messages are terser than FluentAssertions' on failure.
  Accepted — minor; this is an integration suite, not a sprawling unit surface.

---

### D56 — Per-aggregate repositories + `IUnitOfWork`; Application has zero EF Core dependency (supersedes D3 and the "no repositories" clause of D18)
- **Date:** 2026-06-29
- **Decision:** The Application layer no longer depends on EF Core. `IAppDbContext` (which exposed
  `DbSet<T>` and `CanConnectAsync`) is **deleted**. Application services now depend only on
  **aggregate/use-case repository interfaces** plus a one-method `IUnitOfWork` (`SaveChangesAsync`),
  all defined in Application and EF-free. Infrastructure owns every EF concern — `DbContext`,
  `Include`/`ThenInclude`, query composition, tracking, `FirstOrDefaultAsync`/`ToListAsync` — inside
  `CareerOps.Infrastructure.Persistence.Repositories`. `CareerOpsDbContext` implements `IUnitOfWork`
  (it keeps its concrete `DbSet<T>` properties for repositories and test seeding, but no longer
  implements an Application interface). The `Microsoft.EntityFrameworkCore` package reference is
  removed from `CareerOps.Application.csproj`.
- **Repository interfaces added (Application):** `ICompanyRepository`, `IUserProfileRepository`,
  `IFollowUpTaskRepository` (+ `FollowUpTaskFilter`), `IJobRepository` (reuses the existing
  `ListJobsQuery` as its filter), `IJobActivityRepository`, `IJobAttachmentRepository`,
  `IJobPropertyRepository`, plus two read models — `IJobTimelineReadRepository` (+ `JobTimelineData`)
  and `IDashboardReadRepository`. They are aggregate/use-case specific, never a generic
  `IRepository<T>`, and expose only the methods existing services actually call. `JobTransition`
  writes go through the `Job` aggregate root navigations (`job.Transitions.Add(...)`,
  `job.FollowUps.Add(...)`) rather than a transition repository; the dashboard/timeline reads are the
  only places that materialize cross-entity projections, hence the two dedicated read repositories.
- **Why:** Enforces a strict Clean Architecture boundary — Application depends on abstractions, not on
  EF Core. D3's own escape hatch ("revisit only if a query becomes genuinely complex") is met:
  `JobService.ListJobsAsync` carries a 16-clause dynamic filter and `DashboardService` composes five
  cross-entity aggregates. The codebase is well past the personal-use baseline (Domain V2, full MCP,
  polished dashboard), so the YAGNI guard D3/D18 imposed no longer applies. Query shape now lives in
  one layer; services read like use cases.
- **Supersedes:** **D3** ("Direct EF Core, no generic repositories" — Application used `IAppDbContext`
  directly) in full, and the **"No repositories … until a slice needs them"** clause of **D18**. The
  rest of D18 (pragmatic/tactical DDD, aggregates as consistency boundaries, no MediatR/CQRS, no
  domain-event infrastructure) **stands**. D5/D16 (enum/PK rules) and D2 (Mapster, still
  Application-side entity↔DTO mapping) are unaffected.
- **Rejected:** Generic `IRepository<T>` / Specification pattern (PRD §11.3/§19.1 push-back stands —
  these repos stay aggregate-specific); MediatR/CQRS and AutoMapper (no need, more ceremony);
  repositories that call `SaveChanges` internally (one `IUnitOfWork.SaveChangesAsync` per service
  operation keeps the unit-of-work boundary explicit); leaving `CanConnectAsync` in Application (the
  DB-reachability health check is an Infrastructure/Presentation concern — `DatabaseHealthCheck` now
  injects `CareerOpsDbContext` and calls `Database.CanConnectAsync` directly).
- **Counterargument / risk:** More types and one more layer of indirection than direct `IAppDbContext`
  access — exactly the ceremony D3/D18 set out to avoid. Accepted: the EF-free Application boundary is
  the explicit goal, the complex-query escape hatch is genuinely triggered, and the surface is kept
  minimal (no generic repo, fewest methods, read models only where projections are needed).
- **Behaviour preserved (refactor, not rewrite):** No change to API contracts, MCP tools, frontend,
  DTO shapes, migrations, or enum values. Query shapes, null/exception behaviour, and audit stamping
  (`CareerOpsDbContext.SaveChangesAsync` via `IClock`) are identical. Unit tests construct services
  with the real Infrastructure repositories over EF InMemory. Verified: `just verify` green —
  backend build + **72 tests** (56 unit + 16 integration), frontend typecheck + build + lint clean;
  greps confirm no `IAppDbContext`, `DbSet<`, `IQueryable`, or `Microsoft.EntityFrameworkCore` remain
  in `CareerOps.Application`.
- **Deferred cleanup:** the now-unused `Microsoft.EntityFrameworkCore` `<PackageVersion>` entry stays
  in `Directory.Packages.props` (harmless under central package management; other projects pull EF
  Core transitively via Relational/Npgsql/InMemory).

### D57 — Dev-only Vitest + React Testing Library harness for the frontend
- **Date:** 2026-06-30
- **Decision:** Add a frontend test harness — `vitest`, `@testing-library/react`, `@testing-library/jest-dom`,
  `jsdom` — as **dev-only** dependencies (installed via `npm --prefix frontend install -D`, per D19).
  Config: a `test` block in `vite.config.ts` (jsdom env, `globals`, `src/test/setup.ts`), `vitest/globals`
  added to `tsconfig.app.json` `types`, and `test` / `test:watch` scripts in `package.json`. Tests assert
  behaviour / accessibility / data presence — never Tailwind class strings; drag, sticky-scroll, responsive
  widths, and motion stay manual QA.
- **Why:** The Jobs UI polish work (spec `2026-06-29-careerops-jobs-ui-polish.md`) introduces a pure
  presentation helper module (`jobPresentation.ts`) and several recomposed components whose behaviour
  (card hierarchy, keyboard-open, overdue flagging, 3-tab structure, collapsible toggle) is worth
  regression-testing. The frontend previously had no test runner; the org rule "include tests with
  non-trivial changes" applies.
- **Scope / impact:** **Dev-only** — zero runtime/bundle impact; `vite build` output unchanged. `just verify`
  keeps its frontend gate (typecheck + build); `npm --prefix frontend run test` runs per task during the UI
  work and may be wired into `just verify` / CI later.
- **Supersedes:** the "no frontend test runner (intentional)" note in **D26** and the
  server-authoritative-only framing of **D23**, for **test tooling only** — both still stand for
  runtime/validation concerns.
- **Rejected:** runner in runtime deps (wrong scope); a heavier stack (Playwright / MSW) before any unit
  need (YAGNI — drag/responsive stay manual); staying typecheck+build-only (loses regression cover on the
  new pure helpers + recomposed components).
- **Counterargument / risk:** a new dev toolchain + config surface to maintain, and `tsc -b` now typechecks
  `*.test.tsx`. Accepted — small, conventional Vite + Vitest setup; tests are colocated and focused.

### D58 — Shared `PageShell`/`PageHeader` own page padding, width, and rhythm
- **Date:** 2026-06-30
- **Decision:** `AppLayout`'s content region is `min-h-0 flex-1 overflow-hidden` (no padding, no scroll);
  `PageShell` is the **sole** owner of page padding (`px-6 py-6`), centered width, scroll, and the
  `space-y-6` section rhythm. Two width tokens: `default` (`max-w-5xl`) for data/list/table/detail pages,
  `narrow` (`max-w-2xl`) for single-column forms. The Jobs board uses `variant="full"`
  (`flex h-full min-h-0 flex-col gap-4`) and keeps its own horizontal scroll. `PageHeader` owns the single
  page-title treatment (`text-xl font-semibold`) + optional description + an actions slot. Spec/plan:
  `2026-06-30-careerops-ui-alignment-restructure-*`.
- **Why:** Every page previously invented its own container (5 different widths, double-`p-6` on
  Dashboard/Tasks, `text-xl` vs `text-2xl` headings). Enforcing the container once makes alignment
  **structural** — pages cannot double-pad or drift again by construction. Highest-RoI, lowest-maintenance
  fix; no new dependencies.
- **Rejected:** per-page container fixes (drift returns); full-bleed everywhere (loses the calm,
  intentional reading width); a single app-wide width incl. the board (board needs full-bleed + horizontal
  scroll).
- **Counterargument / risk:** a shared shell is one more abstraction and a forced rhythm some pages might
  fight. Accepted — two tiny components, no ceremony, and the `width`/`variant` props cover the real cases.

### D60 — Jobs board overhaul: swimlane layout, DnD, grouping, priority endpoint, hard delete
- **Date:** 2026-06-30
- **Decision:** A set of locked design choices for the jobs board overhaul (spec `2026-06-29-careerops-jobs-ui-polish.md`):
  - **Board columns are always status.** Country/company/priority grouping produces horizontal Jira-style lanes; `groupBy='status'` is a single unbannered lane (`__all__`).
  - **Layout:** per-lane grids share one fixed column track (`--board-col: 18rem`); the status header row is sticky-top; lane banners are not sticky.
  - **DnD:** drag-and-drop changes status only and ignores cross-lane drops; it is enabled in all groupings. Droppable id is `${laneKey}::${status}`, parsed with `lastIndexOf('::')`.
  - **Hidden-columns ("Columns") menu** applies to all groupings; collapse store key `careerops:jobs:collapsed-lanes` is keyed `${groupBy}:${laneKey}` and shared between board and table views.
  - **Priority editing:** priority is editable inline via a dedicated `POST /jobs/{id}/priority` endpoint (full-PUT-from-card was rejected to avoid data loss); priority is shown as a chip on card, table row, and drawer; High keeps its destructive accent bar; priority colours use design tokens.
  - **Group-by-priority lane order:** High → Medium → Low.
  - **Hard delete:** available from card/row kebab menu and drawer behind a confirm `AlertDialog`; relies on the existing `FollowUpTask.Job` cascade (no orphans); distinct from the Archive status.
- **Additional notes:**
  - `@testing-library/user-event` added as a dev-only dependency (user-approved deviation from the no-new-deps guardrail; needed to drive Radix portal menus in jsdom — D57 harness).
  - **Deferred:** the generated API client has drifted from the live backend (new endpoints not reflected). A dedicated `gen:client` sync task (rebuild API + regen) is required as a follow-up; it is explicitly out of scope for this feature branch.
- **Why:** Gives the board real grouping flexibility without a column-redesign per grouping; a shared column track and one status-header row keeps the layout coherent. A dedicated priority endpoint avoids the data-loss risk of a full PUT from a partial card form. Hard delete (behind confirm) is the correct UX complement to Archive — soft-delete-via-status for workflow, hard delete for explicit removal.
- **Rejected:** full-PUT-from-card for priority (data loss risk); per-grouping DnD models (status is always the drop axis); lane banners sticky (they conflict with the sticky status header row); separate collapse stores for board and table (needless divergence).

### D59 — Calm design-token colors with one risk accent; status-dot legend retained
- **Date:** 2026-06-30
- **Decision:** Replace raw Tailwind palette classes (`text-red-500`, `bg-*-100`, etc.) and the `⚠` glyph
  across the changed pages/tables with design tokens and shadcn `Badge` variants; the single `destructive`
  token is the only accent, reserved for overdue/urgent (overdue uses the `TriangleAlert` icon). **Exception
  (intentional, not a miss):** the 9-way status-dot legend (`STATUS_DOT`/`STATUS_ACCENT` in
  `jobPresentation.ts`) is **retained** as a deliberate categorical encoding (Linear/Jira-style) — calming it
  to neutral would destroy at-a-glance column differentiation. Dashboard's three identical bordered rows were
  extracted into a shared `ListRow`; the **Tasks** row was **not** folded in (single instance, different
  shape — badge + two action buttons — so YAGNI).
- **Why:** Org "calm, no noisy colors" direction + design-token system + dark-mode correctness (raw `*-100`
  classes don't adapt). One accent keeps risk legible without noise.
- **Out of scope (tracked follow-up):** the `JobDetailDrawer` internals (`ActivitiesTab`, `TimelineTab`)
  still carry raw palette + a bare `toLocaleString` — deliberately left "as-is" by the restructure spec
  (just-polished). A later slice should tokenize them and route their dates through `lib/format.ts` so the
  "calm tokens + locale formatting everywhere" goal is repo-complete.
- **Rejected:** keeping semantic green/yellow/red badges (noisy, off-direction); calming the status dots too
  (loses categorical meaning).

### D61 — Pin `chrome-devtools` MCP version + raise `MCP_TIMEOUT`; harden `job-search` against silent fallback
- **Date:** 2026-07-01
- **Decision:** Two tooling fixes, after a `/jobsearch` run silently degraded to logged-out web search
  because the `chrome-devtools` MCP tools were absent for the whole session:
  1. **Config (root cause):** `.mcp.json` pins `chrome-devtools-mcp@1.4.0` (was `@latest`); new committed
     `.claude/settings.json` sets `env.MCP_TIMEOUT=60000`.
  2. **Skill:** `.claude/skills/job-search/SKILL.md` gains a **Preflight** gate (assert
     `mcp__chrome-devtools__*` is loaded before any LinkedIn/Glassdoor step) and a **no-silent-fallback**
     hard rule (if the logged-in path is unavailable, name the gap and ask permission — never quietly use
     guest `WebSearch`/`WebFetch` or a non-session browser).
- **Root cause (from MCP logs):** session-start spawn of `npx -y chrome-devtools-mcp@latest` cold-downloaded
  the package and exceeded Claude Code's hard 30 000 ms MCP startup timeout → server marked failed → tools
  absent all session (a warm reconnect took 1.7 s). `@latest` made this recur on every upstream release.
  Trust and `:9222` were never the problem (`chrome-devtools` was already in `enabledMcpjsonServers`).
- **Why:** Pinning removes the recurring re-download; the larger timeout covers one-time cold installs and
  Windows AV-scan latency; the skill changes stop the agent from masking a fixable connection failure with
  a lower-quality logged-out search. Skill edit verified TDD-style (control reproduced the silent fallback;
  both treatments stopped and asked).
- **Rejected:** Global pre-install of the MCP binary (adds a system dependency for little gain over pin +
  warm npx cache); leaving `@latest` (re-triggers the timeout on every release); soft "prefer logged-in"
  guidance in the skill (a prohibition + red flag binds under pressure where soft guidance does not).
- **Consequence:** Config changes take effect on the next session start / `/mcp` reconnect; the pinned npx
  cache was pre-warmed so the next spawn is fast. A future `chrome-devtools-mcp` bump is a deliberate edit
  to the pinned version here.

