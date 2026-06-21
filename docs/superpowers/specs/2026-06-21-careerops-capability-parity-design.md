# CareerOps — Full Capability Parity (UI = REST = MCP) — Design

**Date:** 2026-06-21
**Status:** Approved (brainstorming → plan)
**Supersedes:** D45's "no hard deletes via MCP" (see D49). **Cancels:** the `AiAnalysis` write-back / AI-panel plan (D46 / the old S6.2 AI scope) — see D50.

## 1. Goal

Every operation on the 7 existing resources is doable from **all three surfaces**: the **UI** (manual), the **REST API**, and **MCP** (external coding agent). Both writers share one database, so the UI reflects agent actions live via the existing global-invalidate rule (D37). No in-platform AI feature — the agent analyses externally and writes results into normal entity fields.

Audit (2026-06-21, `scratchpad/parity-matrix.md`): REST is complete; the UI is ~90% complete; **MCP is the main gap** (a curated subset). Plus a few small UI/data items.

## 2. Decisions

- **D49** — MCP reaches **full REST parity, including hard deletes**. Supersedes D45's no-delete stance. ~20 new tools, each a thin wrapper over an existing service method (the destructive ones reuse the services' existing cascade/loose-row cleanup, D35). HTTP exposure stays localhost/no-auth at parity with REST (D47); public deployment of either still requires auth (future).
- **D50** — The JobLead AI-named fields (`FitScore`, `AiSummary`, `MissingKeywords`, `SuggestedResumeAngle`) become **plain writable data slots** — exposed in `UpdateJobLeadRequest` (REST), the JobLead form/sheet (UI), and therefore MCP `update_job_lead`. There is **no** in-platform AI analysis feature; the external agent writes findings into these slots (and `Notes` / interview `PrepNotes`). The earlier `AiAnalysis` entity / `save_fit_analysis` / AI-panel plan (D46) is **cancelled**.

## 3. Slice 1 — MCP full parity (backend)

New `[McpServerTool]` methods (thin delegations to existing services; snake_case; string enums via the existing converter). All backing service methods already exist.

| Resource | New MCP tools | Backing service method |
|---|---|---|
| Company | `list_companies`, `get_company`, `create_company`, `update_company`, `delete_company` | `CompanyService` CRUD |
| ResumeVariant | `get_resume_variant`, `create_resume_variant`, `update_resume_variant`, `delete_resume_variant`, `make_resume_variant_default` | `ResumeVariantService` |
| Application | `update_application`, `delete_application` | `ApplicationService.UpdateAsync`/`DeleteAsync` |
| Interview | `update_interview`, `delete_interview` | `InterviewService.UpdateAsync`/`DeleteAsync` |
| FollowUpTask | `list_follow_ups` (all), `get_follow_up`, `update_follow_up`, `delete_follow_up` | `FollowUpTaskService.ListAsync`/`GetAsync`/`UpdateAsync`/`DeleteAsync` |
| JobLead | `delete_job_lead` | `JobLeadService.DeleteAsync` |
| UserProfile | `update_user_profile` | `UserProfileService.UpdateAsync` |

- A new `CompanyTools.cs`; the rest extend existing tool classes (`ResumeVariantTools`, `ApplicationTools`, `InterviewTools`, `FollowUpTools`, `JobLeadTools`, `ProfileTools`).
- **REST completeness:** add `GET /api/follow-up-tasks/{id}` (the service `GetAsync` exists; only the endpoint is missing) so `get_follow_up` and REST agree.
- Regenerate the orval client (the new REST endpoint surfaces; MCP tools are not in OpenAPI).
- After this slice, MCP == REST for all 7 resources.

## 4. Slice 2 — UI + data parity (frontend + small backend)

- **JobLead AI fields (D50):** add `AiSummary`, `MissingKeywords`, `SuggestedResumeAngle` to `UpdateJobLeadRequest` + its validator/mapping; surface them in `JobLeadForm` (editable) and the JobLead detail sheet (display). `FitScore` already present. Regen client.
- **Wire the unwired deletes:** add delete controls for Application and FollowUpTask (hooks `useDeleteApplication` / `useDeleteFollowUpTask` exist but no button); add a JobLead delete control reachable from the **board** view (today only on the list view).
- **Detail sheets:** add read-only detail views for **Company**, **ResumeVariant**, and **Interview** (these have edit forms but no dedicated detail view).
- Confirm-before-delete + toast on every delete control (match existing delete UX).

## 5. Out of scope

- **Contacts** — net-new (no surface today); deferred to its own later slice (entity + migration + REST + MCP + UI).
- No in-platform AI provider / analysis / `AiAnalysis` store (cancelled, D50).
- No new auth/multi-user; no migration in either slice (the AI fields already exist on the JobLead entity — only the update request/UI expose them).

## 6. Testing

- Slice 1: tool wrappers are thin delegations over already-tested services → rely on the existing suite + an HTTP `/mcp` smoke confirming the new tools appear in `tools/list` and a representative new write/delete round-trips. Add a focused unit test only where a wrapper does anything non-trivial (none expected).
- Slice 2: backend — extend `UpdateJobLeadRequest` handling is covered by existing application tests; add a test asserting the three AI fields round-trip through update. Frontend — `npm run typecheck && npm run build`; manual check that deletes + detail sheets work and the UI reflects agent writes.

## 7. Sequencing

Slice 1 (MCP parity) → merge + push → Slice 2 (UI + data) → merge + push. Each via the superpowers subagent-driven workflow with a final review.
