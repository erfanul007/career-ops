# Jobs: View-Aware Column Toggle — Design Spec

**Date:** 2026-07-01
**Status:** Approved (design)
**Branch:** `feat/jobs-filter-group-toolbar` (extends the filter/group toolbar work; unmerged)

## Problem

The Group popover shows a **"Board columns"** section — checkboxes that show/hide the
Kanban status lanes. It is always shown, regardless of which view is active. But the Jobs
page has two views (Board, Table), and a table's "columns" are data fields
(Company, Title, Salary, …), not status lanes. In Table view the section is meaningless:
it toggles board lanes the user cannot see.

## Goal

Make the popover's column section **view-aware**:
- **Board view** → "Board columns" (status-lane show/hide). Unchanged behavior.
- **Table view** → "Table columns" (data-field show/hide). Same checkbox + Reset UX.

## Users

Single user (personal job tracker). No multi-user/auth concerns.

## Current state (as-built)

- `JobsPage.tsx` — view toggle is an **uncontrolled** radix `Tabs` (`defaultValue="board"`),
  local to the tab widget. `GroupPopover` lives in the header (`JobToolbar`), *outside* the
  tabs, so it cannot observe the active view.
- `GroupPopover.tsx` — renders a group-by radio group + a hardcoded "Board columns" section
  driven by `ALL_STATUSES` + `hiddenStatuses`/`onToggleStatus`/`onResetColumns`.
- `useHiddenStatuses.ts` — localStorage-backed hidden-set over `JobStatus`; default hidden =
  the 4 closed statuses.
- `JobsTable.tsx` — **10 fixed columns** (ID, Company, Title, Status, Priority, Location,
  Salary, Applied, Next action, + actions menu). No show/hide. `COLS = 10` hardcoded for the
  grouped-lane header `colSpan`.

## Decisions (from brainstorming, locked)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Nothing locked** — all 9 data columns are toggleable | Symmetric with the board (which permits hiding every status lane); simplest mental model. |
| 2 | **Default-hidden table columns = `id`, `nextAction`** | Leaner first-load table; user opts them back in. |
| 3 | **Persist active view** to localStorage (`careerops:jobs:view`) | Consistent with hidden-column prefs; reopen where left off. |
| 4 | Column section is **view-agnostic** in `GroupPopover` (generic descriptor) | Decouples the popover from status specifics; one render path for both sections. |

## Architecture

### 1. Lift + persist the view
New `useJobsView` hook: localStorage key `careerops:jobs:view`, default `board`, invalid →
`board`. `JobsPage` makes `Tabs` **controlled** (`value={view} onValueChange={setView}`),
so the active view is available to the header toolbar.

### 2. Generic hidden-set hook
Extract `useHiddenSet<T extends string>(storageKey, all, defaultHidden)` — the
load/persist/toggle/reset logic `useHiddenStatuses` already contains, parameterized over a
known value universe. `useHiddenStatuses` becomes a thin wrapper (behavior identical; its
existing tests are the regression guard). Add `useHiddenTableColumns` as a second wrapper.

### 3. Table column metadata — single source of truth
New `jobTableColumns.ts`:
- `TableColumnKey` — union: `'id' | 'company' | 'title' | 'status' | 'priority' | 'location' | 'salary' | 'applied' | 'nextAction'`.
- `TABLE_COLUMNS: { key: TableColumnKey; label: string }[]` — ordered, matches current header order.
- `DEFAULT_HIDDEN_TABLE_COLUMNS: TableColumnKey[] = ['id', 'nextAction']`.

Imported by `useHiddenTableColumns`, `JobsPage` (to build the descriptor), and `JobsTable`
(to render). No desync.

### 4. View-agnostic GroupPopover
`GroupPopover` stops importing `ALL_STATUSES`/`JobStatus`. It renders one generic descriptor:

```ts
interface ColumnsSection {
  title: string;                       // "Board columns" | "Table columns"
  options: { value: string; label: string }[];
  hidden: string[];
  onToggle: (value: string) => void;
  onReset: () => void;
}
```

`JobsPage` builds the board or table descriptor based on `view` and passes it through
`JobToolbar` → `GroupPopover`. The group-by radio group is unchanged (grouping applies to
both views).

### 5. Data-driven JobsTable
`JobsTable` gains a `hiddenColumns: TableColumnKey[]` prop. A per-key cell renderer preserves
every existing cell behavior:
- `id` → `JOB-{id}` link (opens new tab, `stopPropagation`)
- `company` → `companyName` (font-medium)
- `title` → `title`
- `status` → `JobStatusDropdown` (`stopPropagation`)
- `priority` → `JobPriorityDropdown` (`stopPropagation`)
- `location` → city/country + remoteMode suffix
- `salary` → `formatSalary` right-aligned tabular-nums
- `applied` → `formatDate(appliedAtUtc)`
- `nextAction` → `formatDate(nextActionAtUtc)` + overdue `TriangleAlert`/destructive styling

Header and rows both iterate `TABLE_COLUMNS.filter(c => !hidden.includes(c.key))`. The
**actions menu** is a structural always-on trailing column, not in `TABLE_COLUMNS`. The
grouped-lane header `colSpan` = `visibleColumns.length + 1` (dynamic; no hardcoded `COLS`).

## Data flow

```
useJobsView ─┐
             ├─ JobsPage builds ColumnsSection (board|table) ─→ JobToolbar ─→ GroupPopover
useHiddenStatuses (board) ─┤                                                    (renders section)
useHiddenTableColumns (table) ─┘
                    │
                    └─→ JobsTable(hiddenColumns)   JobsBoard(hiddenStatuses)  (unchanged)
```

## Edge cases

- **All table columns hidden** → table shows only the actions column. Permitted (symmetric
  with an empty board). Reset restores defaults; actions column always renders, so the table
  never fully collapses. No special empty-state.
- **Grouped table** (`groupBy !== 'status'`) → lane header `colSpan` follows visible count.
- **Invalid/absent localStorage** → hooks fall back to defaults (existing `useHiddenSet`
  pattern: try/catch, array + membership validation).

## Out of scope

- Column reordering, resizing, or persistence of order.
- Per-view grouping (grouping stays shared across views).
- Board lane show/hide changes (behavior unchanged).
- URL-persisted view (localStorage only).

## Testing

- `useHiddenSet` — default, toggle on/off, reset, invalid-parse fallback.
- `useHiddenStatuses` — existing tests remain green (behavior unchanged).
- `useHiddenTableColumns` — default hidden = `['id','nextAction']`, toggle, reset.
- `useJobsView` — default `board`, set persists, invalid value → `board`.
- `jobTableColumns` — every `TABLE_COLUMNS` key has a `JobsTable` renderer (desync guard).
- `GroupPopover` — renders descriptor title + options; toggle + reset fire callbacks.
- `JobsTable` — hidden columns absent from header + body; visible present; grouped
  `colSpan` = visible + 1.
- `just verify` green at the end.

## Open questions

None. All decisions locked above.
