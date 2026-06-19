# Architecture

Clean Architecture, applied pragmatically. The goal is a codebase that demonstrates clean
.NET engineering without ceremony the personal-use baseline does not need (PRD §5.3, §11).

## Layers & dependency rule

Dependencies point **inward only**. An outer layer may reference an inner layer; never the
reverse.

```
        ┌─────────────────────────────────────────────┐
        │  CareerOps.Api  (Minimal APIs, DI, middleware)│  composition root
        └───────────────┬───────────────┬──────────────┘
                        │               │
                        ▼               ▼
        ┌────────────────────┐   ┌──────────────────────────┐
        │ CareerOps.Infra-   │   │ CareerOps.Application      │
        │ structure          │──▶│ (use cases, DTOs, IAppDb-  │
        │ (DbContext, AI,    │   │  Context, IClock, IAi...)  │
        │  migrations, clock)│   └─────────────┬──────────────┘
        └────────────────────┘                 │
                                                ▼
                                   ┌──────────────────────────┐
                                   │ CareerOps.Domain          │
                                   │ (entities, enums, rules)  │
                                   └──────────────────────────┘

        CareerOps.Contracts — minimal / deferred (see below)
```

### Domain (`CareerOps.Domain`)
- Entities, enums, value objects (where genuinely useful), and domain rules that hold
  regardless of infrastructure.
- **No package dependencies** — no EF Core, ASP.NET, Npgsql. Pure C#.
- Folders by aggregate: `Companies/`, `JobLeads/`, `Applications/`, `Interviews/`,
  `Contacts/`, `ResumeVariants/`, `FollowUps/`, `Ai/`, `UserProfiles/`, `Common/`.

### Application (`CareerOps.Application`)
- Use-case / application services (e.g. `JobLeadService`), DTOs, FluentValidation
  validators, Mapster mapping config, dashboard query logic.
- Declares the interfaces it needs from the outside world:
  - `IAppDbContext` — exposes `DbSet<T>` properties + `SaveChangesAsync`.
  - `IClock` — `UtcNow`, `Today` (for deterministic dashboard-rule tests).
  - `IAiAssistant` — the AI contract (PRD §16.1).
- **May reference EF Core** (`Microsoft.EntityFrameworkCore`) to use `DbSet`, `IQueryable`,
  and async LINQ through `IAppDbContext`. It must **not** reference `CareerOps.Infrastructure`.
- **No generic repositories** (PRD §11.3, §19.1). Services query `IAppDbContext` directly.

### Infrastructure (`CareerOps.Infrastructure`)
- `CareerOpsDbContext : DbContext, IAppDbContext`, EF entity configurations, migrations, seed.
- AI provider implementations: `MockAiAssistant`, later one real provider.
- `SystemClock : IClock`.
- References Application + Domain.

### Api (`CareerOps.Api`)
- Composition root: DI registration, configuration, Serilog.
- Minimal-API endpoint modules (one `MapGroup` per resource), middleware, exception
  handling → `ProblemDetails`, Swagger/OpenAPI, health checks.
- References Application + Infrastructure.

### Contracts (`CareerOps.Contracts`) — minimal / deferred
- The frontend gets its types from the **runtime OpenAPI document via orval**, not from a
  shared .NET assembly. A shared DTO contract project therefore adds little in the baseline.
- Keep it empty/absent until a concrete need appears (PRD §11.5: "Do not overuse"). DTOs
  live in `Application`.

## The standard request flow

```
HTTP → Minimal-API endpoint (Api)
     → endpoint filter runs FluentValidation  → 400 ValidationProblemDetails on failure
     → application service (Application)
            → IAppDbContext (EF Core) read/write
            → Mapster maps entity ↔ DTO
            → IClock for timestamps / rule evaluation
     → returns DTO  → 200/201
exceptions → exception-handling middleware → ProblemDetails (404/409/500)
```

## Cross-cutting patterns

- **Error envelope:** RFC 7807 `ProblemDetails` everywhere. Validation → `ValidationProblemDetails`
  (400). Not found → 404. Conflict/invalid transition → 409. Unhandled → 500. One consistent
  shape for orval/the frontend. See `04-conventions.md`.
- **Auditing:** `CreatedAtUtc` set on add, `UpdatedAtUtc` on modify — centrally in
  `SaveChangesAsync` using `IClock`, not scattered through services.
- **Validation:** FluentValidation validators in Application, invoked by a Minimal-API
  endpoint filter so every write endpoint validates uniformly.
- **Time:** never call `DateTime.UtcNow` directly in services — inject `IClock`. Dashboard
  rules (due/overdue/stale/upcoming) depend on it and must be unit-testable.
- **Mapping:** Mapster `IRegister` configs in `Application/Common/Mapping`; registered in DI.

## Naming conventions (DB)

snake_case tables/columns via `EFCore.NamingConventions`
(`UseSnakeCaseNamingConvention()`), UTC `timestamptz`, ints for enums. Full rules in
`04-conventions.md`.

## Frontend architecture (host-only, separable)

Everything frontend lives under `frontend/` and never appears in Docker compose. It is
structured so it can move to its own repository unchanged.

```
frontend/src/
  app/         App.tsx, providers.tsx, router.tsx
  components/  ui/ (shadcn), layout/, shared/
  features/    dashboard, companies, job-leads, applications, interviews,
               contacts, resume-variants, follow-ups, settings, ai
  lib/         api/ (orval-generated — do not hand-edit), enums.ts, dates.ts,
               constants.ts, utils.ts
  pages/       one component per route
  styles/      globals.css
```

- **`lib/api/` is orval-generated** from the API OpenAPI doc — never hand-edit; regenerate
  with `just gen-client`.
- **`lib/enums.ts`** maps integer enum values → display labels (enums persist as ints, so the
  generated client surfaces numbers; the UI owns the labels).
- Data fetching through the generated **TanStack Query** hooks; forms via **React Hook Form
  + Zod** (Zod schemas also come from orval where possible).

## What we deliberately do NOT build (PRD §7.3, §19.1)

No auth, multi-user, MediatR/CQRS, generic repositories, RabbitMQ/Redis/Kubernetes,
background-job infrastructure, scraping, calendar/email integration, vector DB/RAG, file
upload, soft delete. Push back if asked to add these before the baseline works.
