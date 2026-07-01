# Jobs Filter/Group Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the crowded inline `JobFilterBar` with a clean Jobs toolbar — always-visible search + Filter popover + Group popover + Add — backed by data-driven checkbox facets, client-side multi-select filtering, URL persistence, and a chip summary row.

**Architecture:** One broad param-less `useJobs()` fetch; all filtering/faceting/grouping happen in memory via pure helpers in `jobFilters.ts`. Filter state lives in the URL (`useJobFilters` over `useSearchParams`, `replace:true`). The board's status-column visibility is lifted into `useHiddenStatuses` and surfaced in the Group popover. Backend `ListJobsQuery` is untouched (still serves MCP/REST).

**Tech Stack:** React 19, TypeScript, react-router 8 (`useSearchParams`), TanStack Query 5, shadcn/radix-nova primitives, lucide icons, vitest + Testing Library + user-event, date-fns (via existing `@/lib/format`).

Spec: `docs/superpowers/specs/2026-07-01-jobs-filter-group-toolbar-design.md`.

## Global Constraints

- **Frontend only.** No backend/`ListJobsQuery`/API/`lib/api/**` (orval-generated) edits.
- **No new runtime dependencies.** Only shadcn primitives added via the shadcn CLI (D19 — never hand-author deps).
- Clean code: KISS/YAGNI, small focused files, comment the non-obvious *why* only.
- English everywhere. ISO 8601 dates in technical contexts (URL/state); user-facing dates/numbers formatted locale-aware via existing `@/lib/format` (`formatDate`, `formatNumber`) — never hardcode separators.
- Never reorder/renumber enum members (N/A here — no enum edits).
- Tests included with non-trivial changes.
- **Verification approach:** the `jobFilters.ts` type rewrite (Task 1) intentionally ripples into `JobsPage`/`JobFilterBar`, which are swapped/deleted in Task 11. Therefore per-task verification runs that task's **vitest** suite (esbuild transform — no typecheck). Project `npm run typecheck`, `npm run build`, and `just verify` are run and must pass **at Task 11**.
- Per-file test run: `cd frontend && npx vitest run <path>`. Full suite: `cd frontend && npm run test`.

---

### Task 1: `jobFilters.ts` — types, `toNumberOrNull`, `facets`; repoint `GroupBy`

**Files:**
- Modify (rewrite): `frontend/src/features/jobs/jobFilters.ts`
- Modify: `frontend/src/features/jobs/JobsBoard.tsx` (remove `export type GroupBy`, import it from `./jobFilters`)
- Modify: `frontend/src/features/jobs/jobGrouping.ts`, `frontend/src/features/jobs/JobsTable.tsx`, `frontend/src/features/jobs/useCollapsedLanes.ts` (repoint `GroupBy` import)
- Test: `frontend/src/features/jobs/jobFilters.test.ts`

**Interfaces:**
- Produces: `GroupBy`, `JobFilters`, `DEFAULT_FILTERS`, `FacetOption`, `Facets`, `Chip`, `toNumberOrNull(v)`, `facets(jobs): Facets`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/jobs/jobFilters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { facets, toNumberOrNull } from './jobFilters';
import type { JobDto } from '@/lib/api/model';

const job = (over: Partial<JobDto> = {}): JobDto => ({
  id: 1, companyId: 1, companyName: 'Northwind Synthetics', title: 'Role', status: 'Applied',
  priority: 'Medium', source: 'CompanySite', sourceUrl: null, country: 'Norway', city: null,
  locationText: null, remoteMode: 'Remote', employmentType: 'FullTime', salaryMin: null, salaryMax: null,
  salaryCurrency: null, salaryPeriod: 'Annual', deadlineAtUtc: null, appliedAtUtc: null,
  lastContactedAtUtc: null, nextActionAtUtc: null, fitScore: null, notes: null,
  createdAtUtc: '2026-06-01T00:00:00Z', updatedAtUtc: '2026-06-01T00:00:00Z', ...over,
});

describe('toNumberOrNull', () => {
  it('handles number, numeric string, null, empty', () => {
    expect(toNumberOrNull(50000)).toBe(50000);
    expect(toNumberOrNull('50000')).toBe(50000);
    expect(toNumberOrNull(null)).toBeNull();
    expect(toNumberOrNull(undefined)).toBeNull();
    expect(toNumberOrNull('')).toBeNull();
    expect(toNumberOrNull('nope')).toBeNull();
  });
});

describe('facets', () => {
  it('counts distinct values, sorts by count desc, derives country/company from data', () => {
    const jobs = [
      job({ status: 'Applied', country: 'Norway', companyId: 1, companyName: 'Acme' }),
      job({ status: 'Applied', country: 'Germany', companyId: 2, companyName: 'Globex' }),
      job({ status: 'Offered', country: 'Norway', companyId: 1, companyName: 'Acme' }),
    ];
    const f = facets(jobs);
    expect(f.statuses).toEqual([
      { value: 'Applied', label: 'Applied', count: 2 },
      { value: 'Offered', label: 'Offered', count: 1 },
    ]);
    expect(f.countries.map(o => o.value)).toEqual(['Norway', 'Germany']);
    expect(f.companies).toEqual([
      { value: '1', label: 'Acme', count: 2 },
      { value: '2', label: 'Globex', count: 1 },
    ]);
  });

  it('excludes null country and returns no options for empty input', () => {
    expect(facets([]).statuses).toEqual([]);
    expect(facets([job({ country: null })]).countries).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/jobFilters.test.ts`
Expected: FAIL (`facets`/`toNumberOrNull` not exported / old file shape).

- [ ] **Step 3: Rewrite `jobFilters.ts`**

Replace the entire contents of `frontend/src/features/jobs/jobFilters.ts` with:

```ts
import type { JobDto, JobStatus, Priority, RemoteMode, EmploymentType, JobSource } from '@/lib/api/model';

export type GroupBy = 'status' | 'country' | 'company' | 'priority';

export interface JobFilters {
  search: string;
  statuses: JobStatus[];
  priorities: Priority[];
  remoteModes: RemoteMode[];
  employmentTypes: EmploymentType[];
  sources: JobSource[];
  countries: string[];
  companyIds: string[]; // String(job.companyId) — DTO id is number | string
  salaryMin?: number;
  salaryMax?: number;
  appliedFrom?: string; // YYYY-MM-DD
  appliedTo?: string;   // YYYY-MM-DD
  groupBy: GroupBy;
}

export const DEFAULT_FILTERS: JobFilters = {
  search: '',
  statuses: [], priorities: [], remoteModes: [], employmentTypes: [],
  sources: [], countries: [], companyIds: [],
  salaryMin: undefined, salaryMax: undefined, appliedFrom: undefined, appliedTo: undefined,
  groupBy: 'status',
};

export interface FacetOption { value: string; label: string; count: number; }
export interface Facets {
  statuses: FacetOption[];
  priorities: FacetOption[];
  remoteModes: FacetOption[];
  employmentTypes: FacetOption[];
  sources: FacetOption[];
  countries: FacetOption[];
  companies: FacetOption[];
}

export interface Chip { key: string; label: string; }

export function toNumberOrNull(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function countBy(jobs: JobDto[], pick: (j: JobDto) => { value: string; label: string } | null): FacetOption[] {
  const map = new Map<string, FacetOption>();
  for (const j of jobs) {
    const hit = pick(j);
    if (!hit) continue;
    const existing = map.get(hit.value);
    if (existing) existing.count += 1;
    else map.set(hit.value, { value: hit.value, label: hit.label, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function facets(jobs: JobDto[]): Facets {
  return {
    statuses: countBy(jobs, j => ({ value: j.status, label: j.status })),
    priorities: countBy(jobs, j => ({ value: j.priority, label: j.priority })),
    remoteModes: countBy(jobs, j => ({ value: j.remoteMode, label: j.remoteMode })),
    employmentTypes: countBy(jobs, j => ({ value: j.employmentType, label: j.employmentType })),
    sources: countBy(jobs, j => ({ value: j.source, label: j.source })),
    countries: countBy(jobs, j => (j.country ? { value: j.country, label: j.country } : null)),
    companies: countBy(jobs, j => ({ value: String(j.companyId), label: j.companyName })),
  };
}
```

- [ ] **Step 4: Repoint `GroupBy` importers (mechanical)**

In `frontend/src/features/jobs/JobsBoard.tsx`: delete the line `export type GroupBy = 'status' | 'country' | 'company' | 'priority';` and add to its imports:

```ts
import type { GroupBy } from './jobFilters';
```

In each of `jobGrouping.ts`, `JobsTable.tsx`, `useCollapsedLanes.ts`: change
`import type { GroupBy } from './JobsBoard';` → `import type { GroupBy } from './jobFilters';`

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/jobFilters.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/jobs/jobFilters.ts frontend/src/features/jobs/jobFilters.test.ts frontend/src/features/jobs/JobsBoard.tsx frontend/src/features/jobs/jobGrouping.ts frontend/src/features/jobs/JobsTable.tsx frontend/src/features/jobs/useCollapsedLanes.ts
git commit -m "feat(jobs): filter model + data-driven facets; move GroupBy to jobFilters"
```

---

### Task 2: `applyFilters` + `activeFilterCount`

**Files:**
- Modify: `frontend/src/features/jobs/jobFilters.ts`
- Test: `frontend/src/features/jobs/jobFilters.test.ts`

**Interfaces:**
- Consumes: `JobFilters`, `toNumberOrNull`.
- Produces: `applyFilters(jobs, f): JobDto[]`, `activeFilterCount(f): number`.

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/features/jobs/jobFilters.test.ts` (add imports `applyFilters, activeFilterCount` and `DEFAULT_FILTERS` to the top import):

```ts
import { applyFilters, activeFilterCount, DEFAULT_FILTERS } from './jobFilters';

describe('applyFilters', () => {
  const jobs = [
    job({ id: 1, status: 'Applied', priority: 'High', remoteMode: 'Remote', country: 'Norway', companyId: 1 }),
    job({ id: 2, status: 'Offered', priority: 'Low', remoteMode: 'OnSite', country: 'Germany', companyId: 2 }),
  ];

  it('returns all when filters are empty', () => {
    expect(applyFilters(jobs, DEFAULT_FILTERS)).toHaveLength(2);
  });

  it('ORs within a category and ANDs across categories', () => {
    expect(applyFilters(jobs, { ...DEFAULT_FILTERS, statuses: ['Applied', 'Offered'] })).toHaveLength(2);
    expect(applyFilters(jobs, { ...DEFAULT_FILTERS, statuses: ['Applied'], priorities: ['High'] }).map(j => j.id)).toEqual([1]);
    expect(applyFilters(jobs, { ...DEFAULT_FILTERS, statuses: ['Applied'], priorities: ['Low'] })).toHaveLength(0);
  });

  it('filters by company id as string and by country', () => {
    expect(applyFilters(jobs, { ...DEFAULT_FILTERS, companyIds: ['2'] }).map(j => j.id)).toEqual([2]);
    expect(applyFilters(jobs, { ...DEFAULT_FILTERS, countries: ['Norway'] }).map(j => j.id)).toEqual([1]);
  });

  it('salary uses range overlap; both-null salary fails an active bound', () => {
    const band = [job({ id: 3, salaryMin: 80000, salaryMax: 120000 })];
    expect(applyFilters(band, { ...DEFAULT_FILTERS, salaryMin: 100000 })).toHaveLength(1); // 120k >= 100k
    expect(applyFilters(band, { ...DEFAULT_FILTERS, salaryMax: 150000 })).toHaveLength(1); // 80k <= 150k
    expect(applyFilters(band, { ...DEFAULT_FILTERS, salaryMin: 130000 })).toHaveLength(0); // 120k < 130k
    expect(applyFilters([job({ id: 4, salaryMin: null, salaryMax: null })], { ...DEFAULT_FILTERS, salaryMin: 1 })).toHaveLength(0);
  });

  it('applied-date bounds are inclusive; null appliedAt fails an active bound', () => {
    const dated = [job({ id: 5, appliedAtUtc: '2026-06-15T09:00:00Z' })];
    expect(applyFilters(dated, { ...DEFAULT_FILTERS, appliedFrom: '2026-06-15' })).toHaveLength(1);
    expect(applyFilters(dated, { ...DEFAULT_FILTERS, appliedTo: '2026-06-15' })).toHaveLength(1);
    expect(applyFilters(dated, { ...DEFAULT_FILTERS, appliedFrom: '2026-06-16' })).toHaveLength(0);
    expect(applyFilters([job({ id: 6, appliedAtUtc: null })], { ...DEFAULT_FILTERS, appliedFrom: '2026-01-01' })).toHaveLength(0);
  });

  it('search matches title/company/url/notes, case-insensitive', () => {
    const searchable = [job({ id: 7, title: 'Senior .NET Engineer', notes: 'great match' })];
    expect(applyFilters(searchable, { ...DEFAULT_FILTERS, search: 'senior' })).toHaveLength(1);
    expect(applyFilters(searchable, { ...DEFAULT_FILTERS, search: 'GREAT' })).toHaveLength(1);
    expect(applyFilters(searchable, { ...DEFAULT_FILTERS, search: 'python' })).toHaveLength(0);
  });
});

describe('activeFilterCount', () => {
  it('counts categorical selections + range bounds, excludes search and groupBy', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, search: 'x', groupBy: 'country' })).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, statuses: ['Applied', 'Offered'], salaryMin: 1 })).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/jobFilters.test.ts`
Expected: FAIL (`applyFilters`/`activeFilterCount` not exported).

- [ ] **Step 3: Implement in `jobFilters.ts`**

Append to `frontend/src/features/jobs/jobFilters.ts`:

```ts
function inArr<T extends string>(sel: T[], value: T): boolean {
  return sel.length === 0 || sel.includes(value);
}

export function applyFilters(jobs: JobDto[], f: JobFilters): JobDto[] {
  const search = f.search.trim().toLowerCase();
  return jobs.filter(j => {
    if (!inArr(f.statuses, j.status)) return false;
    if (!inArr(f.priorities, j.priority)) return false;
    if (!inArr(f.remoteModes, j.remoteMode)) return false;
    if (!inArr(f.employmentTypes, j.employmentType)) return false;
    if (!inArr(f.sources, j.source)) return false;
    if (f.countries.length > 0 && (j.country == null || !f.countries.includes(j.country))) return false;
    if (f.companyIds.length > 0 && !f.companyIds.includes(String(j.companyId))) return false;

    const sMin = toNumberOrNull(j.salaryMin);
    const sMax = toNumberOrNull(j.salaryMax);
    if (f.salaryMin != null) {
      const top = sMax ?? sMin;
      if (top == null || top < f.salaryMin) return false;
    }
    if (f.salaryMax != null) {
      const bottom = sMin ?? sMax;
      if (bottom == null || bottom > f.salaryMax) return false;
    }

    const applied = j.appliedAtUtc ? j.appliedAtUtc.slice(0, 10) : null;
    if (f.appliedFrom != null && (applied == null || applied < f.appliedFrom)) return false;
    if (f.appliedTo != null && (applied == null || applied > f.appliedTo)) return false;

    if (search) {
      const hay = [j.title, j.companyName, j.sourceUrl ?? '', j.notes ?? ''].join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

export function activeFilterCount(f: JobFilters): number {
  return (
    f.statuses.length + f.priorities.length + f.remoteModes.length +
    f.employmentTypes.length + f.sources.length + f.countries.length + f.companyIds.length +
    (f.salaryMin != null ? 1 : 0) + (f.salaryMax != null ? 1 : 0) +
    (f.appliedFrom != null ? 1 : 0) + (f.appliedTo != null ? 1 : 0)
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/jobFilters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/jobFilters.ts frontend/src/features/jobs/jobFilters.test.ts
git commit -m "feat(jobs): client-side applyFilters (range overlap) + activeFilterCount"
```

---

### Task 3: `filtersToChips` + `removeChip` + URL round-trip

**Files:**
- Modify: `frontend/src/features/jobs/jobFilters.ts`
- Test: `frontend/src/features/jobs/jobFilters.test.ts`

**Interfaces:**
- Consumes: `JobFilters`, `Facets`, `Chip`, `facets`.
- Produces: `filtersToChips(f, facets): Chip[]`, `removeChip(f, key): JobFilters`, `filtersToUrl(f): URLSearchParams`, `parseFiltersFromUrl(sp): JobFilters`.

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/features/jobs/jobFilters.test.ts` (add imports `filtersToChips, removeChip, filtersToUrl, parseFiltersFromUrl`):

```ts
import { filtersToChips, removeChip, filtersToUrl, parseFiltersFromUrl } from './jobFilters';
import { formatNumber } from '@/lib/format';

describe('filtersToChips', () => {
  const fac = facets([job({ companyId: 1, companyName: 'Acme' })]);

  it('builds chips from selected values incl. search and ranges', () => {
    const chips = filtersToChips(
      { ...DEFAULT_FILTERS, search: 'react', statuses: ['Applied'], salaryMin: 50000 }, fac,
    );
    expect(chips.map(c => c.key)).toEqual(['search', 'status:Applied', 'salaryMin']);
    expect(chips.find(c => c.key === 'salaryMin')!.label).toBe(`Salary ≥ ${formatNumber(50000)}`);
  });

  it('renders a removable chip for a company id absent from facets', () => {
    const chips = filtersToChips({ ...DEFAULT_FILTERS, companyIds: ['99'] }, fac);
    expect(chips).toHaveLength(1);
    expect(chips[0]).toEqual({ key: 'company:99', label: 'Company: Company #99' });
  });
});

describe('removeChip', () => {
  it('removes a single categorical value and clears scalars', () => {
    expect(removeChip({ ...DEFAULT_FILTERS, statuses: ['Applied', 'Offered'] }, 'status:Applied').statuses).toEqual(['Offered']);
    expect(removeChip({ ...DEFAULT_FILTERS, search: 'x' }, 'search').search).toBe('');
    expect(removeChip({ ...DEFAULT_FILTERS, salaryMin: 1 }, 'salaryMin').salaryMin).toBeUndefined();
  });
});

describe('URL round-trip', () => {
  it('round-trips filters via repeated params and omits defaults', () => {
    const f = {
      ...DEFAULT_FILTERS, search: 'react', statuses: ['Applied', 'Offered'] as const,
      countries: ['Norway'], companyIds: ['2'], salaryMin: 50000, appliedFrom: '2026-06-01', groupBy: 'country' as const,
    };
    const sp = filtersToUrl(f);
    expect(sp.getAll('status')).toEqual(['Applied', 'Offered']);
    expect(parseFiltersFromUrl(sp)).toEqual(f);
    expect(filtersToUrl(DEFAULT_FILTERS).toString()).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/jobFilters.test.ts`
Expected: FAIL (functions not exported).

- [ ] **Step 3: Implement in `jobFilters.ts`**

Add the `@/lib/format` import at the top of `jobFilters.ts`:

```ts
import { formatDate, formatNumber } from '@/lib/format';
```

Append:

```ts
export function filtersToChips(f: JobFilters, fac: Facets): Chip[] {
  const chips: Chip[] = [];
  if (f.search.trim()) chips.push({ key: 'search', label: `“${f.search.trim()}”` });

  const labelFromFacet = (opts: FacetOption[], v: string, fallback: string) =>
    opts.find(o => o.value === v)?.label ?? fallback;
  const push = (cat: string, values: string[], prefix: string, labelFor: (v: string) => string) => {
    for (const v of values) chips.push({ key: `${cat}:${v}`, label: `${prefix}: ${labelFor(v)}` });
  };

  push('status', f.statuses, 'Status', v => v);
  push('priority', f.priorities, 'Priority', v => v);
  push('remote', f.remoteModes, 'Remote', v => v);
  push('employment', f.employmentTypes, 'Type', v => v);
  push('source', f.sources, 'Source', v => v);
  push('country', f.countries, 'Country', v => v);
  push('company', f.companyIds, 'Company', v => labelFromFacet(fac.companies, v, `Company #${v}`));

  if (f.salaryMin != null) chips.push({ key: 'salaryMin', label: `Salary ≥ ${formatNumber(f.salaryMin)}` });
  if (f.salaryMax != null) chips.push({ key: 'salaryMax', label: `Salary ≤ ${formatNumber(f.salaryMax)}` });
  if (f.appliedFrom != null) chips.push({ key: 'appliedFrom', label: `Applied ≥ ${formatDate(f.appliedFrom)}` });
  if (f.appliedTo != null) chips.push({ key: 'appliedTo', label: `Applied ≤ ${formatDate(f.appliedTo)}` });

  return chips;
}

export function removeChip(f: JobFilters, key: string): JobFilters {
  switch (key) {
    case 'search': return { ...f, search: '' };
    case 'salaryMin': return { ...f, salaryMin: undefined };
    case 'salaryMax': return { ...f, salaryMax: undefined };
    case 'appliedFrom': return { ...f, appliedFrom: undefined };
    case 'appliedTo': return { ...f, appliedTo: undefined };
  }
  const idx = key.indexOf(':');
  if (idx < 0) return f;
  const cat = key.slice(0, idx);
  const val = key.slice(idx + 1);
  const drop = (arr: string[]) => arr.filter(x => x !== val);
  switch (cat) {
    case 'status': return { ...f, statuses: drop(f.statuses) as JobStatus[] };
    case 'priority': return { ...f, priorities: drop(f.priorities) as Priority[] };
    case 'remote': return { ...f, remoteModes: drop(f.remoteModes) as RemoteMode[] };
    case 'employment': return { ...f, employmentTypes: drop(f.employmentTypes) as EmploymentType[] };
    case 'source': return { ...f, sources: drop(f.sources) as JobSource[] };
    case 'country': return { ...f, countries: drop(f.countries) };
    case 'company': return { ...f, companyIds: drop(f.companyIds) };
    default: return f;
  }
}

const GROUP_VALUES: GroupBy[] = ['status', 'country', 'company', 'priority'];

export function filtersToUrl(f: JobFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.search.trim()) sp.set('q', f.search.trim());
  f.statuses.forEach(v => sp.append('status', v));
  f.priorities.forEach(v => sp.append('priority', v));
  f.remoteModes.forEach(v => sp.append('remote', v));
  f.employmentTypes.forEach(v => sp.append('employment', v));
  f.sources.forEach(v => sp.append('source', v));
  f.countries.forEach(v => sp.append('country', v));
  f.companyIds.forEach(v => sp.append('company', v));
  if (f.salaryMin != null) sp.set('salmin', String(f.salaryMin));
  if (f.salaryMax != null) sp.set('salmax', String(f.salaryMax));
  if (f.appliedFrom != null) sp.set('appliedfrom', f.appliedFrom);
  if (f.appliedTo != null) sp.set('appliedto', f.appliedTo);
  if (f.groupBy !== DEFAULT_FILTERS.groupBy) sp.set('group', f.groupBy);
  return sp;
}

export function parseFiltersFromUrl(sp: URLSearchParams): JobFilters {
  const num = (k: string) => {
    const raw = sp.get(k);
    if (raw == null) return undefined;
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  };
  const groupRaw = sp.get('group');
  const groupBy = GROUP_VALUES.includes(groupRaw as GroupBy) ? (groupRaw as GroupBy) : 'status';
  return {
    search: sp.get('q') ?? '',
    statuses: sp.getAll('status') as JobStatus[],
    priorities: sp.getAll('priority') as Priority[],
    remoteModes: sp.getAll('remote') as RemoteMode[],
    employmentTypes: sp.getAll('employment') as EmploymentType[],
    sources: sp.getAll('source') as JobSource[],
    countries: sp.getAll('country'),
    companyIds: sp.getAll('company'),
    salaryMin: num('salmin'),
    salaryMax: num('salmax'),
    appliedFrom: sp.get('appliedfrom') ?? undefined,
    appliedTo: sp.get('appliedto') ?? undefined,
    groupBy,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/jobFilters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/jobFilters.ts frontend/src/features/jobs/jobFilters.test.ts
git commit -m "feat(jobs): filter chips, removeChip, and URL round-trip (repeated params)"
```

---

### Task 4: `useJobFilters` hook (URL-backed, replace:true)

**Files:**
- Create: `frontend/src/features/jobs/useJobFilters.ts`
- Test: `frontend/src/features/jobs/useJobFilters.test.tsx`

**Interfaces:**
- Consumes: `parseFiltersFromUrl`, `filtersToUrl`, `JobFilters`.
- Produces: `useJobFilters(): { filters: JobFilters; setFilters: (f: JobFilters) => void }`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/jobs/useJobFilters.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { useJobFilters } from './useJobFilters';

const wrapper = (entry: string) =>
  ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;

describe('useJobFilters', () => {
  it('parses repeated params from the URL', () => {
    const { result } = renderHook(() => useJobFilters(), {
      wrapper: wrapper('/jobs?status=Applied&status=Offered&group=country'),
    });
    expect(result.current.filters.statuses).toEqual(['Applied', 'Offered']);
    expect(result.current.filters.groupBy).toBe('country');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/useJobFilters.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the hook**

Create `frontend/src/features/jobs/useJobFilters.ts`:

```ts
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { parseFiltersFromUrl, filtersToUrl, type JobFilters } from './jobFilters';

export function useJobFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFiltersFromUrl(searchParams), [searchParams]);
  const setFilters = useCallback(
    (next: JobFilters) => setSearchParams(filtersToUrl(next), { replace: true }),
    [setSearchParams],
  );
  return { filters, setFilters };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/useJobFilters.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/useJobFilters.ts frontend/src/features/jobs/useJobFilters.test.tsx
git commit -m "feat(jobs): useJobFilters hook (URL-backed, replace:true)"
```

---

### Task 5: `useHiddenStatuses` hook (lifted from JobsBoard)

**Files:**
- Create: `frontend/src/features/jobs/useHiddenStatuses.ts`
- Test: `frontend/src/features/jobs/useHiddenStatuses.test.ts`

**Interfaces:**
- Produces: `ALL_STATUSES: JobStatus[]`, `useHiddenStatuses(): { hiddenStatuses: JobStatus[]; toggleStatus: (s: JobStatus) => void; reset: () => void }`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/jobs/useHiddenStatuses.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHiddenStatuses } from './useHiddenStatuses';

describe('useHiddenStatuses', () => {
  beforeEach(() => localStorage.clear());

  it('hides closed statuses by default', () => {
    const { result } = renderHook(() => useHiddenStatuses());
    expect(result.current.hiddenStatuses).toEqual(['Rejected', 'Ghosted', 'Withdrawn', 'Archived']);
  });

  it('toggles a status and resets to default', () => {
    const { result } = renderHook(() => useHiddenStatuses());
    act(() => result.current.toggleStatus('Rejected'));
    expect(result.current.hiddenStatuses).not.toContain('Rejected');
    act(() => result.current.toggleStatus('Applied'));
    expect(result.current.hiddenStatuses).toContain('Applied');
    act(() => result.current.reset());
    expect(result.current.hiddenStatuses).toEqual(['Rejected', 'Ghosted', 'Withdrawn', 'Archived']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/useHiddenStatuses.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the hook**

Create `frontend/src/features/jobs/useHiddenStatuses.ts`:

```ts
import { useCallback, useState } from 'react';
import type { JobStatus } from '@/lib/api/model';

const ACTIVE_STATUSES: JobStatus[] = ['Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered'];
const CLOSED_STATUSES: JobStatus[] = ['Rejected', 'Ghosted', 'Withdrawn', 'Archived'];
export const ALL_STATUSES: JobStatus[] = [...ACTIVE_STATUSES, ...CLOSED_STATUSES];
const STORAGE_KEY = 'careerops:jobs:hidden-status-columns';

function load(): JobStatus[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [...CLOSED_STATUSES];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...CLOSED_STATUSES];
    return parsed.filter((s): s is JobStatus => ALL_STATUSES.includes(s as JobStatus));
  } catch {
    return [...CLOSED_STATUSES];
  }
}

function persist(next: JobStatus[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
}

export function useHiddenStatuses() {
  const [hiddenStatuses, setHiddenStatuses] = useState<JobStatus[]>(load);

  const toggleStatus = useCallback((status: JobStatus) => {
    setHiddenStatuses(prev => {
      const next = prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status];
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = [...CLOSED_STATUSES];
    persist(next);
    setHiddenStatuses(next);
  }, []);

  return { hiddenStatuses, toggleStatus, reset };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/useHiddenStatuses.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/useHiddenStatuses.ts frontend/src/features/jobs/useHiddenStatuses.test.ts
git commit -m "feat(jobs): useHiddenStatuses hook (lifted board column visibility)"
```

---

### Task 6: `FacetSection` component (+ checkbox primitive)

**Files:**
- Create (via CLI): `frontend/src/components/ui/checkbox.tsx`
- Modify: `frontend/src/test/setup.ts` (jsdom polyfills for radix pointer interaction)
- Create: `frontend/src/features/jobs/FacetSection.tsx`
- Test: `frontend/src/features/jobs/FacetSection.test.tsx`

**Interfaces:**
- Consumes: `FacetOption`, shadcn `Checkbox`/`Label`/`Input`/`Button`.
- Produces: `FacetSection` — props `{ title: string; options: FacetOption[]; selected: string[]; onToggle: (value: string) => void }`.

- [ ] **Step 1: Add the checkbox primitive + jsdom polyfills for radix**

Run: `cd frontend && npx shadcn@latest add checkbox`
Expected: creates `src/components/ui/checkbox.tsx` (accept any prompts).

Then append to `frontend/src/test/setup.ts` (radix's dismissable layer / Popover / Select call these; jsdom does not implement them, so user-event opening a popover throws without the shims — this is shared by every radix-interaction test from here on):

```ts
// jsdom lacks these; radix (Popover/Select/dismissable-layer) needs them under user-event.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/features/jobs/FacetSection.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { FacetSection } from './FacetSection';
import type { FacetOption } from './jobFilters';

const opts = (n: number): FacetOption[] =>
  Array.from({ length: n }, (_, i) => ({ value: `v${i}`, label: `Label ${i}`, count: n - i }));

describe('FacetSection', () => {
  it('shows the top 6 and reveals the rest via "+ N more"', async () => {
    renderWithProviders(<FacetSection title="Source" options={opts(8)} selected={[]} onToggle={() => {}} />);
    expect(screen.queryByText('Label 7')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /2 more/i }));
    expect(screen.getByText('Label 7')).toBeInTheDocument();
  });

  it('calls onToggle with the clicked value', async () => {
    const onToggle = vi.fn();
    renderWithProviders(<FacetSection title="Status" options={opts(2)} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByLabelText('Label 0'));
    expect(onToggle).toHaveBeenCalledWith('v0');
  });

  it('pins a selected value that is absent from options', () => {
    renderWithProviders(<FacetSection title="Company" options={[]} selected={['99']} onToggle={() => {}} />);
    const box = screen.getByLabelText('99');
    expect(box).toBeInTheDocument();
    expect(box).toBeChecked();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/FacetSection.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `FacetSection`**

Create `frontend/src/features/jobs/FacetSection.tsx`:

```tsx
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { FacetOption } from './jobFilters';

const TOP_N = 6;
const NARROW_THRESHOLD = 15;

interface Props {
  title: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function FacetSection({ title, options, selected, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [narrow, setNarrow] = useState('');

  const selectedSet = new Set(selected);
  const present = new Set(options.map(o => o.value));
  const pinnedMissing: FacetOption[] = selected
    .filter(v => !present.has(v))
    .map(v => ({ value: v, label: v, count: 0 }));

  if (options.length === 0 && pinnedMissing.length === 0) return null;

  const ordered: FacetOption[] = [
    ...options.filter(o => selectedSet.has(o.value)),
    ...pinnedMissing,
    ...options.filter(o => !selectedSet.has(o.value)),
  ];
  const q = narrow.trim().toLowerCase();
  const filtered = q ? ordered.filter(o => o.label.toLowerCase().includes(q)) : ordered;
  const visible = expanded ? filtered : filtered.slice(0, TOP_N);
  const hiddenCount = filtered.length - visible.length;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {expanded && ordered.length > NARROW_THRESHOLD && (
        <Input
          value={narrow}
          onChange={e => setNarrow(e.target.value)}
          placeholder={`Filter ${title.toLowerCase()}…`}
          className="h-7 text-xs"
        />
      )}
      <div className="space-y-1">
        {visible.map(o => {
          const id = `facet-${title}-${o.value}`;
          return (
            <div key={o.value} className="flex items-center gap-2">
              <Checkbox id={id} checked={selectedSet.has(o.value)} onCheckedChange={() => onToggle(o.value)} />
              <Label htmlFor={id} className="flex-1 cursor-pointer text-sm font-normal">{o.label}</Label>
              {o.count > 0 && <span className="text-xs tabular-nums text-muted-foreground">{o.count}</span>}
            </div>
          );
        })}
      </div>
      {!expanded && hiddenCount > 0 && (
        <Button variant="ghost" size="sm" className="h-6 px-1 text-xs" onClick={() => setExpanded(true)}>
          + {hiddenCount} more
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/FacetSection.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/checkbox.tsx frontend/src/test/setup.ts frontend/src/features/jobs/FacetSection.tsx frontend/src/features/jobs/FacetSection.test.tsx
git commit -m "feat(jobs): FacetSection checkbox facet (top-N, +more, pinned selection)"
```

---

### Task 7: `FilterPopover` component (+ popover primitive)

**Files:**
- Create (via CLI): `frontend/src/components/ui/popover.tsx`
- Create: `frontend/src/features/jobs/FilterPopover.tsx`
- Test: `frontend/src/features/jobs/FilterPopover.test.tsx`

**Interfaces:**
- Consumes: `FacetSection`, `activeFilterCount`, `DEFAULT_FILTERS`, `JobFilters`, `Facets`, shadcn `Popover`.
- Produces: `FilterPopover` — props `{ filters: JobFilters; facets: Facets; onChange: (f: JobFilters) => void }`.

- [ ] **Step 1: Add the popover primitive**

Run: `cd frontend && npx shadcn@latest add popover`
Expected: creates `src/components/ui/popover.tsx`.

> Requires the jsdom pointer polyfills added to `setup.ts` in Task 6 — the test below opens the popover via user-event.

- [ ] **Step 2: Write the failing test**

Create `frontend/src/features/jobs/FilterPopover.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { FilterPopover } from './FilterPopover';
import { DEFAULT_FILTERS, facets } from './jobFilters';
import type { JobDto } from '@/lib/api/model';

const jobs = [{ status: 'Applied', priority: 'High', remoteMode: 'Remote', employmentType: 'FullTime',
  source: 'LinkedIn', country: 'Norway', companyId: 1, companyName: 'Acme' } as unknown as JobDto];

describe('FilterPopover', () => {
  it('toggles a status option and reports it', async () => {
    const onChange = vi.fn();
    renderWithProviders(<FilterPopover filters={DEFAULT_FILTERS} facets={facets(jobs)} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /filter/i }));
    await userEvent.click(await screen.findByLabelText('Applied'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ statuses: ['Applied'] }));
  });

  it('shows the active-filter count badge', () => {
    renderWithProviders(
      <FilterPopover filters={{ ...DEFAULT_FILTERS, statuses: ['Applied'], salaryMin: 1 }} facets={facets(jobs)} onChange={() => {}} />,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/FilterPopover.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `FilterPopover`**

Create `frontend/src/features/jobs/FilterPopover.tsx`:

```tsx
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { FacetSection } from './FacetSection';
import { activeFilterCount, DEFAULT_FILTERS, type JobFilters, type Facets } from './jobFilters';
import type { JobStatus, Priority, RemoteMode, EmploymentType, JobSource } from '@/lib/api/model';

interface Props {
  filters: JobFilters;
  facets: Facets;
  onChange: (f: JobFilters) => void;
}

function toggle<T extends string>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

export function FilterPopover({ filters, facets, onChange }: Props) {
  const count = activeFilterCount(filters);
  const numValue = (v: number | undefined) => (v == null ? '' : String(v));
  const parseNum = (raw: string) => {
    const n = Number(raw);
    return raw.trim() === '' || Number.isNaN(n) ? undefined : n;
  };
  const clearAll = () => onChange({ ...DEFAULT_FILTERS, search: filters.search, groupBy: filters.groupBy });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal aria-hidden className="size-4" />
          Filter
          {count > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[11px] font-medium tabular-nums text-primary-foreground">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-80 overflow-y-auto">
        <div className="space-y-3">
          <FacetSection title="Status" options={facets.statuses} selected={filters.statuses}
            onToggle={v => onChange({ ...filters, statuses: toggle(filters.statuses, v as JobStatus) })} />
          <FacetSection title="Priority" options={facets.priorities} selected={filters.priorities}
            onToggle={v => onChange({ ...filters, priorities: toggle(filters.priorities, v as Priority) })} />
          <FacetSection title="Remote" options={facets.remoteModes} selected={filters.remoteModes}
            onToggle={v => onChange({ ...filters, remoteModes: toggle(filters.remoteModes, v as RemoteMode) })} />
          <FacetSection title="Employment type" options={facets.employmentTypes} selected={filters.employmentTypes}
            onToggle={v => onChange({ ...filters, employmentTypes: toggle(filters.employmentTypes, v as EmploymentType) })} />
          <FacetSection title="Source" options={facets.sources} selected={filters.sources}
            onToggle={v => onChange({ ...filters, sources: toggle(filters.sources, v as JobSource) })} />
          <FacetSection title="Country" options={facets.countries} selected={filters.countries}
            onToggle={v => onChange({ ...filters, countries: toggle(filters.countries, v) })} />
          <FacetSection title="Company" options={facets.companies} selected={filters.companyIds}
            onToggle={v => onChange({ ...filters, companyIds: toggle(filters.companyIds, v) })} />

          <Separator />
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Salary</p>
            <div className="flex items-center gap-2">
              <Input type="number" inputMode="numeric" placeholder="Min" className="h-8"
                value={numValue(filters.salaryMin)} onChange={e => onChange({ ...filters, salaryMin: parseNum(e.target.value) })} />
              <span className="text-muted-foreground">–</span>
              <Input type="number" inputMode="numeric" placeholder="Max" className="h-8"
                value={numValue(filters.salaryMax)} onChange={e => onChange({ ...filters, salaryMax: parseNum(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Applied date</p>
            <div className="flex items-center gap-2">
              <Input type="date" className="h-8" value={filters.appliedFrom ?? ''}
                onChange={e => onChange({ ...filters, appliedFrom: e.target.value || undefined })} />
              <span className="text-muted-foreground">–</span>
              <Input type="date" className="h-8" value={filters.appliedTo ?? ''}
                onChange={e => onChange({ ...filters, appliedTo: e.target.value || undefined })} />
            </div>
          </div>

          <Separator />
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={count === 0}>Clear all</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

> Note: no explicit "Done" button — click-outside / `Esc` closes the popover (radix default). Simpler; board updates live regardless.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/FilterPopover.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/popover.tsx frontend/src/features/jobs/FilterPopover.tsx frontend/src/features/jobs/FilterPopover.test.tsx
git commit -m "feat(jobs): FilterPopover with facet sections + salary/date ranges"
```

---

### Task 8: `GroupPopover` component (+ radio-group primitive)

**Files:**
- Create (via CLI): `frontend/src/components/ui/radio-group.tsx`
- Create: `frontend/src/features/jobs/GroupPopover.tsx`
- Test: `frontend/src/features/jobs/GroupPopover.test.tsx`

**Interfaces:**
- Consumes: `ALL_STATUSES` (from `useHiddenStatuses`), `GroupBy`, shadcn `RadioGroup`/`Checkbox`/`Popover`.
- Produces: `GroupPopover` — props `{ groupBy: GroupBy; onGroupChange: (g: GroupBy) => void; hiddenStatuses: JobStatus[]; onToggleStatus: (s: JobStatus) => void; onResetColumns: () => void }`.

- [ ] **Step 1: Add the radio-group primitive**

Run: `cd frontend && npx shadcn@latest add radio-group`
Expected: creates `src/components/ui/radio-group.tsx`.

- [ ] **Step 2: Write the failing test**

Create `frontend/src/features/jobs/GroupPopover.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { GroupPopover } from './GroupPopover';

function setup(over: Partial<Parameters<typeof GroupPopover>[0]> = {}) {
  const props = {
    groupBy: 'status' as const, onGroupChange: vi.fn(), hiddenStatuses: ['Rejected'] as never,
    onToggleStatus: vi.fn(), onResetColumns: vi.fn(), ...over,
  };
  renderWithProviders(<GroupPopover {...props} />);
  return props;
}

describe('GroupPopover', () => {
  it('changes grouping, toggles a column, and resets', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: /group/i }));
    await userEvent.click(await screen.findByLabelText('Country'));
    expect(props.onGroupChange).toHaveBeenCalledWith('country');
    await userEvent.click(screen.getByLabelText('Applied'));
    expect(props.onToggleStatus).toHaveBeenCalledWith('Applied');
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(props.onResetColumns).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/GroupPopover.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `GroupPopover`**

Create `frontend/src/features/jobs/GroupPopover.tsx`:

```tsx
import { Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ALL_STATUSES } from './useHiddenStatuses';
import type { GroupBy } from './jobFilters';
import type { JobStatus } from '@/lib/api/model';

const GROUPS: { value: GroupBy; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'country', label: 'Country' },
  { value: 'company', label: 'Company' },
  { value: 'priority', label: 'Priority' },
];

interface Props {
  groupBy: GroupBy;
  onGroupChange: (g: GroupBy) => void;
  hiddenStatuses: JobStatus[];
  onToggleStatus: (s: JobStatus) => void;
  onResetColumns: () => void;
}

export function GroupPopover({ groupBy, onGroupChange, hiddenStatuses, onToggleStatus, onResetColumns }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Rows3 aria-hidden className="size-4" /> Group
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Group by</p>
            <RadioGroup value={groupBy} onValueChange={v => onGroupChange(v as GroupBy)}>
              {GROUPS.map(g => (
                <div key={g.value} className="flex items-center gap-2">
                  <RadioGroupItem id={`group-${g.value}`} value={g.value} />
                  <Label htmlFor={`group-${g.value}`} className="cursor-pointer text-sm font-normal">{g.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Board columns</p>
              <Button variant="ghost" size="sm" className="h-6 px-1 text-xs" onClick={onResetColumns}>Reset</Button>
            </div>
            <div className="space-y-1">
              {ALL_STATUSES.map(s => {
                const id = `col-${s}`;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <Checkbox id={id} checked={!hiddenStatuses.includes(s)} onCheckedChange={() => onToggleStatus(s)} />
                    <Label htmlFor={id} className="cursor-pointer text-sm font-normal">{s}</Label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/GroupPopover.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/radio-group.tsx frontend/src/features/jobs/GroupPopover.tsx frontend/src/features/jobs/GroupPopover.test.tsx
git commit -m "feat(jobs): GroupPopover (group-by radio + board column visibility + reset)"
```

---

### Task 9: `FilterChips` component

**Files:**
- Create: `frontend/src/features/jobs/FilterChips.tsx`
- Test: `frontend/src/features/jobs/FilterChips.test.tsx`

**Interfaces:**
- Consumes: `filtersToChips`, `removeChip`, `DEFAULT_FILTERS`, `JobFilters`, `Facets`, `Badge`, `Button`.
- Produces: `FilterChips` — props `{ filters: JobFilters; facets: Facets; onChange: (f: JobFilters) => void }`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/jobs/FilterChips.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChips } from './FilterChips';
import { DEFAULT_FILTERS, facets } from './jobFilters';

describe('FilterChips', () => {
  it('renders nothing when no filters are active', () => {
    const { container } = render(<FilterChips filters={DEFAULT_FILTERS} facets={facets([])} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('removes a single value and clears all', async () => {
    const onChange = vi.fn();
    render(
      <FilterChips
        filters={{ ...DEFAULT_FILTERS, statuses: ['Applied'], search: 'react' }}
        facets={facets([])} onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /remove status: applied/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ statuses: [] }));
    await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ statuses: [], search: '' }));
  });

  it('renders a removable chip for a stale company id', () => {
    render(<FilterChips filters={{ ...DEFAULT_FILTERS, companyIds: ['99'] }} facets={facets([])} onChange={() => {}} />);
    expect(screen.getByText('Company: Company #99')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/FilterChips.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `FilterChips`**

Create `frontend/src/features/jobs/FilterChips.tsx`:

```tsx
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { filtersToChips, removeChip, DEFAULT_FILTERS, type JobFilters, type Facets } from './jobFilters';

interface Props {
  filters: JobFilters;
  facets: Facets;
  onChange: (f: JobFilters) => void;
}

export function FilterChips({ filters, facets, onChange }: Props) {
  const chips = filtersToChips(filters, facets);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-2">
      {chips.map(chip => (
        <Badge key={chip.key} variant="secondary" className="h-7 gap-1 pr-1 font-normal">
          {chip.label}
          <Button
            variant="ghost" size="icon-xs" aria-label={`Remove ${chip.label}`}
            onClick={() => onChange(removeChip(filters, chip.key))}
          >
            <X aria-hidden />
          </Button>
        </Badge>
      ))}
      <Button
        variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
        onClick={() => onChange({ ...DEFAULT_FILTERS, groupBy: filters.groupBy })}
      >
        Clear all
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/FilterChips.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/FilterChips.tsx frontend/src/features/jobs/FilterChips.test.tsx
git commit -m "feat(jobs): FilterChips summary row (per-value remove + clear all)"
```

---

### Task 10: `JobToolbar` component (search + Filter + Group + Add)

**Files:**
- Create: `frontend/src/features/jobs/JobToolbar.tsx`
- Test: `frontend/src/features/jobs/JobToolbar.test.tsx`

**Interfaces:**
- Consumes: `FilterPopover`, `GroupPopover`, `JobQuickAdd`, `JobFilters`, `Facets`.
- Produces: `JobToolbar` — props `{ filters; facets; onChange; hiddenStatuses; onToggleStatus; onResetColumns }`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/jobs/JobToolbar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { JobToolbar } from './JobToolbar';
import { DEFAULT_FILTERS, facets } from './jobFilters';

describe('JobToolbar', () => {
  it('renders the search field, Filter, Group and Add controls', () => {
    renderWithProviders(
      <JobToolbar filters={DEFAULT_FILTERS} facets={facets([])} onChange={() => {}}
        hiddenStatuses={[]} onToggleStatus={() => {}} onResetColumns={() => {}} />,
    );
    expect(screen.getByPlaceholderText(/search jobs/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /group/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add job/i })).toBeInTheDocument();
  });

  it('reports typed search text', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <JobToolbar filters={DEFAULT_FILTERS} facets={facets([])} onChange={onChange}
        hiddenStatuses={[]} onToggleStatus={() => {}} onResetColumns={() => {}} />,
    );
    await userEvent.type(screen.getByPlaceholderText(/search jobs/i), 'a');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'a' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/JobToolbar.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `JobToolbar`**

Create `frontend/src/features/jobs/JobToolbar.tsx`:

```tsx
import { Input } from '@/components/ui/input';
import { FilterPopover } from './FilterPopover';
import { GroupPopover } from './GroupPopover';
import { JobQuickAdd } from './JobQuickAdd';
import type { GroupBy, JobFilters, Facets } from './jobFilters';
import type { JobStatus } from '@/lib/api/model';

interface Props {
  filters: JobFilters;
  facets: Facets;
  onChange: (f: JobFilters) => void;
  hiddenStatuses: JobStatus[];
  onToggleStatus: (s: JobStatus) => void;
  onResetColumns: () => void;
}

export function JobToolbar({ filters, facets, onChange, hiddenStatuses, onToggleStatus, onResetColumns }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search jobs…"
        value={filters.search}
        onChange={e => onChange({ ...filters, search: e.target.value })}
        className="w-48"
      />
      <FilterPopover filters={filters} facets={facets} onChange={onChange} />
      <GroupPopover
        groupBy={filters.groupBy}
        onGroupChange={(g: GroupBy) => onChange({ ...filters, groupBy: g })}
        hiddenStatuses={hiddenStatuses}
        onToggleStatus={onToggleStatus}
        onResetColumns={onResetColumns}
      />
      <JobQuickAdd />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/JobToolbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/JobToolbar.tsx frontend/src/features/jobs/JobToolbar.test.tsx
git commit -m "feat(jobs): JobToolbar (always-visible search + Filter/Group/Add)"
```

---

### Task 11: Integration — wire `JobsPage`, refactor `JobsBoard`, delete `JobFilterBar`, full verify

**Files:**
- Modify (rewrite): `frontend/src/pages/JobsPage.tsx`
- Modify (rewrite): `frontend/src/features/jobs/JobsBoard.tsx`
- Modify: `frontend/src/features/jobs/JobsBoard.test.tsx`
- Delete: `frontend/src/features/jobs/JobFilterBar.tsx`

**Interfaces:**
- Consumes: `useJobFilters`, `useHiddenStatuses`, `facets`, `applyFilters`, `JobToolbar`, `FilterChips`.
- Produces: `JobsBoard` new props `{ jobs: JobDto[]; groupBy: GroupBy; hiddenStatuses: JobStatus[]; onJobClick: (id: number) => void }` (drops `listParams`).

- [ ] **Step 1: Update `JobsBoard.test.tsx` (failing)**

Replace the contents of `frontend/src/features/jobs/JobsBoard.test.tsx` with:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { JobsBoard } from "./JobsBoard";
import type { JobDto, JobStatus } from "@/lib/api/model";

const CLOSED: JobStatus[] = ["Rejected", "Ghosted", "Withdrawn", "Archived"];

const job = (id: number, status: JobDto["status"], over: Partial<JobDto> = {}): JobDto => ({
  id, companyId: 1, companyName: "Northwind Synthetics", title: `Role ${id}`,
  status, priority: "Medium", source: "CompanySite", sourceUrl: null,
  country: "Norway", city: null, locationText: null, remoteMode: "Remote", employmentType: "FullTime",
  salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: "Annual",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: null, notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
  ...over,
});

describe("JobsBoard", () => {
  beforeEach(() => localStorage.clear());

  it("renders the status column header and a card", () => {
    renderWithProviders(
      <JobsBoard jobs={[job(1, "Applied")]} groupBy="status" hiddenStatuses={CLOSED} onJobClick={() => {}} />,
    );
    expect(screen.getAllByText("Applied").length).toBeGreaterThanOrEqual(2); // header + card chip
    expect(screen.getByText("Role 1")).toBeInTheDocument();
  });

  it("shows an empty board message when there are no jobs", () => {
    renderWithProviders(<JobsBoard jobs={[]} groupBy="status" hiddenStatuses={CLOSED} onJobClick={() => {}} />);
    expect(screen.getByText(/No jobs found/i)).toBeInTheDocument();
  });

  it("hides the status columns named in hiddenStatuses", () => {
    renderWithProviders(
      <JobsBoard jobs={[job(1, "Applied"), job(2, "Rejected")]} groupBy="status" hiddenStatuses={CLOSED} onJobClick={() => {}} />,
    );
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
    expect(screen.queryByText("Role 2")).not.toBeInTheDocument();
  });

  it("renders a lane banner when grouped by country", () => {
    renderWithProviders(
      <JobsBoard jobs={[job(1, "Applied", { country: "Norway" })]} groupBy="country" hiddenStatuses={CLOSED} onJobClick={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /Norway/ })).toBeInTheDocument();
    expect(screen.getByText("Role 1")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/JobsBoard.test.tsx`
Expected: FAIL (`hiddenStatuses` prop not accepted; `listParams` still required).

- [ ] **Step 3: Rewrite `JobsBoard.tsx`**

Replace the contents of `frontend/src/features/jobs/JobsBoard.tsx` with:

```tsx
import { useState, type CSSProperties } from 'react';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { BoardColumnHeader } from './BoardColumnHeader';
import { BoardLane } from './BoardLane';
import { JobCardPreview } from './JobCardPreview';
import { useJobMutations } from './useJobMutations';
import { useCollapsedLanes } from './useCollapsedLanes';
import { buildLanes, laneKeyOf } from './jobGrouping';
import { ALL_STATUSES } from './useHiddenStatuses';
import { getListJobsQueryKey } from '@/lib/api/jobs/jobs';
import type { JobDto, JobStatus } from '@/lib/api/model';
import type { GroupBy } from './jobFilters';

const BOARD_COL_WIDTH = '18rem';

interface Props {
  jobs: JobDto[];
  groupBy: GroupBy;
  hiddenStatuses: JobStatus[];
  onJobClick: (id: number) => void;
}

export function JobsBoard({ jobs, groupBy, hiddenStatuses, onJobClick }: Props) {
  const [activeJob, setActiveJob] = useState<JobDto | null>(null);
  const { isCollapsed, toggle } = useCollapsedLanes(groupBy);
  const qc = useQueryClient();
  const { transition } = useJobMutations();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <p className="text-sm">No jobs found.</p>
        <p className="text-xs">Add a job to get started.</p>
      </div>
    );
  }

  const visibleStatuses = ALL_STATUSES.filter(s => !hiddenStatuses.includes(s));
  const lanes = buildLanes(jobs, groupBy);
  const showBanner = groupBy !== 'status';

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveJob(jobs.find(j => j.id === active.id) ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveJob(null);
    if (!over) return;

    const job = jobs.find(j => j.id === active.id);
    if (!job) return;

    const raw = String(over.id);
    const idx = raw.lastIndexOf('::');
    if (idx < 0) return;
    const toLaneKey = raw.slice(0, idx);
    const toStatus = raw.slice(idx + 2) as JobStatus;

    if (job.status === toStatus) return;
    if (laneKeyOf(job, groupBy) !== toLaneKey) return; // ignore cross-lane drops

    const key = getListJobsQueryKey();
    const prevData = qc.getQueryData(key);
    qc.setQueryData(key, (old: { data?: JobDto[] } | undefined) =>
      old ? { ...old, data: old.data?.map(j => j.id === job.id ? { ...j, status: toStatus } : j) } : old,
    );

    transition.mutate(
      { id: job.id as number, data: { toStatus, notes: null } },
      { onError: () => qc.setQueryData(key, prevData) },
    );
  };

  const isDragActive = activeJob !== null;
  const boardStyle = { '--board-col': BOARD_COL_WIDTH } as CSSProperties;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        {visibleStatuses.length === 0 ? (
          <p className="m-auto text-sm text-muted-foreground">
            All status columns are hidden. Use the Group menu to show some.
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto pb-2">
            <div className="min-w-max" style={boardStyle}>
              <BoardColumnHeader statuses={visibleStatuses} />
              <div className="flex flex-col gap-3 pt-2">
                {lanes.map(lane => (
                  <BoardLane
                    key={lane.key}
                    lane={lane}
                    statuses={visibleStatuses}
                    showBanner={showBanner}
                    collapsed={isCollapsed(lane.key)}
                    onToggle={toggle}
                    onJobClick={onJobClick}
                    isDragActive={isDragActive}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeJob && (
          <div className="pointer-events-none rotate-[0.5deg] scale-[1.01] rounded-lg shadow-xl ring-1 ring-ring/40 transform-gpu">
            <JobCardPreview job={activeJob} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
```

> Lane/grid model and the cross-lane drag guard are preserved verbatim; only the internal hidden-status state + the in-body Columns dropdown are removed, and the DnD query key is now param-less.

- [ ] **Step 4: Rewrite `JobsPage.tsx`**

Replace the contents of `frontend/src/pages/JobsPage.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useJobs } from '@/lib/api/jobs/hooks';
import { JobsBoard } from '@/features/jobs/JobsBoard';
import { JobsTable } from '@/features/jobs/JobsTable';
import { JobToolbar } from '@/features/jobs/JobToolbar';
import { FilterChips } from '@/features/jobs/FilterChips';
import { useJobFilters } from '@/features/jobs/useJobFilters';
import { useHiddenStatuses } from '@/features/jobs/useHiddenStatuses';
import { facets, applyFilters } from '@/features/jobs/jobFilters';
import { JobDetailDrawer } from '@/features/jobs/JobDetailDrawer';
import type { JobDto } from '@/lib/api/model';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';

export default function JobsPage() {
  const { filters, setFilters } = useJobFilters();
  const { hiddenStatuses, toggleStatus, reset } = useHiddenStatuses();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const { data: jobsData, isLoading, isError } = useJobs();
  const jobs: JobDto[] = useMemo(() => jobsData ?? [], [jobsData]);

  const facetModel = useMemo(() => facets(jobs), [jobs]);
  const filtered = useMemo(() => applyFilters(jobs, filters), [jobs, filters]);

  return (
    <PageShell variant="full">
      <PageHeader
        title="Jobs"
        actions={
          <JobToolbar
            filters={filters}
            facets={facetModel}
            onChange={setFilters}
            hiddenStatuses={hiddenStatuses}
            onToggleStatus={toggleStatus}
            onResetColumns={reset}
          />
        }
      />
      <FilterChips filters={filters} facets={facetModel} onChange={setFilters} />
      <Tabs defaultValue="board" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="min-h-0 flex-1">
          {isError ? (
            <div className="py-8 text-center text-sm text-destructive">Failed to load jobs. Check your connection.</div>
          ) : isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <JobsBoard jobs={filtered} groupBy={filters.groupBy} hiddenStatuses={hiddenStatuses} onJobClick={setSelectedJobId} />
          )}
        </TabsContent>
        <TabsContent value="table" className="min-h-0 flex-1 overflow-y-auto">
          <JobsTable jobs={filtered} groupBy={filters.groupBy} onJobClick={setSelectedJobId} />
        </TabsContent>
      </Tabs>
      <JobDetailDrawer jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </PageShell>
  );
}
```

- [ ] **Step 5: Delete `JobFilterBar.tsx`**

```bash
git rm frontend/src/features/jobs/JobFilterBar.tsx
```

- [ ] **Step 6: Run the full frontend suite + typecheck + lint**

Run: `cd frontend && npm run test`
Expected: PASS (all vitest suites, incl. `JobsBoard.test`).

Run: `cd frontend && npm run typecheck`
Expected: PASS (no type errors — the `JobFilters` rewrite is now fully wired; no references to `filters.status`/`companySearch`/`ListJobsParams` on the Jobs page remain).

Run: `cd frontend && npm run lint`
Expected: PASS (no unused imports left over from the removed Columns menu / `listParams`).

> If typecheck flags a leftover `GroupBy` import from `./JobsBoard` anywhere, repoint it to `./jobFilters`. If lint flags an unused import in `JobsBoard.tsx` (e.g. `ChevronDown`, `DropdownMenu*`, `Button`), remove it — those were only used by the deleted Columns menu.

- [ ] **Step 7: Run the full verify gate**

Run: `just verify`
Expected: PASS (backend build + backend tests + frontend typecheck + frontend build).

- [ ] **Step 8: Manual UI check**

Run: `just web` (and `just api` if not already running), open the Jobs page, and confirm:
- Header shows only: search field, **Filter**, **Group**, **Add job**.
- Filter popover: checkbox facets with counts, `+ N more`, salary + applied-date ranges, badge count, Clear all.
- Group popover: group-by radio + board-column checkboxes + Reset.
- Chips row appears under the toolbar; each `×` removes one value; Clear all resets (keeps grouping).
- Typing search, toggling filters, and changing grouping update the URL (`?q=…&status=…&group=…`); reload restores state; browser Back does not step through every keystroke.
- Board grouping/lanes and drag-to-change-status still work.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/JobsPage.tsx frontend/src/features/jobs/JobsBoard.tsx frontend/src/features/jobs/JobsBoard.test.tsx
git commit -m "feat(jobs): wire toolbar/chips into JobsPage; lift board columns; remove JobFilterBar"
```

---

## Self-Review

**Spec coverage** (spec §§1–11):
- §2 toolbar (search/Filter/Group/Add) → Tasks 7, 8, 10, 11. Search always-visible (approved simplification) folded into `JobToolbar`; no `SearchControl` file.
- §3 query/perf model, `JobFilters`, `toNumberOrNull`, `facets`, `applyFilters` (salary overlap, date, search), `activeFilterCount`, `filtersToChips`, `removeChip`, URL round-trip → Tasks 1–3; param-less fetch + memoized filter/facets → Task 11.
- §4 `FilterPopover` + `FacetSection` (top-6, +more, narrow box, pinned selection, ranges) → Tasks 6, 7.
- §5 `GroupPopover` (radio-group + folded columns + reset) + `useHiddenStatuses` → Tasks 5, 8.
- §6 `FilterChips` (per-value remove, ranges, search chip, stale-value chip, Clear all) → Task 9.
- §7 wiring (`useJobFilters` replace:true, `JobsBoard` param-less key + preserved lanes, delete `JobFilterBar`, repoint `GroupBy`) → Tasks 1, 4, 11.
- §9 tests → each task is TDD; component tests right-sized (one behavioral test each). No standalone `JobToolbar`-history/debounce test (no debounce by decision).
- §10 out-of-scope respected (no backend, no company fetch, static counts, no currency bands).

**Placeholder scan:** none — every code/test step contains full content; every referenced symbol is defined in an earlier task's Produces block or existing code.

**Type consistency:** `JobFilters` field names, `Facets`/`FacetOption`/`Chip` shapes, chip keys (`status:Applied`, `company:99`, `search`, `salaryMin`, …), and component prop names are consistent across Tasks 1–11. `JobsBoard` prop change (`listParams` → `hiddenStatuses`) is reflected in its test (Task 11) and its caller (`JobsPage`, Task 11). `getListJobsQueryKey()` is called param-less in both `useJobs()` (existing) and `JobsBoard` DnD (Task 11).

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-01-jobs-filter-group-toolbar.md`.
