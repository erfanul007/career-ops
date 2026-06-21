# Delivery Plan

Work is sliced into **thin vertical slices**. Each slice cuts top-to-bottom — entity → EF
migration → Minimal-API endpoint → orval-generated client → React page — and ends
**runnable and demoable**. Phases map back to PRD deliveries D0–D7.

**Per-slice Definition of Done** (applies to every slice; see also `05-feedback-loop.md`):

1. Backend builds; `just up` runs the stack; the slice's endpoints respond.
2. orval client regenerated (`just gen-client`) and committed; the frontend page works
   against the real API.
3. Data persists across a container restart (where the slice touches persistence).
4. Bad input returns FluentValidation `ProblemDetails`.
5. `just verify` passes (backend build + tests, frontend typecheck/build) — the CI-like
   local gate, available from Phase 1 (CI itself arrives Phase 8).
6. Phase-appropriate tests pass (light early, growing).
7. Manual usability check: the slice supports the real job-search workflow.

---

## Phase 0 — Foundation (PRD D0)

### S0.1 — Repo skeleton & tooling
- Root structure per PRD §8 **minus the web Docker artifacts** (frontend is host-only).
- `README.md`, `CLAUDE.md`, `docs/` (already present), `justfile`, `.env.example`, `.gitignore`.
- `CLAUDE.md` must include the **Implementation Guardrails** from `04-conventions.md` plus
  the PRD §9.2 instructions, and point at this knowledge base.
- Empty backend solution with the five projects; empty Vite + TS app under `frontend/`.
- **Acceptance:** structure correct; agent instructions exist; no business feature yet.

---

## Phase 1 — Walking skeleton (PRD D1, expanded)

### S1.1 — Backend stack runs
- `docker-compose.yml`: `careerops-postgres` (volume) + `careerops-api`, health checks,
  shared network, env from `.env`.
- ASP.NET Core Minimal-API app: `GET /health`, `GET /health/db`, Serilog, OpenAPI (built-in) + Scalar.
- Vite app on host loads and calls `/health`, shows API status.
- **Acceptance:** `just up` runs Postgres + API; `just web` runs the frontend; health works;
  frontend reaches backend; Postgres reachable.

### S1.2 — TRACER BULLET: `UserProfile` end-to-end ⭐
The thinnest real feature taken fully through every layer, to prove the toolchain before
any real domain work.
- `UserProfile` entity (PRD §12.9) + EF config + migration (single-row profile).
- Minimal-API `GET /api/settings/profile`, `PUT /api/settings/profile` with `operationId`s.
- orval config wired; `just gen-client` generates the typed client + Zod + query hook.
- React Settings → Profile page: load + edit + save via the generated hook + RHF/Zod.
- **Acceptance:** edit profile in the UI, value persists across a restart, the client is
  fully generated (not hand-written), and the `dotnet watch` / Vite HMR loop works.
- **orval time-box (guard):** if orval is not generating a clean client by the end of S1.2,
  switch to the documented fallback (openapi-typescript + a thin fetch wrapper). Do not
  spend more than half a day fighting client generation — the delivery lifecycle comes first.
- **Why first:** de-risks EF migrations, Minimal-API OpenAPI output, orval, React Query
  wiring, persistence, and the dev loop — so every later slice is pure feature work.

---

## Phase 2 — Job Leads (PRD D2, split)

### S2.1 — Company vertical slice
- `Company` entity + enums (`CompanyType`, `MarketType`, `CompensationFit`) + migration.
- CRUD endpoints (`/api/companies`). Validation: name required; website URL valid if given.
- Companies page: list + add/edit form.

### S2.2 — JobLead vertical slice ⭐ *first "replace the spreadsheet" moment*
- `JobLead` entity + enums (`JobSource`, `RemoteMode`, `EmploymentType`, `SalaryPeriod`,
  `Priority`, `JobLeadStatus`) + migration; FK to Company.
- CRUD (`/api/job-leads`). Validation: title, company, priority, status required;
  `FitScore` 0–100 if set; `SalaryMax ≥ SalaryMin`.
- Job Leads list + add/edit form + details page (paste full job description).
- **Fast entry (UX):** the JobLead form must let you select an existing company **or create
  one inline by name** (find-or-create), defaulting `CompanyType`/`MarketType`/
  `CompensationFit` to `Unknown`. `Company` is required (PRD §20), but entering 30–50 leads
  must not require a separate trip to the Companies page.
- **Acceptance:** add real leads (with inline company), update status/priority, paste
  descriptions, data persists.

### S2.3 — Filters, search & dashboard counts
- Job Leads: search + filter by status and priority.
- Dashboard placeholder: lead counts; **high-priority lead** rule
  (`priority in [High, Critical] and status in [Discovered, Interested]`, PRD §21).

---

## Phase 3 — Applications & Follow-ups (PRD D3, split)

### S3.1 — ResumeVariant vertical slice
- `ResumeVariant` entity + migration; CRUD; `make-default` action. Validation: name required.

### S3.2 — Application vertical slice + convert + status actions
- `Application` entity + enums (`ApplicationStage`, `ApplicationStatus`) + migration.
- `POST /api/job-leads/{id}/convert-to-application` (creates Application, selects ResumeVariant).
- Stage/status actions: `change-stage`, `mark-rejected`, `mark-offer`, `mark-ghosted`.
- **Auto-advance** `JobLead.Status` from Application events via one explicit, unit-tested
  mapping function — see the transition table in Decision **D6**. `Archived` is terminal
  (auto-advance never overwrites it). Validation per PRD §20.
- Application list + details.

### S3.3 — FollowUpTask vertical slice + today's actions ⭐ *replaces spreadsheet follow-ups*
- `FollowUpTask` entity + enums (`RelatedEntityType`, `FollowUpStatus`) + migration.
  Polymorphic `RelatedEntityType` + `RelatedEntityId` (no FK; see `04-conventions.md`).
- CRUD + `GET /api/follow-up-tasks/due` + `complete` / `skip` actions.
- Dashboard "today's actions": **due** (`Pending and due_at_utc <= now`) and **overdue**
  (`Pending and due_at_utc < start_of_today`) per PRD §21.
- **Acceptance:** mark a lead applied, pick a resume variant, create a next action, see
  today's actions on the dashboard. Replaces basic spreadsheet tracking.

### S3.4 — Manual AI Prompt Export ⭐ *immediate AI leverage, no provider* (Decision D13)
A bridge to AI that needs no API key, no provider integration, and no storage — uses the
user's own Claude/ChatGPT subscription right away. Matches PRD §16.2's `ManualPromptAssistant`.
- From a JobLead details page (and Application where useful), one-click **copy a prepared
  prompt** assembled from: job title, company, pasted job description, `UserProfile` summary,
  and the selected/default `ResumeVariant`.
- Prompt presets: **Analyze fit**, **Tailor resume bullets**, **Prepare interview topics**.
- Simplest implementation: assemble the prompt on the frontend from already-fetched data and
  copy to clipboard — no `AiAnalysis` row yet. Keep the prompt-template text in one place so
  Phase 6 (`MockAiAssistant`) and Phase 7 (real provider) reuse the **same templates**.
- **Acceptance:** copy a working prompt, paste into Claude, get useful output. No key, no
  provider call, no stored analysis. App remains fully usable without it.

---

## Phase 4 — Interviews (PRD D4)

### S4.1 — Interview vertical slice
- `Interview` entity + enums (`InterviewRoundType`, `InterviewStatus`, `InterviewOutcome`)
  + migration; FK to Application.
- CRUD + add-to-application + `mark-completed`. Prep notes, outcome, feedback fields.
  Validation: application, round type, scheduled time required; duration positive if set.
- Interview page: upcoming + completed lists.
- Dashboard **upcoming interviews**: `Scheduled and scheduled_at_utc between now and now+7d`
  (PRD §21).
- **Note (2026-06-20):** S4.1 delivered; cross-entity sync foundation added; decisions D32–D38 logged.

---

## Phase 5 — Dashboard completion

### S5.1 — Full dashboard summary
- `GET /api/dashboard/summary` returning everything in PRD §14.2.
- Finalize the **stale application** rule (PRD §21) and **search-deadline countdown**;
  add the pipeline summary (counts by status/stage).
- Dashboard UI assembles all cards. (Earlier phases added their sections incrementally;
  this slice completes and polishes the picture.)
- **Note (2026-06-21):** S5.1 delivered — GET /api/dashboard/summary, stale-application + search-deadline rules, dashboard consumes the single summary. Decisions D39–D43 logged.

---

## Phase 6 — Agent-native AI via MCP (PRD D5/D6, see D44)

**Superseded by D44 — AI is delivered via the MCP server (`CareerOps.Mcp`), not an in-app provider. See `docs/superpowers/specs/2026-06-21-careerops-mcp-server-design.md`.**

### S6.1 — MCP server + read + curated-write tools
- Scaffold a thin console project **`backend/src/CareerOps.Mcp`** (references `Application` +
  `Infrastructure`). Register the official C# **`ModelContextProtocol` SDK** with
  `Microsoft.Extensions.Hosting` over **stdio**.
- Wrap the existing Application services as **11 read tools** (`get_dashboard_summary`,
  `list_job_leads`, `get_job_lead`, `list_applications`, `list_interviews`, `list_upcoming_interviews`,
  `list_due_follow_ups`, `get_user_profile`, `list_resume_variants`, and two others) and
  **12 curated-write tools** (`create_job_lead`, `update_job_lead`, `convert_to_application`,
  `change_application_stage`, `mark_application_rejected`/`offer`/`ghosted`, `create_follow_up`,
  `complete_follow_up`, `skip_follow_up`, `create_interview`, `mark_interview_completed`).
- Tools delegate to existing services; **no new business logic, no DB changes**.
- Configuration: `.mcp.json` at repo root; `dotnet build backend/src/CareerOps.Mcp` once, then
  Claude Code launches via `dotnet ... CareerOps.Mcp.dll` (requires `just up` for Postgres).
- Smoke test: JSON-RPC stdio (`initialize` → `tools/list` → one `tools/call`); proves the
  transport and tool surface.
- **Note (2026-06-21):** S6.1 delivered — CareerOps.Mcp stdio MCP server (official ModelContextProtocol SDK) exposing 11 read + 12 curated-write tools over the existing services; no in-app AI provider, no API key. D44–D46 logged.
- **Note (2026-06-21):** MCP host consolidated into the renamed `CareerOps.Presentation` project over HTTP (`/mcp`); separate `CareerOps.Mcp` stdio console removed; `CareerOps.Api` → `CareerOps.Presentation`. D47–D48 logged.

### S6.2 — AI analysis store + write-back + UI (planned)
- `AiAnalysis` entity + migration (polymorphic `EntityType`/`EntityId`, like FollowUpTask; `Kind`,
  `Content`, `Model`, timestamp). Write-back tools: `save_fit_analysis` (updates JobLead AI fields
  + history row) and `save_ai_analysis` (generic, e.g. interview prep). Read tool: `get_ai_analysis`.
- UI: read-only AI panels on JobLead + Interview detail.
- **Acceptance:** agent-produced analysis is stored and surfaced; no in-app provider.

---

## Phase 7 — Real AI provider (PRD D6)

**Superseded by D44 — AI is delivered via the MCP server (`CareerOps.Mcp`), not an in-app provider. See `docs/superpowers/specs/2026-06-21-careerops-mcp-server-design.md`.**

The old Phase 7 plan to add in-app provider integration (`IAiAssistant`, API key config, settings
endpoints) is dropped. The agent-native MCP approach (D44) replaces it, with write-back tools (S6.2)
for persistence.

---

## Phase 8 — Polish & portfolio readiness (PRD D7)

### S8.1 — UX polish
- Empty / loading / error states across pages; responsive layout; dashboard cards;
  Recharts pipeline chart.
- **Note (2026-06-20, D26):** the shadcn app shell, component set, kanban board (+ list), slide-over
  forms, and dashboard pipeline bar landed early in the "Phase 2.5 UI overhaul." S8.1 now reduces to
  Recharts charts, a responsive / empty / error-state audit, and applying the shell to whatever
  Phase 3–7 adds.
- **Note (2026-06-20):** S3.1–S3.4 delivered; Phase 3 complete. Decisions D27–D31 logged.

### S8.2 — Portfolio + hardening
- Seed data **(only now, and only if manual entry proved painful — Decision D9)**.
- README screenshots, architecture diagram, fill in tests.
- **GitHub Actions CI** (Decision D8): backend build + test, frontend build + `gen-client`
  check, Docker image build.
- **Acceptance:** clean look, recruiter-friendly README, fresh-clone setup works, usable daily.

---

## Testing cadence (PRD §25)

| Phase | Tests |
|-------|-------|
| 1–2 | Health endpoint test; DbContext migration smoke test; domain validation tests |
| 3–5 | Dashboard summary tests; follow-up due/overdue + stale calculations (via `IClock`); application status-transition + lead auto-advance tests |
| 6 | Mock AI provider tests |
| 8 | Fill gaps; CI runs the suite |

Keep tests light until the product is usable; do not build large suites early (PRD §25, §19.2).

## Traceability

Every slice above maps to a PRD delivery (header) and PRD §12 entities, §14 endpoints, §20
validation, and §21 dashboard rules. The PRD remains the authority; this plan only changes
*sequencing and granularity* for a shorter feedback cycle, never scope.
