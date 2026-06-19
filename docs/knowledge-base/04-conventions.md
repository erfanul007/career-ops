# Conventions

Rules to follow while writing code. They keep the codebase consistent and protect the few
decisions that bite if ignored (notably enums-as-int).

## Language & docs
- **English** for all code, configs, identifiers, comments, and technical docs.
- Markdown (`.md`) for docs.

## Database

- **Naming:** `snake_case` tables and columns via `EFCore.NamingConventions`
  (`optionsBuilder.UseSnakeCaseNamingConvention()`). Tables plural: `companies`, `job_leads`,
  `resume_variants`, `contacts`, `applications`, `interviews`, `follow_up_tasks`,
  `ai_analyses`, `user_profiles`.
- **Timestamps:** UTC only, `timestamptz`. Column + property names end in `AtUtc`
  (`CreatedAtUtc`, `UpdatedAtUtc`, `DueAtUtc`, …). Never store local time.
- **Migrations:** EF Core code-first, committed to git, one per slice. Never edit an applied
  migration — add a new one.
- **Modeling:** simple relational. No JSON columns in the baseline (PRD §13). No soft delete.
  Delete is **cascade-clean** (Decision D12): deleting a parent removes its FK children
  (cascade) and its loose-reference children (`FollowUpTask`, `AiAnalysis`) in the same
  application-service operation — never leave orphan rows. The UI prefers **Archive over
  Delete** for `JobLead`/`Application`.
- **Seed:** none until Phase 8, and only if enabled by env (Decision D9).

## Enums — CRITICAL (Decision D5)

Enums persist as **integers** (EF default — do **not** add `HasConversion<string>`).

- **Pin every value explicitly. Never reorder. Never renumber. Append only.**

```csharp
public enum JobLeadStatus
{
    Discovered = 0,
    Interested = 1,
    Applied    = 2,
    Interviewing = 3,
    Offer      = 4,
    Rejected   = 5,
    Ghosted    = 6,
    Withdrawn  = 7,
    Archived   = 8,
    // new members append with the next free integer — e.g. OnHold = 9
}
```

Reordering or renumbering silently corrupts existing rows. Code review must reject any PR
that changes an existing enum member's integer value.

Enum members are defined exactly as the PRD §12 lists them, in PRD order (so the first
member is `0`).

## Timestamps & time
- Never call `DateTime.UtcNow` in application/domain code — inject `IClock` (`UtcNow`,
  `Today`). This keeps dashboard rules (due/overdue/stale/upcoming) deterministic and testable.
- `CreatedAtUtc` / `UpdatedAtUtc` are set centrally in `SaveChangesAsync`, not per service.
- **Local-time input/display contract** (prevents confusing "due today" behavior):
  - The API stores and returns **UTC** only.
  - The UI accepts **local** date/time, converts to UTC before sending, and renders UTC back
    to local with date-fns.
  - A **date-only** follow-up/interview (no time entered) defaults to **09:00 local** before
    UTC conversion — consistently, so "due today" lines up with the dashboard's
    `due_at_utc <= now` / `< start_of_today` rules (PRD §21). 09:00 is adjustable in one place.

## Validation
- FluentValidation validators in `Application`, one per write DTO, named `<Dto>Validator`.
- A Minimal-API endpoint filter runs validation before the handler and returns
  `ValidationProblemDetails` (400) on failure. Rules follow PRD §20.

## API error envelope (RFC 7807 `ProblemDetails`)

| Situation | Status | Body |
|-----------|--------|------|
| Validation failure | 400 | `ValidationProblemDetails` (per-field errors) |
| Entity not found | 404 | `ProblemDetails` |
| Invalid state transition / conflict | 409 | `ProblemDetails` |
| Unhandled exception | 500 | `ProblemDetails` (no stack trace, no secrets) |

One consistent shape so the generated frontend client handles errors uniformly. Secrets and
API keys are **never** logged (PRD §19.3).

## Minimal-API conventions (Decision D1)
- One endpoint module per resource: `MapCompanies(this RouteGroupBuilder)`, etc., grouped
  under `/api/<resource>`.
- **Every endpoint sets an `operationId`** via `.WithName("GetJobLeads")` — orval uses it to
  name generated hooks. Without it the generated client is unreadable.
- Tag endpoints (`.WithTags(...)`) so the OpenAPI document groups them.
- **OpenAPI** comes from the built-in `Microsoft.AspNetCore.OpenApi` at `/openapi/v1.json`
  (orval's source); the browsable UI is **Scalar** at `/scalar/v1` (Decision D15).
- **Api-layer folders** (Minimal APIs, so no `Controllers/`): `Endpoints/` (one module per
  resource), `Filters/` (e.g. the validation filter), `Middleware/`, `Extensions/` (DI
  composition), `HealthChecks/`.

## DTOs & mapping (Decision D2)
- Request/response DTOs live in `Application/<Aggregate>`. Suffix: `...Request`, `...Response`,
  `...Dto`.
- Mapster `IRegister` configs in `Application/Common/Mapping`; no mapping logic inline in
  endpoints.

## Backend folders (PRD §24)
Per aggregate inside each layer: `Companies/`, `JobLeads/`, `Applications/`, `Interviews/`,
`Contacts/`, `ResumeVariants/`, `FollowUps/`, `Ai/`, `UserProfiles/`, `Common/`
(+ `Dashboard/`, `Settings/` in Application; `Persistence/`, `Ai/`, `Time/` in Infrastructure).

## Frontend conventions
- `lib/api/` is **orval-generated — never hand-edit**. Regenerate with `just gen-client`.
- `lib/enums.ts` maps integer enum values → display labels (and badge colors). Single place
  the UI translates the numeric enums the client surfaces.
- Data access only through generated TanStack Query hooks. Forms: React Hook Form + Zod
  (Zod from orval where available).
- Dates/numbers formatted by **locale** at display time (per org policy): never hardcode
  separators; ISO 8601 stays in technical contexts (APIs, logs). Default display locale
  `en-GB`; UTC values converted to local only in the UI via date-fns.
- Feature code under `features/<area>/`; routed pages under `pages/`; shared UI in
  `components/`. Structure stays self-contained so `frontend/` can become its own repo.

## Polymorphic references (no FK)
`FollowUpTask.RelatedEntityType`/`RelatedEntityId` and `AiAnalysis.EntityType`/`EntityId` are
loose references (enum discriminator + id), **not** EF foreign keys. Resolve them in the
application service when needed. Keep them nullable/`None` where unrelated.

Because these have no FK, EF cannot cascade them. When a referenced parent is deleted, the
parent's application service **must delete the matching loose-reference rows in the same
operation** (Decision D12) — otherwise they orphan. Centralize this in a small helper so
every delete path uses the same cleanup.

## Money & salary
Store `decimal` amounts + a 3-letter currency code string + a period enum. No currency
conversion in the baseline. Format by locale on the frontend.

## Git
- Commit per slice (and per meaningful step within a slice). Conventional-commit style
  subjects. Migrations committed with the slice that introduces them.
- Branch off `main` for feature work; never commit secrets or `.env`.

## Implementation guardrails (seed for `CLAUDE.md`)

These rules are copied verbatim into `CLAUDE.md` during S0.1 (alongside the PRD §9.2
instructions). They are the standing rules for any coding agent:

```text
Do not optimize for theoretical SaaS users.
Do not add infrastructure unless a current slice requires it.
Every slice must be usable from the UI and pass `just verify`.
Prefer archive/status changes over destructive delete in UX.
On delete, clean up loose-reference rows (FollowUpTask, AiAnalysis) — no orphans.
If orval blocks progress for more than half a day, use the documented fallback.
Add the manual AI prompt export (S3.4) before any real AI provider integration.
Never reorder or renumber an existing enum member's integer value.
Inject IClock; never call DateTime.UtcNow directly in app/domain code.
Use the dotnet CLI for project/solution/package/migration ops and npm/vite/shadcn/orval for
frontend scaffolding and deps — do not hand-author .sln/.csproj or package.json versions (D19).
Follow Clean Architecture + pragmatic/tactical DDD: no repositories, MediatR, or domain-event
infra until a slice needs them (D3, D18).
Clean code: KISS and YAGNI; no dead code, commented-out code, or needless comments; small
focused files; comment the non-obvious why, never the what.
No silent decisions: debate the better option, ask when unclear, and log every decision in
03-decisions.md.
Push back on: auth, multi-user, MediatR/CQRS, generic repositories, RabbitMQ/Redis/
Kubernetes, scraping, browser extension, calendar/email, vector DB/RAG, file upload —
before the personal-use baseline works (PRD §7.3, §19.1).
```
