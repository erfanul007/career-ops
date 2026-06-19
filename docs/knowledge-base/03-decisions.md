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
