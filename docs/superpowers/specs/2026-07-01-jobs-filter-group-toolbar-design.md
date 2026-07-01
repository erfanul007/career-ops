# CareerOps Jobs Filter/Group Toolbar Redesign — Design Spec

Date: 2026-07-01
Status: Implemented (see decision D62). **Amendment:** during planning the user chose an **always-visible search `Input`** folded into `JobToolbar` over the click-to-expand `SearchControl` described in §2/§7, with **no debounce** (`replace:true` prevents history spam). Where this spec still says "expanding `SearchControl`", read "always-visible search field"; there is no separate `SearchControl` component. Search still renders as its own chip.
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

### Refinements from review (2026-07-01)

Incorporated after external review:

1. **`companyIds: string[]`**, not `number[]` — `JobDto.companyId` is `number | string`; compare via `String(job.companyId)` to avoid casts and URL-parse mismatch.
2. **`GroupBy` moves into `jobFilters.ts`** (it is a `JobFilters` field). The 5 current importers (`JobsBoard`, `jobGrouping`, `JobsTable`, `useCollapsedLanes`, and the deleted `JobFilterBar`) repoint to it. *(Differ from review: no new `jobTypes.ts` — one union does not warrant a file.)*
3. **URL uses repeated params, not CSV** — `?status=Applied&status=Interviewing`, parsed with `URLSearchParams.getAll()`. Robust against comma-bearing values; native idiom.
4. **Salary filter = range overlap**, not naive floor/ceiling (see §3).
5. **Applied-date filter = `YYYY-MM-DD` string compare**, inclusive both bounds (see §3).
6. **All filter/search/group URL writes use `replace: true`** — no browser-history spam. `SearchControl` holds local input state (instant feel) and commits debounced (~250 ms).
7. **`GroupPopover` columns section gets a single "Reset to default"** action (default = closed statuses hidden). *(Differ from review: one reset, not both "Show all" + "Reset default" — KISS.)*
8. **Add shadcn `radio-group`** for the group-by control (accessible single-select in the popover).
9. **Stale/absent selected values stay removable** — `filtersToChips` builds chips from the *selected values*, not from facets; facets only supply labels/counts. Unknown company id → `Company #<id>`, unknown country/source/etc. → raw value. `FacetSection` pins selected values to the top even when absent from the loaded data (see §4, §6).
10. **Preserve the board's lane/grid model and cross-lane drag guard** — only lift hidden-status state out and remove the in-body Columns dropdown (see §7).

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
// GroupBy is defined here (moved out of JobsBoard); it is a JobFilters field.
export type GroupBy = 'status' | 'country' | 'company' | 'priority';

export interface JobFilters {
  search: string;
  statuses: JobStatus[];
  priorities: Priority[];
  remoteModes: RemoteMode[];
  employmentTypes: EmploymentType[];
  sources: JobSource[];
  countries: string[];
  companyIds: string[];  // String(job.companyId) — DTO id is number | string
  salaryMin?: number;
  salaryMax?: number;
  appliedFrom?: string; // YYYY-MM-DD (date input value)
  appliedTo?: string;   // YYYY-MM-DD (date input value)
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

- `toNumberOrNull(v: number | string | null | undefined): number | null` — normalizes the generated `number | string | null` numeric fields (salary) before comparison.
- `facets(jobs): Facets` — single pass producing, per categorical field, `{ value, label, count }[]` sorted by count desc (companies carry `id` = `String(companyId)` + `name`). Options = distinct values **present in the data**; a category with no jobs yields no options.
- `applyFilters(jobs, filters): JobDto[]` — OR within each category (`arr.length === 0 || arr.includes(key(job))`), AND across categories; companies compared as `String(job.companyId)`; search folded in (title / company / sourceUrl / notes, case-insensitive — same fields as today). Range semantics:
  - **Salary — range overlap** (not naive floor/ceiling). With `min = toNumberOrNull(job.salaryMin)`, `max = toNumberOrNull(job.salaryMax)`:
    - `salaryMin` bound: keep if `(max ?? min) >= filter.salaryMin`.
    - `salaryMax` bound: keep if `(min ?? max) <= filter.salaryMax`.
    - a job with both salary values null fails any active salary bound.
    - Rationale: filtering "≥ 100k" must keep an 80k–120k posting (it can pay 100k); the naive backend `SalaryMin >= x` would wrongly drop it. Board is its own consumer, so diverging from the backend predicate is intentional. Currency is ignored (existing limitation).
  - **Applied date — `YYYY-MM-DD` string compare** on `d = job.appliedAtUtc?.slice(0, 10)`:
    - `appliedFrom` inclusive: keep if `d && d >= appliedFrom`.
    - `appliedTo` inclusive: keep if `d && d <= appliedTo`.
    - a job with null `appliedAtUtc` fails any active applied-date bound. (UTC-date basis; deterministic, no timezone math.)
- `activeFilterCount(filters): number` — count for the Filter badge (categorical selections + active range bounds; excludes `search` and `groupBy`).
- `filtersToChips(filters, facets): Chip[]` — chip descriptors built from the **selected values in `filters`** (not from facets), so a value absent from the loaded data still yields a removable chip. Facets supply labels/counts; fallback labels: company → `Company #<id>` when the id is not in facets, other categoricals → the raw value. One chip per selected categorical value; one chip per active range bound (salary; applied-date formatted locale-aware); search as its own chip. Each chip carries a `key` used by `removeChip`.
- `removeChip(filters, key): JobFilters` — returns filters with that single value/bound cleared.
- `parseFiltersFromUrl(searchParams): JobFilters` and `filtersToUrl(filters): URLSearchParams` — round-trip. **Repeated params for multi categories** (`getAll()`), single params for search/ranges/groupBy; only non-default keys written. Keys: `q`, `status`, `priority`, `remote`, `employment`, `source`, `country`, `company`, `salmin`, `salmax`, `appliedfrom`, `appliedto`, `group`.

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

- **Selected values pin to the top** and stay visible — including a value absent from the loaded data (label falls back per `filtersToChips`: `Company #<id>` / raw value), so it is always uncheckable here as well as via its chip. No invisible dead-end filters.
- Below the pinned selection, renders the **top 6** options by count; the remainder collapse behind **`+ N more`**.
- When an expanded list has **> 15 options** (mainly Company), a small **type-to-narrow box** at the top of that section filters *which checkboxes are shown* — selection is still by checkbox, no free-text data entry.
- Each option: `☐ Label (count)`.

Popover footer: **Clear all** (resets categorical + range filters, keeps groupBy + search) and **Done** (closes).

**Flagged limitation:** the salary predicate is range-overlap (§3), and it compares raw numeric values **regardless of `salaryCurrency`** — currency is the part that mirrors existing backend behavior. Currency-aware comparison/bands are out of scope.

---

## 5. Group popover — `GroupPopover`

- **Group by**: a shadcn **`radio-group`** — `Status · Country · Company · Priority` (`GroupBy` union; grouping semantics unchanged, still per D60: board columns are always status, non-status grouping produces horizontal lanes). Radio-group gives correct keyboard/ARIA single-select in the popover.
- **Board columns** (folded in): checkbox list of the status columns to show/hide, labeled as affecting the board view, plus a single **"Reset to default"** action. This lifts the board's current `localStorage`-backed hidden-status state into a shared hook `useHiddenStatuses` consumed by both `GroupPopover` and `JobsBoard`.

`useHiddenStatuses` owns the `careerops:jobs:hidden-status-columns` key (default: closed statuses hidden) and exposes `{ hiddenStatuses, toggleStatus, reset }` (`reset` restores the default). `JobsBoard` stops owning this state and reads the hook.

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

- Replace local `useState(DEFAULT_FILTERS)` with `useJobFilters()` — a hook where **`useSearchParams` is the source of truth** (`parseFiltersFromUrl` / `filtersToUrl`), returning `{ filters, setFilters }`. **All writes use `setSearchParams(next, { replace: true })`** so filter/group/search changes never push browser-history entries.
- `const { data: jobs } = useJobs()` (param-less).
- `const facetModel = useMemo(() => facets(jobs ?? []), [jobs])`.
- `const filtered = useMemo(() => applyFilters(jobs ?? [], filters), [jobs, filters])`.
- Header actions: `<JobToolbar filters={filters} facets={facetModel} onChange={setFilters} />`; below it `<FilterChips filters={filters} facets={facetModel} onChange={setFilters} />`.
- Board/Table receive `filtered` and `filters.groupBy` as today.

`SearchControl`:

- Holds **local input state** for an instant-feeling field; commits to `filters.search` **debounced (~250 ms)** via `onChange`. Local state seeds from `filters.search` so a URL-loaded search shows in the field. (Filtering follows the debounced commit — imperceptible for a client-side set.)

`JobsBoard`:

- Reads `useHiddenStatuses()` instead of owning hidden-status state; the in-body "Columns" dropdown is removed (moved to `GroupPopover`).
- **The lane/grid model and DnD behavior are preserved unchanged** — non-status groupings still render horizontal lanes, and the cross-lane drop guard (`laneKeyOf(job, groupBy) !== toLaneKey`) stays. This is *not* a revert to status-only columns; the only board changes are lifting hidden-status state and removing the in-body dropdown.
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
- `features/jobs/jobFilters.ts` (owns `GroupBy`; new `JobFilters`, `toNumberOrNull`, `facets`, `applyFilters`, `activeFilterCount`, `filtersToChips`, `removeChip`, URL round-trip).

Deleted:
- `features/jobs/JobFilterBar.tsx`

Edited:
- `pages/JobsPage.tsx` (use `useJobFilters`, param-less fetch, `applyFilters`, new toolbar + chips)
- `features/jobs/JobsBoard.tsx` (lifted hidden-status hook, remove in-body Columns menu, param-less query key; lane/grid + DnD preserved)
- `features/jobs/jobGrouping.ts`, `features/jobs/JobsTable.tsx`, `features/jobs/useCollapsedLanes.ts` — repoint `import type { GroupBy }` from `./JobsBoard` to `./jobFilters` (mechanical).

shadcn primitives needed: `popover`, `checkbox`, `radio-group`. Add via the shadcn CLI (D19 — no hand-authored deps). Reuse existing `badge`, `button`, `input`, `label`, `separator`.

---

## 9. Testing (TDD)

Unit (pure):
- `toNumberOrNull()` — number, numeric string, null/undefined.
- `facets()` — distinct values, correct counts, frequency-desc sort, company `String(id)`+name, empty input.
- `applyFilters()` — each category independently; OR within a category; AND across categories; search field coverage; empty filters = identity. **Salary overlap**: `80k–120k` kept by `salaryMin=100k` and by `salaryMax=150k`; both-null salary dropped when a bound is set. **Applied date**: inclusive `from`/`to` on `appliedAtUtc.slice(0,10)`; null `appliedAtUtc` dropped when a bound is set.
- `activeFilterCount()`, `filtersToChips()`, `removeChip()` — including range chips and search chip; **stale value** (company id / country not in facets) still yields a removable chip with fallback label.
- URL round-trip: `parseFiltersFromUrl(filtersToUrl(f))` equals `f`; **repeated params** for multi categories (`getAll`); defaults omitted from the URL.

Component:
- `FacetSection` — top-6 render, `+ N more` expand, type-to-narrow box for > 15 options, checkbox toggle → `onChange`, **selected value pinned to top even when absent from options**.
- `FilterPopover` — toggling an option updates filters; Clear all; badge count.
- `GroupPopover` — group-by radio-group; column checkbox toggles `useHiddenStatuses`; **"Reset to default"** restores default hidden set.
- `FilterChips` — renders active chips (incl. search + range), `×` removes one value, Clear all, **stale value chip renders + removes**.
- `SearchControl` — expand/collapse, debounced commit, seeds from `filters.search`.

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
