# CareerOps — Delivery Plan & Architecture Design

- **Status:** Approved (2026-06-19); revised same day to incorporate an external PRD review
  (adds D12 delete behavior, D13 manual prompt export / slice S3.4, an orval time-box, the
  D6 transition table, a local-time input rule, and `just verify`).
- **Author:** Brainstormed with Claude Code
- **Source of truth for product scope:** `docs/CareerOps-PRD.md`
- **Living operational detail:** `docs/knowledge-base/`

This document is the point-in-time design record produced from the brainstorming
session on 2026-06-19. It captures the decisions, the re-sliced delivery plan, and
the risks. The `docs/knowledge-base/` folder holds the living, operational versions
of this content (architecture, conventions, feedback loop). When they drift, the
knowledge-base wins for day-to-day work; this spec records *why* we chose what we chose.

---

## 1. Problem & Goal

The user is in a job-search emergency and needs a personal command center to replace a
spreadsheet **fast**. The product must deliver usable value within the first few slices,
not after the whole MVP is built. The two explicit optimization targets for this design are:

1. **Faster delivery lifecycle** — small, independently shippable increments.
2. **Shorter feedback cycle** — every increment is runnable, reviewable, and (where it
   touches the domain) usable for real job tracking the same day it lands.

Everything below serves those two targets. Where the PRD left a choice "to the coding
agent," this design makes the choice explicitly rather than silently.

## 2. Guiding principle for this design

> **Simpler first.** Pick the approach that works now and can be improved later.
> Avoid abstractions, infrastructure, and ceremony that the personal-use baseline does
> not need yet (PRD §5). When two options both work, choose the one with fewer moving
> parts and a documented escape hatch to the heavier option.

## 3. Locked decisions

| # | Area | Decision | Rationale (short) |
|---|------|----------|-------------------|
| D1 | API style | **Minimal APIs**, one `MapGroup` module per resource | Less ceremony than controllers; modern .NET. Requires `operationId` discipline (see D4). |
| D2 | Mapping | **Mapster** | Low-boilerplate entity↔DTO mapping. |
| D3 | Data access | **Direct EF Core** in application services via `IAppDbContext`. No generic repositories. | PRD §11.3. Fewest abstractions; testable through the interface. |
| D4 | Frontend API client | **orval**, codegen from OpenAPI from day one (typed client + TanStack Query hooks + Zod) | Tightest backend↔frontend loop. **Time-boxed:** if not clean by end of S1.2 (½ day max), fall back to openapi-typescript. |
| D5 | Enum persistence | **Ints**, explicit pinned values, never reorder/renumber | EF default mapping; no `HasConversion` needed. Convention enforced in `04-conventions.md`. |
| D6 | Lead ↔ Application | Application events **auto-advance** `JobLead.Status` via one explicit mapping function (transition table in `03-decisions.md`; `Archived` terminal) | Dashboard/pipeline always reflects reality; single source of truth. |
| D7 | AI | Mock first; provider-agnostic `IAiAssistant`; real provider (Anthropic vs OpenAI) chosen at Phase 7 | App must work with no keys. Defer the provider commitment. |
| D8 | CI | GitHub Actions deferred to Phase 8 | Solo MVP; rely on local `just test` until polish. |
| D9 | Seed data | Manual data entry first; add seed only if manual proves painful (Phase 8) | Avoid building automation before the manual path is validated. |
| D10 | **Frontend deployment** | Frontend is **host-only**, fully self-contained under `frontend/`, never in Docker; separable to its own repo later | User requirement. Cleaner separation; also removes Windows bind-mount HMR risk. |
| D11 | **Dev runtime** | Compose runs **Postgres + API**. Daily backend loop = `dotnet watch` on host against dockerized Postgres. Frontend = host Vite. | Fresh-clone Docker-first proof + fast native inner loop. |
| D12 | Delete behavior | Cascade-clean: parent delete removes FK + loose-reference children in one op; UI prefers Archive over Delete | No orphan rows from polymorphic refs; no soft delete needed. |
| D13 | Manual AI export | New slice **S3.4** (after follow-ups): copyable prompts from JobLead/profile/resume — no key, no provider, no storage | Immediate job-search leverage; reuses templates at Phase 6/7. Matches PRD §16.2. |

## 4. Core strategy — vertical slices + a tracer bullet

The PRD groups work by feature area. This design re-slices each area into **thin vertical
slices**: every slice cuts top-to-bottom through entity → EF migration → Minimal-API
endpoint → orval-generated client → React page, and ends **runnable and demoable**. No
slice leaves a layer half-built.

The one deliberate upfront investment is a **tracer bullet** (`S1.2`): a trivially small
real feature taken fully end-to-end *before any real domain work*, to prove the entire
toolchain (EF migration, Minimal-API OpenAPI output, orval generation, React Query wiring,
Postgres persistence, the dev loop). This de-risks every later slice so they become pure
feature work.

## 5. Re-sliced delivery plan

Full per-slice scope, acceptance, and Definition of Done live in
`docs/knowledge-base/02-delivery-plan.md`. Summary mapping back to PRD deliveries:

| Phase | PRD | Slices | First usable value |
|-------|-----|--------|--------------------|
| 0 Foundation | D0 | S0.1 skeleton + docs + tooling | — |
| 1 Walking skeleton | D1 | S1.1 compose up + health; **S1.2 tracer bullet (UserProfile e2e)** | toolchain proven |
| 2 Job Leads | D2 | S2.1 Company; **S2.2 JobLead** ← replaces spreadsheet; S2.3 filters + dashboard counts | track real leads |
| 3 Applications + Follow-ups | D3 | S3.1 ResumeVariant; S3.2 Application + convert + status actions; **S3.3 FollowUpTask + today's actions**; **S3.4 Manual AI prompt export** | track applications + next actions; instant manual AI |
| 4 Interviews | D4 | S4.1 Interview e2e + dashboard upcoming | track interviews |
| 5 Dashboard completion | (D2–D4 tail) | S5.1 full summary (stale rule, deadline countdown, pipeline) | full daily dashboard |
| 6 AI baseline (Mock) | D5 | S6.1 abstraction + Mock + AiAnalysis; S6.2 analyze-fit; S6.3 generate-prep | AI without keys |
| 7 Real AI provider | D6 | S7.1 provider settings + key + templates + errors | real AI |
| 8 Polish + portfolio | D7 | S8.1 states/responsive/charts; S8.2 seed + README + diagram + tests + **CI** | recruiter-ready |

**Should-have / later bucket** (post-MVP): AI referral & follow-up messages, JSON
import/export, markdown notes, dark mode, pgAdmin. Tracked in the backlog, not scheduled.

## 6. Architecture (summary)

Clean Architecture, pragmatic. Full detail in `01-architecture.md`.

```
CareerOps.Domain          (no deps) entities, enums, value objects, domain rules
CareerOps.Application     (→Domain, +EF Core) use-case services, DTOs, FluentValidation,
                          IAppDbContext, IClock, IAiAssistant, dashboard queries, Mapster config
CareerOps.Infrastructure  (→Application) DbContext (impl IAppDbContext), EF configs,
                          migrations, AI providers, SystemClock
CareerOps.Api             (→Application, Infrastructure) Minimal-API modules, DI, middleware,
                          ProblemDetails exception handling, OpenAPI/Scalar, health checks
CareerOps.Contracts       minimal / deferred — orval reads the runtime OpenAPI doc, so a
                          shared DTO assembly is largely unnecessary in the baseline
```

Key patterns: `IAppDbContext` abstraction over `DbSet`s (testable, no generic repos);
`IClock` for deterministic dashboard-rule tests; RFC 7807 `ProblemDetails` as the single
API error envelope; `CreatedAtUtc`/`UpdatedAtUtc` set centrally in `SaveChanges`.

## 7. Runtime & topology

```
docker compose (deploy/compose/docker-compose.yml)
  ├─ careerops-postgres   :5432   volume-backed
  └─ careerops-api        :8080   health checks, OpenAPI/Scalar

host
  └─ frontend (Vite dev)  :5173   orval-generated client → http://localhost:8080
```

- `just up` → backend stack (Postgres + API) from a fresh clone (Docker-first proof).
- `just api` → `dotnet watch` on host against the dockerized Postgres (fast inner loop).
- `just web` → Vite dev server on host.
- `just gen-client` → orval regenerates the typed client from the API OpenAPI doc.

Fresh-clone run is two commands (`just up`, then `just web`) — a deliberate softening of
PRD §5.5's "one command" in exchange for a cleanly separable, independently deployable
frontend (D10).

## 8. PRD deviations (explicit)

| PRD ref | PRD says | This design | Why |
|---------|----------|-------------|-----|
| §17 | `careerops-web` Docker service | No web service; frontend host-only | D10 |
| §8 | `deploy/docker/web.Dockerfile` | Dropped; optional future `frontend/Dockerfile` | D10 keep frontend self-contained |
| §5.5 | Runs from fresh clone via Docker Compose (one command) | Backend via compose; frontend via `just web` | D10 separability |
| §10.3 | `careerops-web` container | Removed | D10 |
| §10.1 | "Mapster or manual" | Mapster | D2 |
| §11.4 | API style left open | Minimal APIs | D1 |
| §10.3 / §26 E8 | CI optional later | Phase 8 | D8 |
| §7.2 / §18.8 | Seed in Should-have / D7 | Manual first, seed only if needed | D9 |
| §13 | Enums (unspecified) | Persist as ints, pinned values | D5 |

Org note: organization default frontend is Angular/SPFx/Next.js; CareerOps uses React per
its PRD. Intentional — CareerOps is a personal product and its PRD governs.

## 9. Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| orval friction during early API churn | Med | Tracer bullet proves it on day one; commit generated client; enforce `operationId`; **time-boxed fallback** to openapi-typescript (½ day, end of S1.2) |
| Orphan rows from hard delete + polymorphic refs | Med | D12 cascade-clean (delete loose-ref children in same op); UI archive-first |
| Enums-as-int reorder → silent data corruption | Med | Pin explicit values; never renumber; documented convention + code-review check |
| Seed deferred → tedious manual setup of overdue/stale test data | Low | Tiny hand fixtures; revisit seed at S8.2 |
| Auto-advance lead status hides coupling | Low | One explicit mapping function, unit-tested |
| CI deferred → late detection of integration breakage | Low | Local `just test` per slice; CI at S8.2 |
| Frontend/back contract drift | Low | orval regen is the contract; CI build (later) fails on stale client |

(Windows Docker bind-mount HMR risk from the earlier draft is **eliminated** by D10/D11 —
frontend and the active backend loop both run on the host.)

## 10. Definition of Done (per slice)

A slice is done when:
1. Backend builds; `just up` runs the stack; relevant endpoints respond.
2. orval client regenerated and committed; frontend page works against real API.
3. Data persists across a container restart (where the slice touches persistence).
4. Validation + `ProblemDetails` errors behave for bad input.
5. `just verify` passes (build + tests + frontend typecheck) — CI-like local gate, from Phase 1.
6. Tests appropriate to the phase pass (light early, growing — see `02`/`05`).
7. A manual usability check confirms the slice supports the real job-search workflow.

## 11. MVP Definition of Done

Per PRD §27, unchanged: Docker runs the backend; Postgres persists; leads, companies,
applications, interviews, contacts, follow-ups all trackable; dashboard shows today's
actions; mock AI fit + prep work; Clean Architecture at a practical level; README explains
setup; the tool is usable for a real, active job search.

## 12. Out of scope (MVP)

Per PRD §7.3 — no auth, multi-user, payments, SaaS, browser extension, scraping, Gmail/
Calendar, RabbitMQ, Redis, Kubernetes, vector DB/RAG, resume builder, file upload, mobile.

## 13. Open questions

None blocking. The only deferred decision is **D7** (Anthropic vs OpenAI as the real AI
provider), to be resolved at Phase 7.

---

## 14. Post-approval addendum (2026-06-19, plan kickoff)

Decisions added after this design was approved, while writing the Phase 0–1 implementation plan.
Full entries live in `docs/knowledge-base/03-decisions.md`; the knowledge base is authoritative.

- **D14** — target framework **.NET 10 (LTS)**.
- **D15** — OpenAPI via built-in `Microsoft.AspNetCore.OpenApi` at `/openapi/v1.json` + **Scalar**
  UI; orval reads `/openapi/v1.json`. **Supersedes the "Swagger" mentions in §6 and §7 above.**
- **D16** — `int` identity primary keys; `UserProfile` is a fixed singleton (`Id = 1`).
- **D17** — `UserProfile` validation rules (PRD §20 omits them).
- **D18** — **pragmatic/tactical DDD** (no repositories/MediatR/domain-event infra; preserves D3).
- **D19** — **CLI-first** for project/dependency/migration ops (`dotnet`) and frontend scaffolding
  (`npm`/`npx`). See `06-engineering-practices.md`.

The engineering working agreement (CLI-first, clean code, pragmatic DDD, no-silent-decisions) is
now `docs/knowledge-base/06-engineering-practices.md`.
