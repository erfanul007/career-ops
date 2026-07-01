# Jobs: Configurable Sort — Design Spec

**Date:** 2026-07-01
**Status:** Approved (design)
**Branch:** `feat/jobs-filter-group-toolbar` (extends the filter/group/view toolbar work; unmerged)

## Problem

The Jobs page has no configurable sort. Every view uses one hardcoded order: `buildLanes`
(`jobGrouping.ts:24`) sorts all jobs by `updatedAtUtc` descending, then groups them into lanes.
The user cannot reorder by application date, company, priority, or salary. Both the board and
the table inherit this single fixed order.

## Goal

Add a configurable sort to the Jobs page:
- A **separate Sort popover** in the toolbar (next to Filter and Group).
- Choose a **field** and a **direction** (ascending/descending).
- Applies to **both views** from one shared setting (consistent with how `groupBy` is shared).
- **Client-side only** — no backend, API, orval, or migration changes.

## Users

Single user (personal job tracker). No multi-user/auth concerns.

## Current state (as-built)

- `jobGrouping.ts:23–45` — `buildLanes(jobs, groupBy)` sorts the full array by `updatedAtUtc`
  descending (`jobGrouping.ts:24`), then groups into lanes. This is the *only* sort in the app.
- `JobsBoard.tsx:42` and `JobsTable.tsx:95` both call `buildLanes`. Neither view has a
  row-level sort; lane order is fixed and rows within a lane follow the global `updatedAtUtc`
  order.
- Filtering is fully client-side (`applyFilters`, `jobFilters.ts:77–109`); all jobs are fetched
  once with no server params (`useJobs`, no args).
- `jobFilters.ts:4` — `groupBy` (a view-arrangement concern, not a filter) already lives inside
  the `JobFilters` model and is persisted to the URL by `useJobFilters` (`filtersToUrl` /
  `parseFiltersFromUrl`). This is the precedent the sort setting follows.
- Backend `JobRepository.cs:62` hardcodes `OrderByDescending(UpdatedAtUtc)`. Untouched by this
  work (client-side sort operates on the already-fetched list).

## Decisions (from brainstorming, locked)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Separate Sort popover** in the toolbar (not merged into Filter or Group) | Sort orders the set; filter reduces it — distinct concerns. Symmetric with the existing Filter and Group popovers; discoverable. |
| 2 | **Client-side** comparator; no backend/orval/migration | Filtering is already client-side and all jobs are loaded at once. Personal-scale data; server-side sort would add query/endpoint/repo/orval churn for no benefit. |
| 3 | **Shared across both views** (one setting drives board lanes and table rows) | Both views order via the same `buildLanes`. Consistent with `groupBy`, which is already shared. |
| 4 | **Lean field set (5):** Updated, Applied, Company, Priority, Salary | Covers the common ordering needs without cluttering the popover. `id` and `location` (composite) excluded. |
| 5 | **Persist to the URL** (alongside filter + `groupBy`) | One coherent, bookmarkable view-state. `groupBy` already sets the precedent. |
| 6 | **Default = Updated, descending** | Byte-for-byte equal to today's hardcoded order → zero visible change until the user picks a sort; no regression baseline. |
| 7 | **Nulls always sort last**, regardless of direction | Missing Applied/Salary rows sink to the bottom in both directions — the useful behavior. |

## Architecture

### 1. Sort model — single source of truth

New `jobSort.ts`:

```ts
export type SortField = 'updated' | 'applied' | 'company' | 'priority' | 'salary';
export type SortDir = 'asc' | 'desc';
export interface JobSort { field: SortField; dir: SortDir; }

export const DEFAULT_SORT: JobSort = { field: 'updated', dir: 'desc' };

export const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: 'updated',  label: 'Updated' },
  { value: 'applied',  label: 'Applied' },
  { value: 'company',  label: 'Company' },
  { value: 'priority', label: 'Priority' },
  { value: 'salary',   label: 'Salary' },
];

export function compareJobs(sort: JobSort): (a: JobDto, b: JobDto) => number;
```

`compareJobs` returns a comparator. Per-field value extraction:

| Field | Value | Type | Comparison |
|-------|-------|------|------------|
| `updated` | `updatedAtUtc` (non-null ISO) | string | `localeCompare` |
| `applied` | `appliedAtUtc` (nullable ISO) | string \| null | `localeCompare`, nulls last |
| `company` | `companyName` | string | `localeCompare` |
| `priority` | `priority` | enum | natural order (see note) |
| `salary` | `salaryMax ?? salaryMin` | number \| null | numeric, nulls last |

- **Nulls last:** if exactly one side is null, the null sorts after the non-null regardless of
  `dir`. If both null, treat as equal (0).
- **Direction:** compute the ascending result, then negate for `desc`. Null-last handling is
  applied *before* direction negation so nulls stay last in both directions.
- **Salary coercion:** the DTO types `salaryMin`/`salaryMax` as `number | string | null`.
  Coerce the chosen value with `Number(...)`; treat `null`/`undefined` as null (last).
- **Priority note:** order by the enum's defined severity. The implementer must verify how
  `Priority` is represented in `jobDto` — a numeric enum sorts by its int value directly; a
  string union requires an explicit order array in `jobSort.ts`. Resolve this against the actual
  type during implementation; do not assume.

### 2. Sort applies within lanes

Both views always group into lanes (there is no "no grouping" mode). Sort orders the **rows
within** each lane; lane order itself is unchanged. Because `buildLanes` already sorts the full
array *before* grouping (and grouping preserves input order within a group), the change is
surgical: replace the hardcoded `updatedAtUtc` sort at `jobGrouping.ts:24` with
`compareJobs(sort)`.

New signature: `buildLanes(jobs, groupBy, sort)`.

### 3. State + persistence

`JobFilters` gains `sortField: SortField` and `sortDir: SortDir` (defaults `'updated'` /
`'desc'`). `useJobFilters` parses them from the URL and encodes them back, following the existing
`filtersToUrl` / `parseFiltersFromUrl` param-naming convention. Invalid or absent values fall
back to `DEFAULT_SORT`.

### 4. Sort popover

New `SortPopover.tsx`, structure mirroring `GroupPopover`:
- Field radio group driven by `SORT_FIELDS` (checked = current `sort.field`).
- Direction segmented control: **Desc** / **Asc**.
- **Reset** → `DEFAULT_SORT`.
- Props: `{ sort: JobSort; onChange: (sort: JobSort) => void }`.

### 5. Wiring

`JobsPage` derives `sort = { field: filters.sortField, dir: filters.sortDir }`, passes `sort` +
`onSortChange` (updates the two filter fields → re-encodes URL) to `JobToolbar`, and passes
`sort` to `JobsBoard` and `JobsTable`. `JobToolbar` mounts `SortPopover` next to the Group
popover. `JobsBoard` and `JobsTable` forward `sort` into their `buildLanes` calls.

## Data flow

```
useJobFilters (+ sortField, sortDir in URL)
      │  sort = { field, dir }
      ├─▶ JobToolbar ─▶ SortPopover (field radio + Desc/Asc toggle + Reset)
      └─▶ JobsBoard / JobsTable ─▶ buildLanes(jobs, groupBy, sort) ─▶ compareJobs(sort)
```

## Edge cases

- **Missing values** (null `appliedAtUtc`, null salary) → sort last in both directions.
- **Sort field == group field** (e.g. sort by Company while grouped by Company) → harmless;
  rows within each single-company lane are already homogeneous on that field, order is stable.
- **Invalid/absent URL sort params** → fall back to `DEFAULT_SORT`.
- **Default sort** (`updated`/`desc`) produces the exact current ordering → no visible change
  until the user chooses a sort.

## Out of scope

- Server-side sort (query/endpoint/repository/orval).
- A "no grouping" flat list (sort remains within lanes).
- Per-column clickable table headers (can later drive this same shared sort state).
- Multi-key / secondary sort.
- Changing lane order (only within-lane row order is sorted).

## Testing

- `compareJobs` — each of the 5 fields, both directions; nulls-last for `applied` and `salary`;
  salary string/number coercion; priority order.
- `useJobFilters` — URL round-trip includes `sortField`/`sortDir`; invalid value → `DEFAULT_SORT`.
- `SortPopover` — renders `SORT_FIELDS`; field radio reflects `sort.field`; direction toggle and
  Reset fire `onChange` with the expected `JobSort`.
- `jobGrouping` (`buildLanes`) — rows within a lane follow `compareJobs(sort)`; default sort
  preserves the current `updatedAtUtc` desc order (regression guard).
- Existing `JobsTable` / `JobsBoard` / `useJobFilters` suites remain green.
- `just verify` green at the end.

## Open questions

None. All decisions locked above.
