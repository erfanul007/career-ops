# Jobs Board — Status Columns + Swimlane Grouping — Design

**Date:** 2026-06-30
**Status:** Approved (design) — pending spec review
**Scope:** Restructure the Jobs **Board** so columns are always status, and grouping (country/company) splits the board into horizontal **swimlanes** (Jira-style), each with a banner. Also restructure the Jobs **Table** so grouping renders banner section-rows. Frontend-only; no backend/API/contract changes; no new dependencies.

## 1. Problem / Current Behaviour

`JobsBoard` treats `groupBy` as the **column** dimension: `groupJobs()` returns one group per key and each group is rendered as a `BoardColumn`. So:

- **By Status** → one column per status (correct kanban).
- **By Country** → one column per country (wrong — country becomes the columns).
- **By Company** → one column per company (same problem).

Filtering/grouping therefore *changes what the columns mean*, which is disorienting. Drag-and-drop and the hidden-columns ("Columns") menu are wired only for the status grouping, because only then are columns statuses.

The Table view (`JobsTable`) is a flat 9-column table with no grouping at all.

### Target

Columns are **always status** on the board. Grouping by country/company splits the board into horizontal lanes (rows). Each lane has a banner naming the group (e.g. `Norway`) with a job count, and beneath it the same status columns containing only that lane's jobs. Columns align vertically across every lane. This mirrors Jira board swimlanes. The Table view gets the row-wise equivalent: a full-width banner row per group, followed by that group's job rows.

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

## 2. Decisions (locked this session)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Drag-and-drop when grouped | Drag changes **status**, card stays in its lane. Target lane ≠ card's lane → drop ignored. Enabled in **all** groupings. Status chip still works. |
| 2 | Collapsible lanes | **Yes** — per-lane chevron, collapsed state persisted in `localStorage`, shared board ↔ table. |
| 3 | Scope | **Board + grouped Table rows.** |
| 4 | Lane order / empties | **Alphabetical**, empty lanes hidden, jobs with no country/company in an **`Unknown`** lane sorted last. |

### Derived decisions (to log in `03-decisions.md`)

- `groupBy === 'status'` produces a **single unbannered lane** — no self-grouping (columns already are statuses).
- The status **column-header row** is sticky to the top of the scroll area; **lane banners are not sticky** (v1 simplicity).
- The hidden-columns ("Columns") menu now applies to **every** board grouping — one shared visible-status set across all lanes.
- Collapse store keyed `${groupBy}:${value}`; the same store backs board lanes and table sections.

## 3. Layout Mechanics (chosen approach)

**Per-lane grids sharing one fixed column track** (chosen over a single mega-grid with `col-span-full` banners, and over the rejected column-per-group status quo).

- One horizontal-scroll container (`overflow-x-auto`) wraps the whole board.
- A **shared sticky header row** names the visible status columns once (with the existing status accent), plus the right-aligned "Columns" dropdown.
- Each lane renders its banner then a `grid` whose template is the **same fixed track** for every lane — `repeat(N, var(--board-col))` where `N` = visible-status count and `--board-col` = the column width (today's `w-72` → `18rem`). Identical tracks → columns align by construction and scroll together.
- Vertical scroll: the board container scrolls Y; the header row is `sticky top-0`.
- Collapse hides a lane's grid (banner stays).

Rationale: each lane is an independent block → trivial collapse, simple per-cell DnD targeting, no cross-row grid bookkeeping. Lowest maintenance for the requirement.

## 4. Component Plan

**New**

- `src/features/jobs/jobGrouping.ts` — shared lane builder.
  - `LANE_STATUS_KEY` const for the single status-mode lane (e.g. `'__all__'`).
  - `interface Lane { key: string; label: string; jobs: JobDto[] }`
  - `buildLanes(jobs: JobDto[], groupBy: GroupBy): Lane[]`
    - `groupBy === 'status'` → one lane `{ key: LANE_STATUS_KEY, label: '', jobs }`.
    - `'country'` → key/label by `country ?? 'Unknown'`; `'company'` → by `companyName`.
    - Alphabetical by label; `Unknown` forced last; lanes with zero jobs dropped.
- `src/features/jobs/BoardColumnHeader.tsx` — the shared sticky status-label row (one cell per visible status: name + accent border + count-less header). Count lives per-cell-optional → **omitted** (non-goal).
- `src/features/jobs/BoardLane.tsx` — banner (collapse chevron, label, lane job count) + the cell grid for the visible statuses. Banner hidden when `groupBy === 'status'`.
- `src/features/jobs/BoardCell.tsx` — droppable for one `(lane,status)`; droppable id `${laneKey}::${status}`; renders the lane's cards for that status + the empty/drop-here hint. (This is today's `BoardColumn` body.)
- `src/features/jobs/useCollapsedLanes.ts` — `localStorage`-backed collapse hook: `useCollapsedLanes(groupBy) → { isCollapsed(key), toggle(key) }`. Storage key e.g. `careerops:jobs:collapsed-lanes`; value is a map/array of `${groupBy}:${value}` strings.

**Modified**

- `src/features/jobs/JobsBoard.tsx` — wrap **all** groupings in one `DndContext`; compute visible statuses (existing `hiddenStatuses` logic, now grouping-independent) + `buildLanes`; render `BoardColumnHeader` + `BoardLane[]`. Drag end parses `${laneKey}::${status}` from `over.id`, sets status, ignores cross-lane drops.
- `src/features/jobs/JobsTable.tsx` — accept `groupBy: GroupBy`; when grouped, render a `colSpan`-full banner row (chevron + label + count) per lane then its job rows (collapsed lane → banner only); flat table when `groupBy === 'status'`.
- `src/pages/JobsPage.tsx` — pass `groupBy={filters.groupBy}` to `JobsTable`.
- `src/features/jobs/BoardColumn.tsx` — **removed/absorbed** (header → `BoardColumnHeader`, body → `BoardCell`). Update/replace `BoardColumn.test.tsx` accordingly.

**Off-limits:** `src/lib/api/**` (generated), backend, API contracts.

## 5. Drag-and-Drop Detail

- `DndContext` now wraps the board in every grouping (today: status only).
- Droppable id per cell: `${laneKey}::${status}`.
- `handleDragEnd`: find dragged job; parse `toStatus` (and `toLaneKey`) from `over.id`; **ignore** if `toLaneKey` ≠ the job's current lane key (cross-lane), or `job.status === toStatus`. Otherwise optimistic-update the cached list + `transition.mutate` (unchanged logic, same `getListJobsQueryKey(listParams)` cache surgery).
- In status mode all cells share `LANE_STATUS_KEY`, so the lane check is always satisfied.
- Table view has no drag (unchanged).

## 6. Persistence

- **Hidden columns:** existing `careerops:jobs:hidden-status-columns` key and defaults retained; now read in all board groupings.
- **Collapsed lanes:** new key, values `${groupBy}:${value}`; shared across board and table; tolerant of missing/corrupt storage (try/catch, default empty).

## 7. Responsive / A11y

- Board keeps full-bleed, full-height, horizontal scroll; lanes stack vertically.
- Collapse chevron is a real `button` with `aria-expanded` and an accessible label (e.g. `Collapse Norway lane`).
- Status not conveyed by colour alone (column header text labels retained; overdue still icon + token).
- Keyboard focus rings preserved on cards, chevrons, and the Columns menu.

## 8. Package Decision

**Existing stack only.** No new dependencies — `@dnd-kit/core`, Tailwind grid utilities, shadcn/Radix dropdown, lucide chevrons are all already present.

## 9. Implementation Phases

1. **Shared core:** `jobGrouping.ts` (+ tests), `useCollapsedLanes.ts` (+ tests).
2. **Board restructure:** `BoardColumnHeader`, `BoardCell`, `BoardLane`; rewire `JobsBoard` (lanes + DnD for all groupings + hidden-columns everywhere); replace `BoardColumn`. Update board tests.
3. **Table grouping:** `JobsTable` banner rows + collapse; `JobsPage` passes `groupBy`. Table tests.
4. **Decisions + QA:** append `03-decisions.md`; full validation.

## 10. Validation Checklist

- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run test`
- Manual: columns are status in every grouping; country/company render aligned lanes with banners + counts; collapse persists and is shared board↔table; drag changes status within a lane and ignores cross-lane drops; hidden-columns menu works in all groupings; empty lanes hidden; `Unknown` last; board stays full-height + horizontally scrollable.

## 11. Open Questions / Gates

- Implementation must run on a **feature branch**, not `main`.
- `BoardColumn` removal touches `BoardColumn.test.tsx` — the test is rewritten against `BoardCell`/`BoardColumnHeader`, not deleted silently.
