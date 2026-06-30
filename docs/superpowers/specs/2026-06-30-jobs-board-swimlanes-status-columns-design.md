# Jobs Board Overhaul — Status Columns + Swimlanes, Priority, Delete — Design

**Date:** 2026-06-30
**Status:** Approved (design) — pending spec review
**Scope:** Four cohesive Jobs changes that all converge on the same files (board, card, table, filter bar, presentation):
1. **Swimlanes** — board columns are always **status**; grouping (country/company/priority) splits the board into horizontal **lanes** (Jira-style) with banners. Table gets the row-wise equivalent (banner section-rows).
2. **Priority on the card** — show all priorities (Low/Medium/High) as an editable chip like status, toggleable inline on card and table.
3. **Group by priority** — new grouping dimension.
4. **Delete a job** — hard delete from card kebab, table-row kebab, and the drawer, each behind a confirm dialog.

**Not frontend-only:** item 2 adds one thin **backend slice** (a priority endpoint + orval regen). Items 1, 3, 4 are frontend-only (delete endpoint + `remove` mutation already exist; FollowUps cascade-delete).

## 1. Problem / Current Behaviour

`JobsBoard` treats `groupBy` as the **column** dimension: `groupJobs()` returns one group per key, each rendered as a `BoardColumn`. So **By Country**/**By Company** turn the *columns* into countries/companies — grouping changes what columns mean. Drag-and-drop and the hidden-columns ("Columns") menu are wired only for status grouping. The Table view (`JobsTable`) is a flat 9-column table with no grouping.

`JobCard` shows the priority **only when High** (`getPriorityPresentation` → `show: priority === 'High'`) and it is read-only. There is no way to change priority without opening the drawer, and no group-by-priority. There is **no delete affordance anywhere** in the UI (the `DELETE /jobs/{id}` endpoint and `remove` mutation exist but are unused).

### Target

- Columns are **always status** on the board. Country/company/priority grouping splits the board into horizontal lanes, each with a banner (group name + count) and beneath it the same status columns containing only that lane's jobs. Columns align vertically across lanes. Mirrors Jira swimlanes. Table gets a full-width banner row per group followed by that group's rows.

```
┌ Norway ─────────────────────────────────────── 12 ┐
│ Discovered │ Interested │ Applied │ Interviewing │…│
│  [card]    │  [card]    │ [card]  │   [card]     │ │
│  [card]    │            │ [card]  │              │ │
└────────────────────────────────────────────────────┘
┌ Germany ─────────────────────────────────────── 5  ┐
│ Discovered │ Interested │ Applied │ Interviewing │…│
│            │            │ [card]  │   [card]     │ │
└────────────────────────────────────────────────────┘
```

- Every card shows an editable **priority chip** (all three levels) beside its status chip; High also keeps its left destructive accent bar as an at-a-glance risk cue.
- `groupBy` gains **priority** (lanes High → Medium → Low).
- A guarded **Delete** action is reachable from card kebab, table-row kebab, and the drawer.

## 2. Decisions (locked this session)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Drag-and-drop when grouped | Drag changes **status**, card stays in its lane. Target lane ≠ card's lane → drop ignored. Enabled in **all** groupings. Status chip still works. |
| 2 | Collapsible lanes | **Yes** — per-lane chevron, collapsed state persisted in `localStorage`, shared board ↔ table. |
| 3 | Swimlane/grouping scope | **Board + grouped Table rows.** |
| 4 | Lane order / empties | **Alphabetical**, empty lanes hidden, jobs with no country/company in an **`Unknown`** lane sorted last. (Priority lanes ordered High → Medium → Low.) |
| 5 | Priority inline-edit | **Add a backend `POST /jobs/{id}/priority` endpoint** mirroring `/transition`; optimistic frontend. (Full-PUT from card data would null missing fields — rejected.) |
| 6 | Priority display | Editable chip on **card and table** (mirrors the status chip). High keeps its left destructive accent bar. |
| 7 | Delete placement | **Card kebab + table-row kebab + drawer**, each behind a confirm dialog. Hard delete (row removed; FollowUps cascade), distinct from the Archive status. |

### Derived decisions (to log in `03-decisions.md`)

- `groupBy === 'status'` → **single unbannered lane** (no self-grouping; columns already are statuses).
- Status **column-header row** is sticky to the top of the scroll area; **lane banners are not sticky** (v1).
- The hidden-columns ("Columns") menu now applies to **every** board grouping — one shared visible-status set.
- Collapse store keyed `${groupBy}:${value}`; same store backs board lanes and table sections.
- Priority lane order is **High → Medium → Low** (risk-first), consistent with the calm-tokens + one-destructive-accent direction (D59).
- Priority chip colours use tokens (Low/Medium muted, High destructive); **no raw palette** (D59).
- Delete relies on the existing DB cascade (`FollowUpTask.Job` = `OnDelete(Cascade)`, confirmed in `FollowUpTaskConfiguration.cs`); no backend change for delete.

## 3. Layout Mechanics (swimlanes)

**Per-lane grids sharing one fixed column track** (chosen over a single mega-grid with `col-span-full` banners, and over the rejected column-per-group status quo).

- One horizontal-scroll container (`overflow-x-auto`) wraps the board.
- A **shared sticky header row** names the visible status columns once (with the existing status accent), plus the right-aligned "Columns" dropdown.
- Each lane renders its banner then a `grid` whose template is the **same fixed track** for every lane — `repeat(N, var(--board-col))`, `N` = visible-status count, `--board-col` = column width (today's `w-72` → `18rem`). Identical tracks → columns align by construction and scroll together.
- Board container scrolls Y; header row `sticky top-0`. Collapse hides a lane's grid (banner stays).

Rationale: independent lane blocks → trivial collapse, simple per-cell DnD targeting, no cross-row grid bookkeeping.

## 4. Component / Endpoint Plan

### 4a. Backend slice (priority) — decision 5

- `backend/.../Application/Jobs/SetJobPriorityRequest.cs` — `public record SetJobPriorityRequest(Priority ToPriority);`
- `JobService.SetPriorityAsync(int id, Priority priority, CancellationToken)` — `FindByIdAsync`; if null → `false`; set `job.Priority = priority`; `SaveChangesAsync`; `true`. (Priority is a plain settable field on the `Job` aggregate — no workflow/transition log, unlike status.)
- `JobEndpoints.cs` — `jobs.MapPost("/{id:int}/priority", async (int id, SetJobPriorityRequest req, JobService svc) => await svc.SetPriorityAsync(id, req.ToPriority) ? Results.NoContent() : Results.NotFound()).WithName("SetJobPriority").AddEndpointFilter<ValidationFilter<SetJobPriorityRequest>>();`
- `JobRequestValidators.cs` — `SetJobPriorityRequestValidator` asserting `ToPriority` is a defined enum value (mirrors `TransitionJobRequestValidator`).
- Backend test mirrors the transition service test: sets priority, 404 on missing.
- **orval regen** (`npm --prefix frontend run gen:client`) → generates `useSetJobPriority` + `SetJobPriorityRequest` model. Generated files under `src/lib/api/**` are not hand-edited.

### 4b. Shared frontend core

- `src/features/jobs/jobGrouping.ts` (new) — `interface Lane { key; label; jobs }`; `buildLanes(jobs, groupBy): Lane[]`.
  - `status` → one lane `{ key: LANE_STATUS_KEY ('__all__'), label: '', jobs }`.
  - `country`/`company` → key/label by `country ?? 'Unknown'` / `companyName`; alphabetical; `Unknown` last; empty lanes dropped.
  - `priority` → three lanes ordered High → Medium → Low; empty dropped.
- `src/features/jobs/useCollapsedLanes.ts` (new) — `localStorage`-backed (`careerops:jobs:collapsed-lanes`); `useCollapsedLanes(groupBy) → { isCollapsed(key), toggle(key) }`; keys `${groupBy}:${value}`; try/catch tolerant.

### 4c. Board

- `BoardColumnHeader.tsx` (new) — shared sticky status-label row (one cell per visible status: name + accent border).
- `BoardLane.tsx` (new) — banner (collapse chevron + label + lane job count) + cell grid for visible statuses. Banner hidden when `groupBy === 'status'`.
- `BoardCell.tsx` (new) — droppable for one `(lane,status)`; id `${laneKey}::${status}`; renders that lane's cards for the status + empty/drop hint. (Today's `BoardColumn` body.)
- `BoardColumn.tsx` — **removed/absorbed**; `BoardColumn.test.tsx` rewritten against `BoardCell`/`BoardColumnHeader` (not deleted silently).
- `JobsBoard.tsx` — wrap **all** groupings in one `DndContext`; compute visible statuses (existing hidden logic, grouping-independent) + `buildLanes`; render `BoardColumnHeader` + `BoardLane[]`. Drag end parses `${laneKey}::${status}`; sets status; ignores cross-lane drops + no-op.

### 4d. Priority display + edit — decisions 6

- `jobPresentation.ts` — extend `getPriorityPresentation(priority)` to return `{ label, dotClassName, accentClassName }` for all three (token colours; High = destructive). **Update all callers** (`JobCard`, `JobCardPreview`, and `JobsTable` if it switches off `PRIORITY_VARIANT`).
- `JobPriorityDropdown.tsx` (new) — mirrors `JobStatusDropdown` (chip + default variants), `useSetJobPriority` mutate; optimistic cache update for the list (same `getListJobsQueryKey` surgery the board drag uses) so the chip feels instant.
- `JobCard.tsx` — replace the High-only label with `<JobPriorityDropdown variant="chip">` beside the status chip (`data-card-interactive`, stopPropagation guards like the status chip). Keep the left destructive accent bar for High.
- `JobsTable.tsx` — swap the read-only priority `Badge` for the editable `JobPriorityDropdown` (consistent with the existing editable status cell).
- `JobDetailDrawer.tsx` — add `JobPriorityDropdown` beside the status dropdown in the header actions slot.

### 4e. Group by priority — decision 3/4

- `JobsBoard.GroupBy` += `'priority'`; `JobFilterBar.GROUP_OPTIONS` += `{ value: 'priority', label: 'By Priority' }`; `buildLanes` handles it (4b).

### 4f. Table grouping

- `JobsTable.tsx` — accept `groupBy: GroupBy`; when grouped, render a `colSpan`-full banner row (chevron + label + count) per lane then its rows (collapsed → banner only); flat when `status`. Uses `buildLanes` + `useCollapsedLanes`.
- `JobsPage.tsx` — pass `groupBy={filters.groupBy}` to `JobsTable`.

### 4g. Delete — decision 7

- Scaffold `src/components/ui/alert-dialog.tsx` via shadcn (`npx shadcn@latest add alert-dialog`) — currently missing (D19: use the CLI, don't hand-author).
- `DeleteJobMenuItem` / small `useDeleteJobAction` pattern: a kebab `DropdownMenu` (lucide `MoreVertical`) with a destructive "Delete" item that opens an `AlertDialog` naming the job (`JOB-{id} — {companyName} · {title}`) → `remove.mutate({ id })` (mutation already invalidates; add optimistic list removal + `toast.success`).
  - `JobCard.tsx` — kebab in the card header row, `data-card-interactive` (no drawer-open / drag).
  - `JobsTable.tsx` — trailing actions column with the same kebab.
  - `JobDetailDrawer.tsx` — "Delete job" in the header actions; on success also `onClose()`.

**Off-limits:** `src/lib/api/**` (generated — regenerated via orval, never hand-edited), API contracts beyond the one new priority endpoint.

## 5. Drag-and-Drop Detail

`DndContext` wraps the board in every grouping. Droppable id per cell `${laneKey}::${status}`. `handleDragEnd`: find job; parse `toStatus`/`toLaneKey` from `over.id`; ignore if `toLaneKey` ≠ job's lane key (cross-lane) or `job.status === toStatus`; else optimistic-update cached list + `transition.mutate` (unchanged surgery). Status mode: all cells share `LANE_STATUS_KEY` → lane check always passes. Table has no drag.

## 6. Persistence

- **Hidden columns:** existing `careerops:jobs:hidden-status-columns` retained; now read in all board groupings.
- **Collapsed lanes:** new `careerops:jobs:collapsed-lanes`, values `${groupBy}:${value}`; shared board↔table; try/catch tolerant.

## 7. Responsive / A11y

- Board stays full-bleed, full-height, horizontal scroll; lanes stack vertically.
- Collapse chevron + kebab triggers are real `button`s with `aria-expanded`/labels.
- Delete confirm is a focus-trapped `AlertDialog`; destructive action styled with the `destructive` token; not reachable in one click.
- Status/priority not conveyed by colour alone (text labels retained; overdue uses icon + token).
- Keyboard focus rings preserved on cards, chips, chevrons, kebabs, menus.

## 8. Package Decision

**Existing stack + one shadcn primitive.** No new npm dependencies — `@dnd-kit/core`, Tailwind grid, shadcn/Radix dropdown + the scaffolded `alert-dialog`, lucide icons, date-fns are all present/CLI-generated. Backend uses existing FluentValidation + Minimal API patterns.

## 9. Implementation Phases

1. **Backend priority slice:** request DTO + validator + `SetPriorityAsync` + endpoint + backend test; run orval regen. (Independently testable: backend test + generated hook compiles.)
2. **Shared frontend core:** `jobGrouping.ts` (+ tests), `useCollapsedLanes.ts` (+ tests).
3. **Board restructure:** `BoardColumnHeader`, `BoardCell`, `BoardLane`; rewire `JobsBoard` (lanes + DnD all groupings + hidden-columns everywhere); replace `BoardColumn`; update board tests.
4. **Priority UI:** `JobPriorityDropdown`, `getPriorityPresentation` extension + caller updates, card/table/drawer wiring; group-by-priority option; tests.
5. **Table grouping:** `JobsTable` banner rows + collapse; `JobsPage` passes `groupBy`; tests.
6. **Delete:** scaffold `alert-dialog`; kebab + confirm in card/table/drawer; optimistic removal + toast; tests.
7. **Decisions + QA:** append `03-decisions.md`; full validation.

## 10. Validation Checklist

- Backend: `dotnet test` (priority slice) green.
- `npm --prefix frontend run gen:client` (after backend) — generated hook present, no diff churn beyond the new endpoint.
- `npm --prefix frontend run typecheck` / `build` / `lint` / `test`.
- Manual: columns are status in every grouping; country/company/priority render aligned lanes with banners + counts; collapse persists and is shared board↔table; drag changes status within a lane and ignores cross-lane drops; hidden-columns menu works in all groupings; empty lanes hidden; `Unknown` last; priority chip shows + toggles on card/table/drawer and persists; group-by-priority lanes High→Medium→Low; delete from card/row/drawer prompts a confirm, removes the job, follow-ups gone, drawer closes; board stays full-height + horizontally scrollable.

## 11. Open Questions / Gates

- Implementation must run on a **feature branch**, not `main`.
- `BoardColumn` removal touches `BoardColumn.test.tsx` — rewritten against the new components, not deleted silently.
- Backend + frontend regen ordering: Phase 1 must complete (endpoint + swagger) before orval regen, else `useSetJobPriority` won't exist for Phase 4. If running the API to regen is impractical in-session, the fallback is hand-adding the generated hook following the existing `useTransitionJob` pattern (documented orval fallback).
