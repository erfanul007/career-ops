# CareerOps — Phase 3 Design: Applications, Follow-ups & Manual AI Prompt Export

- **Status:** Approved (2026-06-20).
- **Author:** Brainstormed with Claude Code.
- **Scope owner:** PRD Delivery 3 (`§18.4`), delivery-plan slices **S3.1–S3.4**.
- **Source of truth for product scope:** `docs/CareerOps-PRD.md` (esp. §12 entities, §14 endpoints,
  §16 AI, §20 validation, §21 dashboard rules).
- **Governs build conventions:** `docs/knowledge-base/` (esp. `01-architecture.md`, `04-conventions.md`)
  and locked decisions in `03-decisions.md` (esp. **D5, D6, D12, D13, D18, D24, D25**).

---

## 1. Goal

Take CareerOps from a job-leads tracker to a real pipeline tool: convert a lead into an
**Application**, move it through stages, manage **Follow-up tasks**, see **today's actions** on the
dashboard, and get **instant AI leverage** by copying a prepared prompt into your own Claude/ChatGPT —
no API key, no provider call. Ends Delivery 3: *"mark a lead applied, pick a resume variant, create a
next action, see today's actions"* (PRD §18.4) plus the manual-AI bridge (D13).

Everything structural is already fixed by the PRD and prior decisions. This spec records the design
choices that were **open**: the two UX forks (resolved below) and a handful of engineering calls
logged as new decisions D27–D31.

## 2. Scope

**In scope (4 vertical slices, built in order):**

| Slice | Delivers |
|-------|----------|
| S3.1 | `ResumeVariant` entity + CRUD + make-default; Resume Variants page |
| S3.2 | `Application` entity + enums; convert-to-application; stage/status actions; lead auto-advance (D6); Applications board + list |
| S3.3 | `FollowUpTask` entity + enums; `/due`; complete/skip; Tasks page; dashboard today's-actions + overdue; D12 cascade-clean on delete |
| S3.4 | Manual AI prompt export (frontend-only): 3 presets, copy to clipboard |

**Out of scope (later phases, do not build):** Interviews (Phase 4), Contacts (later), in-solution AI
provider/analysis (never built — all AI is external via the MCP server, D51), `GET /api/dashboard/summary` aggregate
endpoint (Phase 5), file upload (PRD §12.3 baseline exclusion), seed data (Phase 8, D9), Recharts /
dark mode (Phase 8, D26).

## 3. UX forks (resolved)

- **Applications view = board + list toggle** (mirrors Job Leads, D26 expectation). Kanban columns by
  `ApplicationStage`. Active columns `Applied → Offer`; `Rejected / Ghosted / Withdrawn` behind a
  "Show closed" toggle. Drag a card → stage/status action (mapping in §6.3). List view is a dense
  table. URL-synced `?view=board|list`, same pattern as `JobLeadsPage`.
- **Follow-up tasks = dedicated Tasks page + dashboard cards.** A "Tasks" nav item shows all tasks
  (pending/done filter, ad-hoc + entity-linked create, complete/skip). The dashboard shows **Today's
  actions** (due) and **Overdue**. This adds a nav item beyond PRD §15.2 — logged as **D28**.

## 4. Architecture (unchanged conventions)

Clean Architecture + pragmatic DDD (D18). Each slice is a thin vertical slice (Domain → EF config +
migration → Minimal-API module → orval client → React page), mirroring the existing `JobLead` slice:

```
Domain/<Aggregate>/            entity + enums (enums pinned ints, first = 0, D5)
Application/<Aggregate>/       Create/Update requests, Dto, MappingConfig (Mapster), Validators (FluentValidation), Service
Infrastructure/Persistence/Configurations/<Aggregate>Configuration.cs   + EF migration
Api/Endpoints/<Aggregate>Endpoints.cs   MapGroup, explicit operationIds (D1)
frontend/src/features/<aggregate>/ + pages/<Aggregate>Page.tsx
```

Services use `IAppDbContext` directly (D3 — no repositories/MediatR). Inject `IClock`; never call
`DateTime.UtcNow` (central audit in `SaveChangesAsync`). State transitions live on entities where they
protect an invariant (D18).

## 5. S3.1 — ResumeVariant

**Domain** `Domain/ResumeVariants/ResumeVariant.cs` (PRD §12.3): `Id`, `Name`, `TargetRole?`,
`Summary?`, `Notes?`, `IsDefault`, `CreatedAtUtc`, `UpdatedAtUtc`. No enums.
**Invariant:** at most one row with `IsDefault = true`. Domain method `MakeDefault()` sets its own flag;
the service clears the previous default in the same `SaveChangesAsync`.

**Application** `Application/ResumeVariants/`: `CreateResumeVariantRequest` (Name, TargetRole, Summary,
Notes), `UpdateResumeVariantRequest` (same), `ResumeVariantDto` (all fields), `ResumeVariantMappingConfig`,
`ResumeVariantRequestValidators` (Name required, ≤200; TargetRole recommended → no hard rule),
`ResumeVariantService` (CRUD + `MakeDefaultAsync(id)`).

**Infrastructure** `ResumeVariantConfiguration` + migration `ResumeVariant`.

**API** `/api/resume-variants`: `GET`, `GET {id}`, `POST`, `PUT {id}`, `DELETE {id}`,
`POST {id}/make-default`. operationIds `GetResumeVariants` … `MakeResumeVariantDefault`.

**Frontend** `features/resumeVariants/` + `pages/ResumeVariantsPage.tsx`: list (cards or table) showing
name/target role + a "Default" badge; add/edit dialog (`Field` + shadcn `Input`/`Textarea`); make-default
action; delete via confirm (delete blocked by the API when a variant is referenced — §6.4). Nav item
"Resume Variants".

## 6. S3.2 — Application (+ convert + actions + auto-advance)

**Domain** `Domain/Applications/`: `Application.cs` (PRD §12.5) + `ApplicationStage.cs`,
`ApplicationStatus.cs`.

- `ApplicationStage` (pinned 0–10): `Applied=0, RecruiterScreen=1, TechnicalScreen=2, TakeHome=3,
  SystemDesign=4, HiringManager=5, Final=6, Offer=7, Rejected=8, Ghosted=9, Withdrawn=10`.
- `ApplicationStatus` (pinned 0–4): `Active=0, Paused=1, Rejected=2, Offer=3, Withdrawn=4`.
- Fields: `Id, JobLeadId, ResumeVariantId, AppliedAtUtc, CurrentStage, Status, ExpectedSalary?,
  ExpectedSalaryCurrency?, NoticePeriod?, NextStep?, NextActionAtUtc?, RejectionReason?, Notes?`, audit.
- Domain methods guarding the stage↔status invariant: `ChangeStage(stage)`,
  `MarkRejected(reason?)` (→ stage `Rejected`, status `Rejected`), `MarkOffer()` (→ `Offer`/`Offer`),
  `MarkGhosted()` (→ `Ghosted`, status stays `Active` unless already terminal). `Withdrawn` is reached
  via `ChangeStage(Withdrawn)`, which also sets status `Withdrawn`.

### 6.1 Auto-advance (D6)

One pure, unit-tested function maps an application trigger to the lead's next status, keyed off the
lead's **current** status (idempotent; `Archived` is terminal and never overwritten):

`Domain/JobLeads/JobLeadStatusTransitions.cs`
```
public static JobLeadStatus Advance(JobLeadStatus current, ApplicationTrigger trigger)
```
`ApplicationTrigger` enum: `Created, EnteredInterviewStage, Offer, Rejected, Ghosted, Withdrawn`.
Map (per D6): Created→`Applied`; EnteredInterviewStage→`Interviewing`; Offer→`Offer`;
Rejected→`Rejected`; Ghosted→`Ghosted`; Withdrawn→`Withdrawn`. If `current == Archived`, return
`Archived` unchanged. `EnteredInterviewStage` is emitted when `change-stage` targets any of
`RecruiterScreen, TechnicalScreen, TakeHome, SystemDesign, HiringManager, Final`.
`ApplicationService` loads the lead and applies the result after convert + every action.

### 6.2 Application layer

`Application/Applications/`: `ConvertToApplicationRequest` (`ResumeVariantId`, `AppliedAtUtc` default
now, optional `NextStep`/`NextActionAtUtc`/`Notes`; `CurrentStage` fixed to `Applied`),
`ChangeStageRequest` (`Stage`), `MarkRejectedRequest` (`RejectionReason?`), `UpdateApplicationRequest`
(editable fields: salary, notice, next step/action, notes — not lead/variant/stage), `ApplicationDto`
(all fields **+ denormalized** `CompanyName`, `JobTitle`, `ResumeVariantName` for board cards),
`ApplicationMappingConfig`, `ApplicationRequestValidators` (PRD §20: JobLead, ResumeVariant,
AppliedAtUtc, CurrentStage required), `ApplicationService`.

**Creation is via convert only** (every application originates from a lead; `JobLeadId` required). The
generic `POST /api/applications` from PRD §14.5 is **omitted** — no create path without a lead (YAGNI),
logged as **D29**. `convert-to-application` rejects a lead that already has an application (one
application per lead in baseline; surfaced as 409/validation).

### 6.3 API + board mapping

`Api/Endpoints/ApplicationEndpoints.cs`:
- `POST /api/job-leads/{id}/convert-to-application` (creates the Application, sets lead → `Applied`).
- `GET /api/applications`, `GET /api/applications/{id}`, `PUT /api/applications/{id}`,
  `DELETE /api/applications/{id}`.
- `POST /api/applications/{id}/change-stage`, `/mark-rejected`, `/mark-offer`, `/mark-ghosted`.

**Board drag → action:** dropping a card in a column maps the target `ApplicationStage` to the right
call — pipeline stages (`Applied`…`Final`) → `change-stage`; `Offer` → `mark-offer`; `Rejected` →
`mark-rejected`; `Ghosted` → `mark-ghosted`; `Withdrawn` → `change-stage(Withdrawn)`. Optimistic update
with rollback + error toast, exactly like `useUpdateLeadStatus` (reuses the existing pattern, D26).

### 6.4 Persistence + delete behavior

`ApplicationConfiguration`: `JobLead → Application` `OnDelete(Cascade)`; `ResumeVariant → Application`
`OnDelete(Restrict)` — deleting a referenced resume variant is blocked and surfaced as an error (logged
as **D29**). Migration `Application`.

### 6.5 Frontend

`features/applications/` + `pages/ApplicationsPage.tsx`. Board (`@dnd-kit/core`) with columns by stage,
"Show closed" toggle, list view, `?view=` URL sync — structurally a sibling of the Job Leads board.
Cards show company · role · status badge · next action. Details/edit via Sheet. **Convert** is launched
from the Job Lead sheet ("Convert to application" → dialog: pick `ResumeVariant` (defaults to the
default), applied date). Nav item "Applications".

## 7. S3.3 — FollowUpTask (+ today's actions)

**Domain** `Domain/FollowUpTasks/`: `FollowUpTask.cs` (PRD §12.7) + `RelatedEntityType.cs`
(`None=0, JobLead=1, Application=2, Interview=3, Contact=4`), `FollowUpStatus.cs`
(`Pending=0, Completed=1, Skipped=2`). Reuses the existing `Priority` enum. Fields: `Id, Title,
Description?, RelatedEntityType, RelatedEntityId?, DueAtUtc, Status, Priority`, audit. **Polymorphic**
reference (`RelatedEntityType` + `RelatedEntityId`) with **no FK** (D12, `04-conventions.md`). Methods
`Complete()`, `Skip()`.

**Application** `Application/FollowUpTasks/`: Create/Update requests, `FollowUpTaskDto`, MappingConfig,
validators (PRD §20: Title, DueAtUtc, Status, Priority required), `FollowUpTaskService`
(CRUD + `GetDueAsync()` = `Status==Pending && DueAtUtc <= clock.UtcNow` + `CompleteAsync` + `SkipAsync`).

**D12 cascade-clean:** extend `JobLeadService.DeleteAsync` **and** `ApplicationService.DeleteAsync` to
also delete `FollowUpTask` rows where `RelatedEntityType`/`RelatedEntityId` match the deleted parent —
same application-service operation, no orphans.

**Infrastructure** `FollowUpTaskConfiguration` (no FK; index on `Status, DueAtUtc`) + migration
`FollowUpTask`.

**API** `/api/follow-up-tasks`: `GET`, `GET /due`, `POST`, `PUT {id}`, `DELETE {id}`,
`POST {id}/complete`, `POST {id}/skip`.

**Frontend** `features/followUpTasks/` + `pages/TasksPage.tsx`: table (status · title · linked entity ·
due · priority), pending/done filter, add/edit dialog (with optional entity link), complete/skip
actions. Dashboard gains **Today's actions** (from `/due`) and **Overdue** (`/due` rows where
`DueAtUtc < start-of-today`, split client-side) cards with inline complete/skip. "+ follow-up" also
launchable from lead/application sheets, prefilling the entity link. Nav item "Tasks".

## 8. S3.4 — Manual AI Prompt Export (frontend-only, D13)

No backend, no `AiAnalysis`, no provider call. Prompt **templates live in one place**
(`frontend/src/lib/aiPrompts.ts`) and assemble clipboard prompts for external agents (no in-app
provider). A dialog launched from the Job Lead sheet (and Application sheet) presents 3 preset tabs:

- **Analyze fit** — title, company, pasted JD, profile summary, selected resume variant → fit prompt.
- **Tailor resume bullets** — resume variant + JD → rewrite-bullets prompt.
- **Prepare interview topics** — JD + profile → likely-topics prompt.

The dialog assembles the prompt from already-fetched data (lead + `UserProfile` + chosen
`ResumeVariant`, defaulting to the default variant), renders it in a read-only textarea, and offers a
**Copy** button (clipboard) + a "what to do" hint. App stays fully usable without it.

## 9. Dashboard (Phase 3 additions)

Stays **client-side** (D24) except the PRD-mandated `GET /api/follow-up-tasks/due`. New/updated cards:
Today's actions (due), Overdue, Active applications count (client-side over `GET /api/applications`,
`Status==Active`). High-priority leads card already exists (Phase 2). Stale-application card and the
real `GET /api/dashboard/summary` remain **Phase 5** (D24 escape hatch). Logged as **D30**.

## 10. Data flow

```
Lead (sheet) ── Convert ──► POST /job-leads/{id}/convert-to-application
                              │ creates Application(stage=Applied, status=Active)
                              └─► auto-advance: lead.Status = Applied
Applications board ── drag ──► change-stage / mark-* ─► auto-advance lead.Status (D6 map)
Tasks page / sheet ── create ─► POST /follow-up-tasks (optional RelatedEntityType+Id)
Dashboard ── GET /follow-up-tasks/due ─► due (client splits overdue by start-of-today)
Lead/App sheet ── "AI prompt" ─► assemble from cached data ─► clipboard (no network)
Delete lead/app ─► cascade FK children + delete matching FollowUpTask rows (D12)
```

## 11. Error handling

Bad input → FluentValidation `ProblemDetails` (400), shown by forms (server-authoritative, D23).
Convert on an already-converted lead → 409/validation message. Deleting a referenced ResumeVariant →
error surfaced in the UI (D29). Not-found → typed `Results<Ok<T>, NotFound>` 404 (existing pattern).
Optimistic board moves roll back + toast on failure (D26 pattern).

## 12. Testing (cadence Phase 3–5, PRD §25 — keep light)

- **Unit:** `MakeDefault` invariant (exactly one default after); `JobLeadStatusTransitions.Advance`
  per trigger + `Archived`-terminal idempotency; `FollowUpTask` due/overdue boundary via a fake `IClock`;
  entity transition methods (`MarkRejected`/`MarkOffer`/`ChangeStage`).
- **Integration:** convert-to-application creates the app + advances the lead; cascade-clean delete
  (deleting a lead with a follow-up removes the follow-up; deleting a referenced ResumeVariant is
  blocked); validation 400 `ProblemDetails` per new entity.
- **Per-slice gate:** `just verify` (backend build + tests, frontend typecheck/build) + manual usability
  check. No frontend test runner (intentional, D23/D26).

## 13. Decisions to log (`03-decisions.md`)

- **D27** — Applications board + list mirrors Job Leads; columns by `ApplicationStage`; drag maps to
  `change-stage`/`mark-*`; auto-advances the lead (D6). Reuses the D26 optimistic pattern; no new
  status-PATCH endpoint.
- **D28** — Dedicated **Tasks** nav page added (deviation from PRD §15.2 nav) + dashboard due/overdue.
- **D29** — Application creation is **convert-only** (`POST /api/applications` omitted, YAGNI);
  `ResumeVariant → Application` delete is `Restrict`; one application per lead in baseline.
- **D30** — Phase 3 dashboard stays client-side except `/api/follow-up-tasks/due`; real
  `/api/dashboard/summary` deferred to Phase 5 (D24 escape hatch).
- **D31** — Manual AI prompt export is frontend-only; templates in `lib/aiPrompts.ts` assemble clipboard
  prompts for external agents (no in-app provider); assembles from cached lead/profile/resume-variant
  (defaults to the default variant); no `AiAnalysis` row.

## 14. Traceability

PRD §18.4 (Delivery 3) · entities §12.3/§12.5/§12.7 · endpoints §14.5/§14.8/§14.9 · AI §16.2/§16.3 ·
validation §20 · dashboard rules §21 · decisions D5/D6/D12/D13/D18/D24/D25 and new D27–D31.
The PRD remains authority; this spec changes only how the open UX/engineering choices are realized.
