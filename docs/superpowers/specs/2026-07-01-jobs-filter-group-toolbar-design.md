# CareerOps Jobs Filter/Group Toolbar Redesign — Design Spec

Date: 2026-07-01
Status: Approved direction (brainstorming), pre-implementation
Scope: Frontend only. Jobs page toolbar, filtering, grouping, and column visibility. No backend change, no API contract change, no generated `lib/api/**` edits. Backend `ListJobsQuery` filtering is left intact (still used by MCP/REST for agent parity); the board UI simply stops calling it.

Design target: a clean Jobs page header with **four controls only** — Search, Filter, Group, Add — where Filter and Group open anchored, non-blocking popovers, and applied filters render as removable chips beneath the toolbar. Filtering is uniform, data-driven, and fully client-side.

## Locked decisions (from brainstorming)

- **Anchored popovers, not modals.** Filter and Group each open a popover anchored to their icon. The board stays visible and updates live as filters change. (Rejected: centered blocking modal — hides results until closed.)
- **All categorical filters are checkboxes; options are data-driven facets.** Every categorical filter renders as a checkbox list whose options are the **distinct values present in the loaded jobs, sorted by frequency (desc), each with a count** (e.g. `Remote (14)`). No free-text guessing. (Rejected: text-contains inputs for country/company; single-select for priority/remote/employment/source.)
- **Multi-select everywhere it applies; OR within a category, AND across categories.** An empty category imposes no constraint.
- **Fully client-side filtering.** One broad param-less fetch; all filtering, faceting, and grouping happen in memory. (Rejected: per-filter server query params for the board — two code paths, refetch per toggle, and needs backend array params for the scalar filters.)
- **Salary and Applied-date stay range inputs.** Continuous values; not checkboxes. Salary compares raw numbers regardless of currency (existing limitation, flagged).
- **URL query-param persistence.** Filters + search + groupBy live in the URL (clean, only non-default keys written). Column visibility stays in `localStorage` (personal board preference, not shareable view state).
- **Columns folded into the Group popover.** The board's status-column show/hide control moves out of the board body and into the Group popover; the state is lifted into a shared hook.
- **Search stays client-side** and renders as its own chip.

---

## 1. Current state assessment

Grounded in the current code.

| Area | Current | Problem |
|---|---|---|
| Toolbar (`JobFilterBar.tsx`) | Inline: search `<Input>`, status `<Select>` (single), country chip-input, company `<Input>`, groupBy `<Select>` — all crowded into the `PageHeader` actions row. | Cluttered header; single-select status; free-text country/company (guessing); no way to combine values; no visible summary of what's applied. |
| Filter model (`jobFilters.ts`) | `search`, `status?` (single), `countries[]`, `companySearch`, `groupBy`. | Only a fraction of what filtering should offer; `status` is scalar. |
| Fetch/filter split (`JobsPage.tsx`) | Server params (`Statuses`, `Countries`, `CompanySearch`) via `ListJobsParams` → `useJobs(params)`; **search** filtered client-side over the result. | Two filtering code paths; query key changes on every server-side filter tweak → refetch; inconsistent with the client-side search. |
| Columns menu (`JobsBoard.tsx`) | Status-column show/hide lives inside the board body (top-right dropdown), state in `localStorage` (`careerops:jobs:hidden-status-columns`). | A layout control buried in the board; not reachable as a first-class toolbar concern. |
| Grouping | `buildLanes(filtered, groupBy)` already runs on the filtered set. | ✅ "Group on active filtered jobs" is already satisfied — no change needed to grouping data flow. |

Backend (`ListJobsQuery` / `JobRepository.ListAsync`) already supports rich filtering (multi-status, source, remote, employment, multi-country, company ids/search, priority, salary range, applied-date range, search). It stays as-is for MCP/REST consumers.

---

## 2. Toolbar — `JobToolbar` (replaces `JobFilterBar`)

Rendered in `PageHeader` actions. Four controls, left→right:

| Control | Behavior |
|---|---|
| **Search** (`SearchControl`) | Icon button that expands to an inline input in place (click → slide open + autofocus; `Esc` or empty-blur collapses). Debounced client-side text filter. Value shows as a chip. |
| **Filter** (`FilterPopover`) | Icon button opening an anchored popover. Shows a count badge (`Filter ·N`) when ≥1 categorical/range filter is active. |
| **Group** (`GroupPopover`) | Icon button opening an anchored popover (group-by + board columns). |
| **Add** (`JobQuickAdd`) | Existing component, unchanged. |

`JobFilterBar.tsx` is deleted. Icons via `lucide-react` (`Search`, `SlidersHorizontal`/`Filter`, `Rows3`/`Group`, `Plus`).

---

## 3. Filtering model — query & performance

**One broad fetch, everything else in memory.**

- `useJobs()` is called **with no params** → a stable, param-less query key. Toggling any filter never triggers a refetch; there is a single react-query cache entry for the job list.
- **Facets and counts are derived from the loaded jobs** in one memoized `O(n)` pass — no second API call. Country and company options come straight off each `JobDto` (`country`, `companyId` + `companyName`).
- `applyFilters(jobs, filters)` is a single predicate, memoized on `(jobs, filters)`, `O(n · categories)` — negligible for a personal tracker (hundreds of rows).

**Tradeoff (flagged):** the full job list is fetched every time. Acceptable for personal-use scale (consistent with D24's client-side-filtering precedent). If the dataset ever grows large, the intact backend `ListJobsQuery` is the fallback to reintroduce server-side filtering. YAGNI until then.

### `JobFilters` (rewritten `jobFilters.ts`)

```ts
export interface JobFilters {
  search: string;
  statuses: JobStatus[];
  priorities: Priority[];
  remoteModes: RemoteMode[];
  employmentTypes: EmploymentType[];
  sources: JobSource[];
  countries: string[];
  companyIds: number[];
  salaryMin?: number;
  salaryMax?: number;
  appliedFrom?: string; // ISO 8601 date
  appliedTo?: string;   // ISO 8601 date
  groupBy: GroupBy;
}

export const DEFAULT_FILTERS: JobFilters = {
  search: '',
  statuses: [], priorities: [], remoteModes: [],
  employmentTypes: [], sources: [], countries: [], companyIds: [],
  salaryMin: undefined, salaryMax: undefined,
  appliedFrom: undefined, appliedTo: undefined,
  groupBy: 'status',
};
```

### Pure helpers (unit-tested)

- `facets(jobs): Facets` — single pass producing, per categorical field, `{ value, label, count }[]` sorted by count desc (companies carry `id` + `name`). Options = distinct values **present in the data**; a category with no jobs yields no options.
- `applyFilters(jobs, filters): JobDto[]` — OR within each category (`arr.length === 0 || arr.includes(job.x)`), AND across categories; salary/date range comparisons; search folded in (title / company / sourceUrl / notes, case-insensitive — same fields as today).
- `activeFilterCount(filters): number` — count for the Filter badge (categorical selections + active range bounds; excludes `search` and `groupBy`).
- `filtersToChips(filters, facets): Chip[]` — chip descriptors: one chip per selected value for categorical fields; one chip per active range (salary/applied-date bounds, dates formatted locale-aware); search as its own chip. Each chip carries a `key` used by `removeChip`.
- `removeChip(filters, key): JobFilters` — returns filters with that single value/bound cleared.
- `parseFiltersFromUrl(searchParams): JobFilters` and `filtersToUrl(filters): URLSearchParams` — round-trip; csv per multi category; only non-default keys written.

---

## 4. Filter popover — `FilterPopover` + `FacetSection`

Anchored, non-blocking. One `FacetSection` per categorical filter, plus two range sections.

| Category | `JobFilters` field | Options source |
|---|---|---|
| Status | `statuses[]` | facet |
| Priority | `priorities[]` | facet |
| Remote mode | `remoteModes[]` | facet |
| Employment type | `employmentTypes[]` | facet |
| Source | `sources[]` | facet |
| Country | `countries[]` | facet (`job.country`) |
| Company | `companyIds[]` | facet (`companyId` + `companyName`) |
| Salary | `salaryMin?` / `salaryMax?` | range inputs (min / max) |
| Applied date | `appliedFrom?` / `appliedTo?` | range inputs (from / to) |

### `FacetSection` (reusable)

- Renders the **top 6** options by count; the remainder collapse behind **`+ N more`**.
- When an expanded list has **> 15 options** (mainly Company), a small **type-to-narrow box** at the top of that section filters *which checkboxes are shown* — selection is still by checkbox, no free-text data entry.
- Each option: `☐ Label (count)`. Selected options remain visible above the fold.

Popover footer: **Clear all** (resets categorical + range filters, keeps groupBy + search) and **Done** (closes).

**Flagged limitation:** salary range compares raw numeric values regardless of `salaryCurrency` (mirrors existing backend behavior). Currency-aware bands are out of scope.

---

## 5. Group popover — `GroupPopover`

- **Group by**: radio — `Status · Country · Company · Priority` (existing `GroupBy` union; grouping semantics unchanged, still per D60: board columns are always status, non-status grouping produces horizontal lanes).
- **Board columns** (folded in): checkbox list of the status columns to show/hide, labeled as affecting the board view. This lifts the board's current `localStorage`-backed hidden-status state into a shared hook `useHiddenStatuses` consumed by both `GroupPopover` and `JobsBoard`.

`useHiddenStatuses` owns the `careerops:jobs:hidden-status-columns` key (default: closed statuses hidden) and exposes `{ hiddenStatuses, toggleStatus }`. `JobsBoard` stops owning this state and reads the hook.

---

## 6. Filter chips — `FilterChips`

A row directly beneath the toolbar, rendered only when ≥1 filter (including search) is active.

- One removable chip per selected value for categorical fields (`Status: Applied ×`, `Country: Norway ×`, `Company: Acme ×`).
- One chip per active range bound (`Salary ≥ 50000 ×`, `Applied ≤ 01.06.2026 ×`). Dates in chips render via the existing locale-aware `formatDate`; only the URL/state value is ISO 8601.
- Search renders as its own chip (`"react" ×`).
- Each `×` calls `removeChip`. A trailing **Clear all** resets everything except `groupBy`.
- `groupBy` is **not** a chip — it is a view mode, reflected in the Group icon's active state.

---

## 7. Wiring

`JobsPage`:

- Replace local `useState(DEFAULT_FILTERS)` with `useJobFilters()` — a hook backed by react-router `useSearchParams` (`parseFiltersFromUrl` / `filtersToUrl`), returning `{ filters, setFilters }`.
- `const { data: jobs } = useJobs()` (param-less).
- `const facetModel = useMemo(() => facets(jobs ?? []), [jobs])`.
- `const filtered = useMemo(() => applyFilters(jobs ?? [], filters), [jobs, filters])`.
- Header actions: `<JobToolbar filters={filters} facets={facetModel} onChange={setFilters} />`; below it `<FilterChips filters={filters} facets={facetModel} onChange={setFilters} />`.
- Board/Table receive `filtered` and `filters.groupBy` as today.

`JobsBoard`:

- Reads `useHiddenStatuses()` instead of owning hidden-status state; the in-body "Columns" dropdown is removed (moved to `GroupPopover`).
- The DnD optimistic update keys off the same **param-less** `getListJobsQueryKey()` used by `useJobs()` (single stable key), keeping the optimistic write consistent.

`filtersToParams` and all `ListJobsParams` usage on the Jobs page are deleted.

---

## 8. Component / file plan

New:
- `features/jobs/JobToolbar.tsx`
- `features/jobs/SearchControl.tsx`
- `features/jobs/FilterPopover.tsx`
- `features/jobs/FacetSection.tsx`
- `features/jobs/GroupPopover.tsx`
- `features/jobs/FilterChips.tsx`
- `features/jobs/useHiddenStatuses.ts`
- `features/jobs/useJobFilters.ts`

Rewritten:
- `features/jobs/jobFilters.ts` (new `JobFilters`, `facets`, `applyFilters`, `activeFilterCount`, `filtersToChips`, `removeChip`, URL round-trip).

Deleted:
- `features/jobs/JobFilterBar.tsx`

Edited:
- `pages/JobsPage.tsx` (use `useJobFilters`, param-less fetch, `applyFilters`, new toolbar + chips)
- `features/jobs/JobsBoard.tsx` (lifted hidden-status hook, remove in-body Columns menu, param-less query key)

shadcn primitives needed: `popover`, `checkbox`. Add via the shadcn CLI (D19 — no hand-authored deps). Reuse existing `badge`, `button`, `input`, `label`, `select`, `separator`.

---

## 9. Testing (TDD)

Unit (pure):
- `facets()` — distinct values, correct counts, frequency-desc sort, company id+name, empty input.
- `applyFilters()` — each category independently; OR within a category; AND across categories; salary/date range bounds; search field coverage; empty filters = identity.
- `activeFilterCount()`, `filtersToChips()`, `removeChip()` — including range chips and search chip.
- URL round-trip: `parseFiltersFromUrl(filtersToUrl(f))` equals `f`; defaults omitted from the URL.

Component:
- `FacetSection` — top-6 render, `+ N more` expand, type-to-narrow box for > 15 options, checkbox toggle → `onChange`.
- `FilterPopover` — toggling an option updates filters; Clear all; badge count.
- `GroupPopover` — group-by radio; column checkbox toggles `useHiddenStatuses`.
- `FilterChips` — renders active chips (incl. search + range), `×` removes one value, Clear all.
- `SearchControl` — expand/collapse, debounced change.

Update:
- `JobsBoard.test` — lifted hidden-status hook; param-less query key; no in-body Columns menu.
- Remove/replace any `JobFilterBar`-dependent expectations.

`just verify` must pass.

---

## 10. Out of scope

- Any backend / `ListJobsQuery` / repository change.
- Server-side board filtering or pagination.
- Company multi-select sourced from a separate `/companies` fetch (options are derived from loaded jobs).
- Dynamic (faceted) counts that recompute against other active selections — counts are over the full loaded set. Noted as a possible future refinement.
- Currency-aware salary bands.
- Saved/named filter presets beyond what the URL already provides.

## 11. Open questions

None blocking. Facet counts are static (full-set) by decision; revisit dynamic faceting only if the static counts prove misleading in use.
