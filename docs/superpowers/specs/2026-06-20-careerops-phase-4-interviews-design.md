# CareerOps Phase 4 — Interviews + Cross-Entity Sync Foundation (Design Spec)

**Date:** 2026-06-20
**PRD delivery:** D4 (Interviews). Delivery-plan slice: S4.1.
**Status:** Approved design — pending spec review.

## 1. Goal

Add interview-round tracking (PRD §12.6) and make the whole app feel like a **single
thread**: any action on one entity reflects in every relevant view automatically, while
keeping domains decoupled and the mechanism simple and extendable.

Two parts:

1. **Cross-entity sync foundation** — one global rule that re-syncs every mounted view
   after any write, replacing today's scattered (and partly broken) per-mutation cache
   invalidation.
2. **Interviews slice** — `Interview` entity end-to-end, layered on top of that foundation.

## 2. Cross-Entity Sync Model (the "single thread")

### 2.1 Problem (current state)

Each mutation hand-picks the query keys it invalidates and several under-declare the graph.
Concretely: moving an application card auto-advances the parent `JobLead.Status` server-side
(D6), but `useApplicationStageMove` invalidates only the applications query — so the Job
Leads board and dashboard show stale status until a manual reload. The same gap affects
mark-rejected / mark-offer / mark-ghosted.

### 2.2 Decision — global invalidation (D37)

Configure the TanStack Query `QueryClient` with a `MutationCache` whose `onSettled`
invalidates all queries:

```ts
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  mutationCache: new MutationCache({
    onSettled: () => queryClient.invalidateQueries(),
  }),
});
```

- `invalidateQueries()` with no filter marks every query stale and **refetches only the
  active (mounted) ones**; inactive views refetch on next mount. Cost is bounded to what is
  on screen.
- Optimistic mutations keep their `onMutate` / `onError` (rollback) handlers for snappy
  boards. They no longer need a manual settle-invalidate — the global rule covers it.
- Per-feature `invalidateQueries({ queryKey })` calls in mutation success paths are removed
  (dialogs, sheets, convert, board moves). The global rule is the single source of sync.

**Decoupling:** no feature module references another's query keys. **Extendable:** future
entities are synced for free. **Counterpoint / scope guard:** broad invalidation is correct
for the PRD's personal single-user baseline (multi-user/SaaS is explicitly out of scope,
§7.3). If data volume or multi-user ever arrived, sync would be scoped per-domain — logged
as the known trade-off, not a silent assumption.

### 2.3 Backend orchestration (unchanged shape)

Cross-entity effects already live in the application services and the single D6 transition
map — the server-side "single thread." Phase 4 extends this pattern; it does not fork it:

- Services own cross-entity writes; domain entities stay decoupled (an `Interview` never
  references `JobLead` or `FollowUpTask` logic — `InterviewService` orchestrates).
- `JobLeadStatusTransitions.Advance` remains the one place lead status changes in response
  to downstream events.

### 2.4 Sync matrix (target)

| Action | Server side-effect | Reconciled by |
|---|---|---|
| Convert lead → application | create app; lead → Applied (D6) | global invalidate |
| Application stage move / mark-* | lead status advances (D6, forward-only) | global invalidate |
| Create interview | lead → Interviewing (D6, forward-only) | global invalidate |
| Interview mark-completed (follow-up flagged) | create linked FollowUpTask | global invalidate |
| Delete lead / app / interview | multi-level cascade-clean of follow-ups | global invalidate |

## 3. Interview Entity (PRD §12.6, §20)

`Interview : AuditableEntity` (`backend/src/CareerOps.Domain/Interviews/`):

| Field | Type | Notes |
|---|---|---|
| Id | int | PK |
| ApplicationId | int | FK → Application (required) |
| Application | Application? | nav |
| RoundType | InterviewRoundType | required |
| ScheduledAtUtc | DateTime | required |
| DurationMinutes | int? | positive if set |
| InterviewerName | string? | |
| InterviewerRole | string? | |
| MeetingUrl | string? | |
| Status | InterviewStatus | default Scheduled |
| PrepNotes | string? | |
| Outcome | InterviewOutcome | default Unknown |
| Feedback | string? | |
| FollowUpRequired | bool | default false |
| FollowUpAtUtc | DateTime? | |
| CreatedAtUtc / UpdatedAtUtc | DateTime | from AuditableEntity |

### 3.1 Enums (pinned ints, first = 0, never reorder — D5)

```text
InterviewRoundType: RecruiterScreen=0, Technical=1, LiveCoding=2, SystemDesign=3,
  TakeHomeDiscussion=4, AIEngineering=5, Behavioral=6, HiringManager=7, Final=8, Other=9
InterviewStatus:    Scheduled=0, Completed=1, Cancelled=2, Rescheduled=3
InterviewOutcome:   Unknown=0, Passed=1, Failed=2, Waiting=3
```

### 3.2 EF mapping

- snake_case (project convention). Enums stored as int.
- FK `Application → Interview`: **OnDelete Cascade** (D36) — deleting an application deletes
  its interview rows. With the existing `JobLead → Application` Cascade (D29), deleting a
  lead cascades lead → application → interviews automatically.
- Migration name `Interview` via the dotnet ef CLI directly (the `just migrate name=` recipe
  mangles the arg on cmd.exe):
  `dotnet ef migrations add Interview --project backend/src/CareerOps.Infrastructure --startup-project backend/src/CareerOps.Api --output-dir Persistence/Migrations`.

## 4. Behaviors

### 4.1 Auto-advance the lead on scheduling (D33) + D6 forward-only refinement (D32)

`InterviewService.CreateAsync` loads the parent application including its `JobLead`, adds the
interview, then advances the lead:
`lead.Status = JobLeadStatusTransitions.Advance(lead.Status, ApplicationTrigger.EnteredInterviewStage)`.

It does **not** change the application's own `CurrentStage` — stage stays user-driven via the
existing change-stage action. (Interview = a scheduled round; stage = where the user says the
pipeline is.)

**D6 refinement (D32):** today `EnteredInterviewStage` maps to `Interviewing` unconditionally,
so firing it on a lead already at Offer/closed would **regress** it. This latent bug also
exists via `Application.ChangeStage` into an interview stage. Fix — make
`EnteredInterviewStage` forward-only:

```csharp
ApplicationTrigger.EnteredInterviewStage =>
    current is JobLeadStatus.Discovered or JobLeadStatus.Interested or JobLeadStatus.Applied
        ? JobLeadStatus.Interviewing
        : current,   // Offer / closed / Interviewing unchanged
```

Idempotent (already Interviewing → stays), non-regressing (Offer/closed preserved), Archived
still terminal (guarded at the top of `Advance`). This is a behavior change to existing
Phase-3 logic — flagged, and covered by tests in §7.

### 4.2 mark-completed + auto-create FollowUpTask (D34)

`POST /api/interviews/{id}/mark-completed` body: `{ outcome, feedback?, followUpRequired,
followUpAtUtc? }`. It sets `Status = Completed`, `Outcome`, `Feedback`, `FollowUpRequired`,
`FollowUpAtUtc`. If `followUpRequired && followUpAtUtc != null` **and** the interview was not
already `Completed` (no duplicate on re-completion), it creates a `FollowUpTask`:

- `RelatedEntityType = Interview`, `RelatedEntityId = interview.Id`
- `DueAtUtc = followUpAtUtc`, `Status = Pending`, `Priority = Medium`
- `Title = "Follow up — {RoundType} interview"` (composed; description optional)

The new task surfaces in today's actions automatically (global sync, §2.2).

### 4.3 Multi-level delete cascade-clean (D35) — closes a pre-existing orphan gap

Interview follow-up tasks are loose references (no FK), so EF cascade does not remove them.
A small shared helper centralizes removal of loose follow-up rows for a set of
`(RelatedEntityType, id)` pairs. The three delete paths:

- **Delete Interview** → remove `(Interview, id)` follow-ups.
- **Delete Application** → remove `(Application, id)` follow-ups **+** for each of its
  interviews `(Interview, interviewId)` follow-ups. (Interview rows EF-cascade.)
- **Delete JobLead** → remove `(JobLead, id)` **+** for its application `(Application, appId)`
  **+** for each interview `(Interview, interviewId)`. This closes a latent D12 gap: today
  `JobLeadService.DeleteAsync` cleans only `(JobLead, id)`, so a deleted lead's application /
  interview follow-ups orphan.

## 5. API Endpoints (PRD §14.6)

`Api/Endpoints/InterviewEndpoints.cs`, group `/api/interviews`, explicit `.WithName` per D1,
`ProducesValidationProblem` where validated, typed `Results<...>` for 404/409.

```text
GET    /api/interviews                 list (all, newest scheduled first; includes app/company summary)
GET    /api/interviews/upcoming        Status=Scheduled and now <= ScheduledAtUtc <= now+7d (IClock)
GET    /api/interviews/{id}            one
POST   /api/interviews                 create (auto-advances lead, §4.1) -> Created | NotFound (app)
PUT    /api/interviews/{id}            update editable fields
POST   /api/interviews/{id}/mark-completed   §4.2
DELETE /api/interviews/{id}            §4.3
```

`generate-prep` (PRD §14.6) is Phase 6 — out of scope here.
`upcoming` mirrors the established `follow-up-tasks/due` pattern (server computes the window
via `IClock`). Validation per §3 with FluentValidation + `ValidationFilter<T>`. Mapster
`IRegister` for DTOs (`InterviewDto` carries `applicationId`, `companyName`, `jobTitle`,
`roundType`, `scheduledAtUtc`, `status`, `outcome`, etc. for list/card rendering).

## 6. Frontend

### 6.1 Sync foundation (Task 0)

Add the global `MutationCache` invalidation (§2.2) where the `QueryClient` is created; remove
the now-redundant per-hook success invalidations; keep optimistic `onMutate`/`onError` in the
two board hooks. Regenerate is not needed for this task.

### 6.2 Interviews page (`pages/InterviewsPage.tsx`, route `/interviews`)

- Two sections: **Upcoming** (Scheduled, soonest first) and **Completed / Past** (everything
  else, most recent first). Not a kanban board — interviews are time-ordered events.
- Each item: round-type badge, status badge, outcome badge (when completed), company + job
  title, relative time ("in 3 days" / "2 days ago", via date-fns `formatDistanceToNow`),
  interviewer, meeting-url link. Row actions: edit, mark-completed, delete (confirm).
- Empty states for both sections. Add interview via the Application sheet (interviews need an
  application) — the page's "Add" affordance opens a picker to choose the application first,
  reusing the same `InterviewForm`.

### 6.3 Application sheet integration (`features/applications/ApplicationSheet.tsx`)

Add an **Interviews** section listing this application's interviews (filtered from the
interviews query by `applicationId`) with "Add interview" + per-row mark-completed / edit /
delete. This is the primary entry point and keeps the FK context implicit.

### 6.4 Components (`features/interviews/`)

- `InterviewForm.tsx` (RHF + Zod from orval) — create/edit; round type, scheduled date-time,
  duration, interviewer name/role, meeting url, prep notes.
- `InterviewSheet.tsx` or dialog wrapper hosting the form (+ application picker when launched
  from the Interviews page).
- `CompleteInterviewDialog.tsx` — outcome, feedback, follow-up-required toggle, follow-up date.
- `InterviewItem.tsx` — the rich row/card (badges + relative time).
- `useInterviewMutations.ts` — create / update / mark-completed / delete (no manual
  invalidation; global rule handles sync).

### 6.5 Dashboard (`features/dashboard/UpcomingInterviews.tsx`)

New card using `useGetUpcomingInterviews` (the `/upcoming` endpoint). Shows next-7-day
scheduled interviews: company + round + relative time, link to the Interviews page. Mounted on
`DashboardPage` alongside `TodaysActions`. Refreshes via global sync when interviews change.

### 6.6 Nav

Add **Interviews** to `AppLayout` between Applications and Tasks:
Dashboard · Job Leads · Applications · Interviews · Tasks · Resume Variants · Companies · Settings.

### 6.7 Enums map

Extend `lib/enums.ts` with `interviewRoundType`, `interviewStatus`, `interviewOutcome` label
maps + badge-class helpers, consistent with existing enum maps.

## 7. Testing

Backend (xUnit, no DB — pure domain/service with in-memory or fakes per existing convention):

- **D6 forward-only:** `Applied → EnteredInterviewStage → Interviewing`; `Offer →
  EnteredInterviewStage → Offer` (no regression); `Rejected/Ghosted/Withdrawn` unchanged;
  `Archived` terminal; `Interviewing` idempotent.
- **Create advances lead:** creating an interview moves an Applied lead to Interviewing; an
  Offer lead stays Offer.
- **mark-completed:** creates a FollowUpTask only when `followUpRequired && followUpAtUtc`;
  no duplicate when already Completed; sets outcome/feedback/status.
- **Cascade-clean:** delete interview removes its follow-ups; delete application removes its
  + its interviews' follow-ups; delete lead removes lead + application + interview follow-ups
  (no orphans).
- **upcoming window:** boundary cases via injected `IClock` (now, now+7d inclusive, now-1s
  excluded).

Frontend: `just verify` (typecheck + build). No new test runner introduced.

## 8. Decisions to log (03-decisions.md)

- **D32** — `EnteredInterviewStage` is forward-only in `JobLeadStatusTransitions.Advance`
  (no regression from Offer/closed; fixes a latent Phase-3 bug).
- **D33** — Creating an interview auto-advances the parent lead to Interviewing (D6); it does
  not change the application's own stage.
- **D34** — `mark-completed` auto-creates a linked `FollowUpTask` when follow-up is flagged
  (once; not on re-completion).
- **D35** — Multi-level delete cascade-clean of loose follow-up rows across
  lead → application → interview; closes a pre-existing lead-delete orphan gap (D12).
- **D36** — `Application → Interview` FK OnDelete Cascade.
- **D37** — Global `MutationCache.onSettled → invalidateQueries()` is the single cross-entity
  sync mechanism; per-mutation invalidation removed. Trade-off: broad refetch, accepted for
  the personal single-user baseline.

## 9. Out of Scope

- AI interview prep (`generate-prep`) — Phase 6.
- Calendar / email / reminders integration (PRD §19.1 — barred until baseline).
- Interview ↔ Contact linking (Contacts not yet built).
- Rescheduled creating a new row — `Rescheduled` is a status; the user edits `ScheduledAtUtc`.
- Per-domain scoped invalidation — only if multi-user/scale arrives (out of scope per PRD).

## 10. Open Questions

None — the three design forks (auto-advance on scheduling, page + add-from-application,
auto-create follow-up) are resolved; the sync-foundation approach is decided (D37).
