# Jobs Configurable Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable Sort popover to the Jobs page (field + direction), applied client-side within lanes across both views, persisted in the URL.

**Architecture:** A dependency-free `jobSort.ts` module owns the sort domain (types, `DEFAULT_SORT`, `SORT_FIELDS`, `compareJobs`). `JobFilters` carries `sortField`/`sortDir` (persisted to the URL like `groupBy`). `buildLanes` orders rows via `compareJobs`. A `SortPopover` in the toolbar edits the setting; `JobsPage` threads it into both views.

**Tech Stack:** React 19 + TypeScript + Vite, Vitest + Testing Library, shadcn/ui (Popover, RadioGroup, Label, Separator, Button), lucide-react, react-router `useSearchParams`.

## Global Constraints

- **Frontend-only.** No backend, API, orval, migration, or `frontend/src/lib/api/**` edits. No new dependencies.
- **jobSort.ts is dependency-free** of `jobFilters.ts` (no import from it) to avoid a circular import; `jobFilters.ts` imports the sort model one-way. jobSort inlines its own numeric coercion.
- **`DEFAULT_SORT = { field: 'updated', dir: 'desc' }`** — must reproduce the current `buildLanes` order (`updatedAtUtc` descending) exactly. Regression baseline: unchanged callers behave identically.
- **`buildLanes` sort arg is a default param** (`sort: JobSort = DEFAULT_SORT`); `JobsBoard`/`JobsTable` `sort` prop is **optional** defaulting to `DEFAULT_SORT`. Existing tests must stay green with no edits.
- **Nulls always sort last**, in both directions, for `applied` and `salary`.
- **Priority is a string union** (`'Low' | 'Medium' | 'High'`); rank High > Medium > Low.
- **Salary value** = `salaryMax ?? salaryMin`, coerced with `Number(...)`; `null`/`''`/`NaN` → null (last).
- **Exact copy (verbatim):** trigger button label `Sort`; section headings `Sort by` and `Direction`; direction option labels `Descending` and `Ascending`; field labels `Updated`, `Applied`, `Company`, `Priority`, `Salary`.
- **URL params:** field → `sort`, direction → `dir`; each set only when it differs from `DEFAULT_SORT`. Invalid/absent → `DEFAULT_SORT`.
- **Per-task gate** = that task's own vitest suite (esbuild transpile, no typecheck). Full typecheck + build + `just verify` run once at Task 7.
- Frontend uses `new Date()` directly (the IClock rule is backend/domain-only); do not introduce a clock abstraction here.
- Test commands run from `frontend/`: `npx vitest run <path>`. Final verification: `cd frontend && npm run build`, then `just verify` from repo root.

---

### Task 1: jobSort model + compareJobs comparator

**Files:**
- Create: `frontend/src/features/jobs/jobSort.ts`
- Test: `frontend/src/features/jobs/jobSort.test.ts`

**Interfaces:**
- Consumes: `JobDto` from `@/lib/api/model` (type only).
- Produces:
  - `type SortField = 'updated' | 'applied' | 'company' | 'priority' | 'salary'`
  - `type SortDir = 'asc' | 'desc'`
  - `interface JobSort { field: SortField; dir: SortDir }`
  - `const DEFAULT_SORT: JobSort = { field: 'updated', dir: 'desc' }`
  - `const SORT_FIELDS: { value: SortField; label: string }[]`
  - `function compareJobs(sort: JobSort): (a: JobDto, b: JobDto) => number`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/jobs/jobSort.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { compareJobs, DEFAULT_SORT, SORT_FIELDS, type JobSort } from './jobSort';
import type { JobDto } from '@/lib/api/model';

const job = (over: Partial<JobDto> = {}): JobDto => ({
  id: 1, companyId: 1, companyName: 'Northwind Synthetics', title: 'Role', status: 'Applied',
  priority: 'Medium', source: 'CompanySite', sourceUrl: null, country: 'Norway', city: null,
  locationText: null, remoteMode: 'Remote', employmentType: 'FullTime', salaryMin: null, salaryMax: null,
  salaryCurrency: null, salaryPeriod: 'Annual', deadlineAtUtc: null, appliedAtUtc: null,
  lastContactedAtUtc: null, nextActionAtUtc: null, fitScore: null, notes: null,
  createdAtUtc: '2026-06-01T00:00:00Z', updatedAtUtc: '2026-06-01T00:00:00Z', ...over,
});

const ids = (jobs: JobDto[], sort: JobSort) => [...jobs].sort(compareJobs(sort)).map(j => j.id);

describe('jobSort', () => {
  it('DEFAULT_SORT is updated descending', () => {
    expect(DEFAULT_SORT).toEqual({ field: 'updated', dir: 'desc' });
  });

  it('SORT_FIELDS lists the five sortable fields with labels', () => {
    expect(SORT_FIELDS.map(f => f.value)).toEqual(['updated', 'applied', 'company', 'priority', 'salary']);
    expect(SORT_FIELDS.map(f => f.label)).toEqual(['Updated', 'Applied', 'Company', 'Priority', 'Salary']);
  });

  it('sorts by updated in both directions', () => {
    const jobs = [
      job({ id: 1, updatedAtUtc: '2026-06-01T00:00:00Z' }),
      job({ id: 3, updatedAtUtc: '2026-06-03T00:00:00Z' }),
      job({ id: 2, updatedAtUtc: '2026-06-02T00:00:00Z' }),
    ];
    expect(ids(jobs, { field: 'updated', dir: 'desc' })).toEqual([3, 2, 1]);
    expect(ids(jobs, { field: 'updated', dir: 'asc' })).toEqual([1, 2, 3]);
  });

  it('sorts by company name with locale compare', () => {
    const jobs = [job({ id: 1, companyName: 'Zeta' }), job({ id: 2, companyName: 'Alpha' })];
    expect(ids(jobs, { field: 'company', dir: 'asc' })).toEqual([2, 1]);
    expect(ids(jobs, { field: 'company', dir: 'desc' })).toEqual([1, 2]);
  });

  it('sorts by priority rank High > Medium > Low', () => {
    const jobs = [
      job({ id: 1, priority: 'Low' }),
      job({ id: 2, priority: 'High' }),
      job({ id: 3, priority: 'Medium' }),
    ];
    expect(ids(jobs, { field: 'priority', dir: 'desc' })).toEqual([2, 3, 1]);
    expect(ids(jobs, { field: 'priority', dir: 'asc' })).toEqual([1, 3, 2]);
  });

  it('sorts applied dates with nulls last in both directions', () => {
    const jobs = [
      job({ id: 1, appliedAtUtc: null }),
      job({ id: 2, appliedAtUtc: '2026-05-01T00:00:00Z' }),
      job({ id: 3, appliedAtUtc: '2026-05-03T00:00:00Z' }),
    ];
    expect(ids(jobs, { field: 'applied', dir: 'asc' })).toEqual([2, 3, 1]);
    expect(ids(jobs, { field: 'applied', dir: 'desc' })).toEqual([3, 2, 1]);
  });

  it('sorts salary by max-then-min, coercing strings, nulls last', () => {
    const jobs = [
      job({ id: 1, salaryMin: null, salaryMax: null }),
      job({ id: 2, salaryMin: '500000', salaryMax: null }),
      job({ id: 3, salaryMin: 400000, salaryMax: 900000 }),
    ];
    expect(ids(jobs, { field: 'salary', dir: 'desc' })).toEqual([3, 2, 1]);
    expect(ids(jobs, { field: 'salary', dir: 'asc' })).toEqual([2, 3, 1]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/jobSort.test.ts`
Expected: FAIL — cannot resolve `./jobSort`.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/features/jobs/jobSort.ts`:

```ts
import type { JobDto } from '@/lib/api/model';

export type SortField = 'updated' | 'applied' | 'company' | 'priority' | 'salary';
export type SortDir = 'asc' | 'desc';
export interface JobSort {
  field: SortField;
  dir: SortDir;
}

export const DEFAULT_SORT: JobSort = { field: 'updated', dir: 'desc' };

export const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: 'updated', label: 'Updated' },
  { value: 'applied', label: 'Applied' },
  { value: 'company', label: 'Company' },
  { value: 'priority', label: 'Priority' },
  { value: 'salary', label: 'Salary' },
];

const PRIORITY_RANK: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

function salaryOf(job: JobDto): number | null {
  const raw = job.salaryMax ?? job.salaryMin;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

// Nulls always sort last, regardless of direction: the null branches return a
// fixed sign; only the both-present comparison is flipped by `sign`.
function nullsLast<T>(a: T | null, b: T | null, base: (x: T, y: T) => number, sign: number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return sign * base(a, b);
}

export function compareJobs(sort: JobSort): (a: JobDto, b: JobDto) => number {
  const sign = sort.dir === 'asc' ? 1 : -1;
  return (a, b) => {
    switch (sort.field) {
      case 'updated':
        return sign * a.updatedAtUtc.localeCompare(b.updatedAtUtc);
      case 'company':
        return sign * a.companyName.localeCompare(b.companyName);
      case 'priority':
        return sign * ((PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0));
      case 'applied':
        return nullsLast(a.appliedAtUtc, b.appliedAtUtc, (x, y) => x.localeCompare(y), sign);
      case 'salary':
        return nullsLast(salaryOf(a), salaryOf(b), (x, y) => x - y, sign);
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/jobSort.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/jobSort.ts frontend/src/features/jobs/jobSort.test.ts
git commit -m "feat(jobs): add jobSort model and compareJobs comparator"
```

---

### Task 2: Persist sort field/direction in URL filters

**Files:**
- Modify: `frontend/src/features/jobs/jobFilters.ts` (interface `JobFilters`, `DEFAULT_FILTERS`, `filtersToUrl`, `parseFiltersFromUrl`)
- Test: `frontend/src/features/jobs/jobFilters.test.ts` (append)

**Interfaces:**
- Consumes: `SortField`, `SortDir`, `DEFAULT_SORT`, `SORT_FIELDS` from `./jobSort`.
- Produces: `JobFilters.sortField: SortField`, `JobFilters.sortDir: SortDir`; URL keys `sort` and `dir`.

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/features/jobs/jobFilters.test.ts` (inside the file, after the existing describe blocks):

```ts
describe('sort persistence', () => {
  it('DEFAULT_FILTERS defaults sort to updated/desc', () => {
    expect(DEFAULT_FILTERS.sortField).toBe('updated');
    expect(DEFAULT_FILTERS.sortDir).toBe('desc');
  });

  it('omits sort params from the URL when they equal the default', () => {
    const sp = filtersToUrl({ ...DEFAULT_FILTERS });
    expect(sp.has('sort')).toBe(false);
    expect(sp.has('dir')).toBe(false);
  });

  it('encodes non-default sort field and direction', () => {
    const sp = filtersToUrl({ ...DEFAULT_FILTERS, sortField: 'salary', sortDir: 'asc' });
    expect(sp.get('sort')).toBe('salary');
    expect(sp.get('dir')).toBe('asc');
  });

  it('parses sort field and direction from the URL', () => {
    const f = parseFiltersFromUrl(new URLSearchParams('sort=company&dir=asc'));
    expect(f.sortField).toBe('company');
    expect(f.sortDir).toBe('asc');
  });

  it('falls back to the default for invalid sort params', () => {
    const f = parseFiltersFromUrl(new URLSearchParams('sort=bogus&dir=sideways'));
    expect(f.sortField).toBe('updated');
    expect(f.sortDir).toBe('desc');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/jobFilters.test.ts`
Expected: FAIL — `DEFAULT_FILTERS.sortField` is undefined / parse returns no sort fields.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/features/jobs/jobFilters.ts`:

Add to the top-of-file imports (after the existing `import { formatDate, formatNumber } from '@/lib/format';` line):

```ts
import { DEFAULT_SORT, SORT_FIELDS, type SortField, type SortDir } from './jobSort';
```

Add two fields to the `JobFilters` interface, immediately after `groupBy: GroupBy;`:

```ts
  sortField: SortField;
  sortDir: SortDir;
```

Add two fields to `DEFAULT_FILTERS`, immediately after `groupBy: 'status',`:

```ts
  sortField: DEFAULT_SORT.field,
  sortDir: DEFAULT_SORT.dir,
```

In `filtersToUrl`, add these two lines immediately before `return sp;`:

```ts
  if (f.sortField !== DEFAULT_SORT.field) sp.set('sort', f.sortField);
  if (f.sortDir !== DEFAULT_SORT.dir) sp.set('dir', f.sortDir);
```

In `parseFiltersFromUrl`, add these lines immediately after the existing `groupBy` derivation (after `const groupBy = ...`):

```ts
  const sortRaw = sp.get('sort');
  const sortField: SortField = SORT_FIELDS.some(o => o.value === sortRaw) ? (sortRaw as SortField) : DEFAULT_SORT.field;
  const dirRaw = sp.get('dir');
  const sortDir: SortDir = dirRaw === 'asc' || dirRaw === 'desc' ? dirRaw : DEFAULT_SORT.dir;
```

Add `sortField,` and `sortDir,` to the returned object, immediately after `groupBy,`:

```ts
    groupBy,
    sortField,
    sortDir,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/jobFilters.test.ts`
Expected: PASS (all existing + 5 new).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/jobFilters.ts frontend/src/features/jobs/jobFilters.test.ts
git commit -m "feat(jobs): persist sort field and direction in url filters"
```

---

### Task 3: buildLanes sorts via compareJobs

**Files:**
- Modify: `frontend/src/features/jobs/jobGrouping.ts` (`buildLanes` signature + sort call)
- Test: `frontend/src/features/jobs/jobGrouping.test.ts` (append)

**Interfaces:**
- Consumes: `compareJobs`, `DEFAULT_SORT`, `JobSort` from `./jobSort`.
- Produces: `buildLanes(jobs: JobDto[], groupBy: GroupBy, sort?: JobSort): Lane[]` — sort defaults to `DEFAULT_SORT`.

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/features/jobs/jobGrouping.test.ts` (new describe block after the existing ones):

```ts
describe('buildLanes sorting', () => {
  it('orders a status lane by the given sort (company ascending)', () => {
    const lanes = buildLanes([
      job({ id: 1, companyName: 'Zeta' }),
      job({ id: 2, companyName: 'Alpha' }),
    ], 'status', { field: 'company', dir: 'asc' });
    expect(lanes[0].jobs.map(j => j.id)).toEqual([2, 1]);
  });

  it('keeps salary nulls last regardless of direction', () => {
    const jobs = [
      job({ id: 1, salaryMax: null, salaryMin: null }),
      job({ id: 2, salaryMax: 900000 }),
    ];
    expect(buildLanes(jobs, 'status', { field: 'salary', dir: 'desc' })[0].jobs.map(j => j.id)).toEqual([2, 1]);
    expect(buildLanes(jobs, 'status', { field: 'salary', dir: 'asc' })[0].jobs.map(j => j.id)).toEqual([2, 1]);
  });

  it('defaults to updated descending when no sort is passed', () => {
    const lanes = buildLanes([
      job({ id: 1, updatedAtUtc: '2026-06-01T00:00:00Z' }),
      job({ id: 2, updatedAtUtc: '2026-06-02T00:00:00Z' }),
    ], 'status');
    expect(lanes[0].jobs.map(j => j.id)).toEqual([2, 1]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/jobGrouping.test.ts`
Expected: FAIL — `buildLanes` ignores the 3rd argument (company sort test returns default order `[1,2]`... note ids differ; the company test expects `[2,1]`).

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/features/jobs/jobGrouping.ts`:

Change the imports at the top. Replace:

```ts
import type { JobDto, Priority } from '@/lib/api/model';
import type { GroupBy } from './jobFilters';
```

with:

```ts
import type { JobDto, Priority } from '@/lib/api/model';
import type { GroupBy } from './jobFilters';
import { compareJobs, DEFAULT_SORT, type JobSort } from './jobSort';
```

Change the `buildLanes` signature and its first line. Replace:

```ts
export function buildLanes(jobs: JobDto[], groupBy: GroupBy): Lane[] {
  const sorted = [...jobs].sort((a, b) => b.updatedAtUtc.localeCompare(a.updatedAtUtc));
```

with:

```ts
export function buildLanes(jobs: JobDto[], groupBy: GroupBy, sort: JobSort = DEFAULT_SORT): Lane[] {
  const sorted = [...jobs].sort(compareJobs(sort));
```

Leave the rest of `buildLanes` unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/jobGrouping.test.ts`
Expected: PASS (existing + 3 new). The existing "ordered by updatedAtUtc descending" test still passes because `DEFAULT_SORT` reproduces that order.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/jobGrouping.ts frontend/src/features/jobs/jobGrouping.test.ts
git commit -m "feat(jobs): buildLanes sorts via compareJobs"
```

---

### Task 4: Thread sort into board and table views

**Files:**
- Modify: `frontend/src/features/jobs/JobsBoard.tsx` (add `sort` prop, pass to `buildLanes`)
- Modify: `frontend/src/features/jobs/JobsTable.tsx` (add `sort` prop, pass to `buildLanes`)
- Test: `frontend/src/features/jobs/JobsBoard.test.tsx` (append), `frontend/src/features/jobs/JobsTable.test.tsx` (append)

**Interfaces:**
- Consumes: `JobSort`, `DEFAULT_SORT` from `./jobSort`; `buildLanes(jobs, groupBy, sort)`.
- Produces: `JobsBoard` and `JobsTable` each accept `sort?: JobSort` (default `DEFAULT_SORT`).

- [ ] **Step 1: Write the failing tests**

Append to `frontend/src/features/jobs/JobsTable.test.tsx` (new test inside the existing `describe('JobsTable', ...)`), and add `DEFAULT_SORT` is not needed here since we pass an explicit sort:

```ts
  it('orders rows by the given sort (company ascending)', () => {
    const { container } = renderWithProviders(
      <JobsTable
        jobs={[job({ id: 1, companyName: 'Zeta Corp' }), job({ id: 2, companyName: 'Alpha Corp' })]}
        groupBy="status"
        sort={{ field: 'company', dir: 'asc' }}
        onJobClick={vi.fn()}
      />,
    );
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].textContent).toContain('Alpha Corp');
    expect(rows[1].textContent).toContain('Zeta Corp');
  });
```

Append to `frontend/src/features/jobs/JobsBoard.test.tsx` (new test inside the existing `describe('JobsBoard', ...)`):

```tsx
  it("orders cards within a status column by the given sort", () => {
    const { container } = renderWithProviders(
      <JobsBoard
        jobs={[
          job(1, "Applied", { updatedAtUtc: "2026-06-01T00:00:00Z" }),
          job(2, "Applied", { updatedAtUtc: "2026-06-05T00:00:00Z" }),
        ]}
        groupBy="status"
        hiddenStatuses={CLOSED}
        sort={{ field: "updated", dir: "asc" }}
        onJobClick={() => {}}
      />,
    );
    const text = container.textContent ?? "";
    expect(text.indexOf("Role 1")).toBeLessThan(text.indexOf("Role 2"));
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/features/jobs/JobsTable.test.tsx src/features/jobs/JobsBoard.test.tsx`
Expected: FAIL — `sort` prop is not accepted / has no effect (order assertions fail).

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/features/jobs/JobsTable.tsx`:

Add to the imports (after `import type { GroupBy } from './jobFilters';`):

```ts
import { DEFAULT_SORT, type JobSort } from './jobSort';
```

Add `sort` to `Props`, immediately after `hiddenColumns?: TableColumnKey[];`:

```ts
  sort?: JobSort;
```

Update the component signature and the `buildLanes` call. Replace:

```ts
export function JobsTable({ jobs, groupBy, hiddenColumns = [], onJobClick }: Props) {
  const { isCollapsed, toggle } = useCollapsedLanes(groupBy);
  const lanes = buildLanes(jobs, groupBy);
```

with:

```ts
export function JobsTable({ jobs, groupBy, hiddenColumns = [], sort = DEFAULT_SORT, onJobClick }: Props) {
  const { isCollapsed, toggle } = useCollapsedLanes(groupBy);
  const lanes = buildLanes(jobs, groupBy, sort);
```

In `frontend/src/features/jobs/JobsBoard.tsx`:

Add to the imports (after `import type { GroupBy } from './jobFilters';`):

```ts
import { DEFAULT_SORT, type JobSort } from './jobSort';
```

Add `sort` to `Props`, immediately after `hiddenStatuses: JobStatus[];`:

```ts
  sort?: JobSort;
```

Update the component signature. Replace:

```ts
export function JobsBoard({ jobs, groupBy, hiddenStatuses, onJobClick }: Props) {
```

with:

```ts
export function JobsBoard({ jobs, groupBy, hiddenStatuses, sort = DEFAULT_SORT, onJobClick }: Props) {
```

Update the `buildLanes` call (line reads `const lanes = buildLanes(jobs, groupBy);`). Replace with:

```ts
  const lanes = buildLanes(jobs, groupBy, sort);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/features/jobs/JobsTable.test.tsx src/features/jobs/JobsBoard.test.tsx`
Expected: PASS (all existing + 1 new each).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/JobsBoard.tsx frontend/src/features/jobs/JobsTable.tsx frontend/src/features/jobs/JobsBoard.test.tsx frontend/src/features/jobs/JobsTable.test.tsx
git commit -m "feat(jobs): thread sort into board and table views"
```

---

### Task 5: SortPopover control

**Files:**
- Create: `frontend/src/features/jobs/SortPopover.tsx`
- Test: `frontend/src/features/jobs/SortPopover.test.tsx`

**Interfaces:**
- Consumes: `SORT_FIELDS`, `DEFAULT_SORT`, `JobSort`, `SortField`, `SortDir` from `./jobSort`; shadcn `Popover`, `RadioGroup`, `Label`, `Separator`, `Button`; `ArrowDownUp` from `lucide-react`.
- Produces: `SortPopover({ sort, onChange }: { sort: JobSort; onChange: (sort: JobSort) => void })`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/jobs/SortPopover.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { SortPopover } from './SortPopover';
import { DEFAULT_SORT } from './jobSort';

function setup(over: Partial<Parameters<typeof SortPopover>[0]> = {}) {
  const props = { sort: DEFAULT_SORT, onChange: vi.fn(), ...over };
  renderWithProviders(<SortPopover {...props} />);
  return props;
}

describe('SortPopover', () => {
  it('renders the sort fields and directions', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /sort/i }));
    expect(await screen.findByText('Sort by')).toBeInTheDocument();
    expect(screen.getByText('Direction')).toBeInTheDocument();
    for (const label of ['Updated', 'Applied', 'Company', 'Priority', 'Salary']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Descending')).toBeInTheDocument();
    expect(screen.getByLabelText('Ascending')).toBeInTheDocument();
  });

  it('reports a field change', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: /sort/i }));
    await userEvent.click(screen.getByLabelText('Company'));
    expect(props.onChange).toHaveBeenCalledWith({ field: 'company', dir: 'desc' });
  });

  it('reports a direction change', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: /sort/i }));
    await userEvent.click(screen.getByLabelText('Ascending'));
    expect(props.onChange).toHaveBeenCalledWith({ field: 'updated', dir: 'asc' });
  });

  it('resets to the default sort', async () => {
    const props = setup({ sort: { field: 'salary', dir: 'asc' } });
    await userEvent.click(screen.getByRole('button', { name: /sort/i }));
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(props.onChange).toHaveBeenCalledWith(DEFAULT_SORT);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/SortPopover.test.tsx`
Expected: FAIL — cannot resolve `./SortPopover`.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/features/jobs/SortPopover.tsx`:

```tsx
import { ArrowDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SORT_FIELDS, DEFAULT_SORT, type JobSort, type SortField, type SortDir } from './jobSort';

const DIRECTIONS: { value: SortDir; label: string }[] = [
  { value: 'desc', label: 'Descending' },
  { value: 'asc', label: 'Ascending' },
];

interface Props {
  sort: JobSort;
  onChange: (sort: JobSort) => void;
}

export function SortPopover({ sort, onChange }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ArrowDownUp aria-hidden className="size-4" /> Sort
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Sort by</p>
            <RadioGroup value={sort.field} onValueChange={v => onChange({ ...sort, field: v as SortField })}>
              {SORT_FIELDS.map(f => (
                <div key={f.value} className="flex items-center gap-2">
                  <RadioGroupItem id={`sort-field-${f.value}`} value={f.value} />
                  <Label htmlFor={`sort-field-${f.value}`} className="cursor-pointer text-sm font-normal">{f.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Direction</p>
              <Button variant="ghost" size="sm" className="h-6 px-1 text-xs" onClick={() => onChange(DEFAULT_SORT)}>Reset</Button>
            </div>
            <RadioGroup value={sort.dir} onValueChange={v => onChange({ ...sort, dir: v as SortDir })}>
              {DIRECTIONS.map(d => (
                <div key={d.value} className="flex items-center gap-2">
                  <RadioGroupItem id={`sort-dir-${d.value}`} value={d.value} />
                  <Label htmlFor={`sort-dir-${d.value}`} className="cursor-pointer text-sm font-normal">{d.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/SortPopover.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/SortPopover.tsx frontend/src/features/jobs/SortPopover.test.tsx
git commit -m "feat(jobs): add SortPopover control"
```

---

### Task 6: Mount SortPopover in JobToolbar

**Files:**
- Modify: `frontend/src/features/jobs/JobToolbar.tsx` (add `sort` + `onSortChange` props, render `SortPopover`)
- Test: `frontend/src/features/jobs/JobToolbar.test.tsx` (update prop wiring + assert Sort control)

**Interfaces:**
- Consumes: `SortPopover` from `./SortPopover`; `JobSort` from `./jobSort`.
- Produces: `JobToolbar` props gain `sort: JobSort` and `onSortChange: (s: JobSort) => void`.

- [ ] **Step 1: Update the test (failing)**

Replace the whole body of `frontend/src/features/jobs/JobToolbar.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { JobToolbar } from './JobToolbar';
import { DEFAULT_FILTERS, facets } from './jobFilters';
import { DEFAULT_SORT } from './jobSort';
import type { ColumnsSection } from './GroupPopover';

const columns: ColumnsSection = {
  title: 'Board columns', options: [], hidden: [], onToggle: () => {}, onReset: () => {},
};

function renderToolbar(over: Partial<Parameters<typeof JobToolbar>[0]> = {}) {
  const props = {
    filters: DEFAULT_FILTERS, facets: facets([]), onChange: vi.fn(),
    columns, sort: DEFAULT_SORT, onSortChange: vi.fn(), ...over,
  };
  renderWithProviders(<JobToolbar {...props} />);
  return props;
}

describe('JobToolbar', () => {
  it('renders the search field, Filter, Group, Sort and Add controls', () => {
    renderToolbar();
    expect(screen.getByPlaceholderText(/search jobs/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /group/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sort/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add job/i })).toBeInTheDocument();
  });

  it('reports typed search text', async () => {
    const props = renderToolbar();
    await userEvent.type(screen.getByPlaceholderText(/search jobs/i), 'a');
    expect(props.onChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'a' }));
  });

  it('reports a sort change from the Sort popover', async () => {
    const props = renderToolbar();
    await userEvent.click(screen.getByRole('button', { name: /sort/i }));
    await userEvent.click(await screen.findByLabelText('Company'));
    expect(props.onSortChange).toHaveBeenCalledWith({ field: 'company', dir: 'desc' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/JobToolbar.test.tsx`
Expected: FAIL — no Sort button; `onSortChange` prop unused.

- [ ] **Step 3: Write minimal implementation**

Replace the whole `frontend/src/features/jobs/JobToolbar.tsx` with:

```tsx
import { Input } from '@/components/ui/input';
import { FilterPopover } from './FilterPopover';
import { GroupPopover, type ColumnsSection } from './GroupPopover';
import { SortPopover } from './SortPopover';
import { JobQuickAdd } from './JobQuickAdd';
import type { GroupBy, JobFilters, Facets } from './jobFilters';
import type { JobSort } from './jobSort';

interface Props {
  filters: JobFilters;
  facets: Facets;
  onChange: (f: JobFilters) => void;
  columns: ColumnsSection;
  sort: JobSort;
  onSortChange: (s: JobSort) => void;
}

export function JobToolbar({ filters, facets, onChange, columns, sort, onSortChange }: Props) {
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
        columns={columns}
      />
      <SortPopover sort={sort} onChange={onSortChange} />
      <JobQuickAdd />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/JobToolbar.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/JobToolbar.tsx frontend/src/features/jobs/JobToolbar.test.tsx
git commit -m "feat(jobs): mount SortPopover in JobToolbar"
```

---

### Task 7: Wire configurable sort into JobsPage + decision log + full verify

**Files:**
- Modify: `frontend/src/pages/JobsPage.tsx` (derive `sort`, pass to toolbar + both views)
- Modify: `docs/knowledge-base/03-decisions.md` (append D64)
- Verify: full frontend typecheck + build, then `just verify`

**Interfaces:**
- Consumes: `JobSort` from `@/features/jobs/jobSort`; `JobToolbar` props `sort` + `onSortChange`; `JobsBoard`/`JobsTable` `sort` prop.
- Produces: end-to-end wired sort; no new exported API.

- [ ] **Step 1: Implement the wiring**

In `frontend/src/pages/JobsPage.tsx`:

Add to the imports (after `import { TABLE_COLUMNS, type TableColumnKey } from '@/features/jobs/jobTableColumns';`):

```ts
import type { JobSort } from '@/features/jobs/jobSort';
```

Derive the sort object. Add this line immediately after `const filtered = useMemo(() => applyFilters(jobs, filters), [jobs, filters]);`:

```ts
  const sort: JobSort = { field: filters.sortField, dir: filters.sortDir };
```

Update the `JobToolbar` usage in the `PageHeader` `actions` prop. Replace:

```tsx
        actions={<JobToolbar filters={filters} facets={facetModel} onChange={setFilters} columns={columnsSection} />}
```

with:

```tsx
        actions={
          <JobToolbar
            filters={filters}
            facets={facetModel}
            onChange={setFilters}
            columns={columnsSection}
            sort={sort}
            onSortChange={s => setFilters({ ...filters, sortField: s.field, sortDir: s.dir })}
          />
        }
```

Update the `JobsBoard` usage. Replace:

```tsx
            <JobsBoard jobs={filtered} groupBy={filters.groupBy} hiddenStatuses={hiddenStatuses} onJobClick={setSelectedJobId} />
```

with:

```tsx
            <JobsBoard jobs={filtered} groupBy={filters.groupBy} hiddenStatuses={hiddenStatuses} sort={sort} onJobClick={setSelectedJobId} />
```

Update the `JobsTable` usage. Replace:

```tsx
          <JobsTable jobs={filtered} groupBy={filters.groupBy} hiddenColumns={hiddenColumns} onJobClick={setSelectedJobId} />
```

with:

```tsx
          <JobsTable jobs={filtered} groupBy={filters.groupBy} hiddenColumns={hiddenColumns} sort={sort} onJobClick={setSelectedJobId} />
```

- [ ] **Step 2: Append the decision log entry**

Append to `docs/knowledge-base/03-decisions.md` (match the heading style of the most recent existing entry in that file; the text below is the content, adapt the heading format to the file's convention):

```markdown
### D64 — Jobs configurable sort (2026-07-01)

Added a Sort popover to the Jobs toolbar: field (Updated, Applied, Company, Priority,
Salary) + direction (Descending/Ascending), applied client-side within lanes across both
views. Default `updated`/`desc` reproduces the prior hardcoded order (no regression).
Sort state persists in the URL alongside filters and `groupBy` (`sort`, `dir` params).
Comparator (`compareJobs`) sorts nulls last in both directions; priority ranks
High > Medium > Low. No backend/API/orval change (jobs are fully client-loaded; filtering
is already client-side). No audit-trail, approval-workflow, or document-control impact.
```

- [ ] **Step 3: Run the full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: PASS — all suites green (existing + new sort tests).

- [ ] **Step 4: Typecheck + build**

Run: `cd frontend && npm run build`
Expected: PASS — no TypeScript errors (this is the first full `tsc` gate; it proves the `JobFilters` field additions, the `compareJobs` switch exhaustiveness over `SortField`, and all prop wiring typecheck).

- [ ] **Step 5: Full verify**

Run: `just verify`
Expected: PASS — frontend + backend gates green.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/JobsPage.tsx docs/knowledge-base/03-decisions.md
git commit -m "feat(jobs): wire configurable sort into JobsPage"
```

---

## Self-Review

**Spec coverage:**
- Separate Sort popover → Task 5 (`SortPopover`), Task 6 (mounted in toolbar). ✅
- Client-side comparator, nulls last, priority rank, salary max??min coercion → Task 1 (`compareJobs`). ✅
- Shared across both views → Task 4 (both consume `sort`), Task 7 (single `sort` from filters drives both). ✅
- Lean 5 fields (Updated, Applied, Company, Priority, Salary) → Task 1 (`SORT_FIELDS`). ✅
- URL persistence (`sort`, `dir`; default omitted; invalid → default) → Task 2. ✅
- Default Updated/desc == current order → Task 1 `DEFAULT_SORT`, Task 3 default param + regression test. ✅
- Sort within lanes → Task 3 (`buildLanes` sorts full array before grouping; lane order unchanged). ✅
- Testing list from spec → covered across Task 1–7 test steps. ✅
- Out-of-scope items (server-side sort, no-grouping, clickable headers, multi-key) → not implemented. ✅

**Placeholder scan:** No TBD/TODO. The Task 4 `JobsBoard` test block contains an intentional quoting-typo callout with the correction spelled out inline — the implementer writes the corrected single-quoted title. All code steps show complete code. ✅

**Type consistency:** `SortField`/`SortDir`/`JobSort`/`DEFAULT_SORT`/`SORT_FIELDS`/`compareJobs` names identical across Tasks 1–7. `buildLanes(jobs, groupBy, sort?)` signature consistent between Task 3 (definition) and Task 4 (callers). `JobToolbar` props `sort`/`onSortChange` consistent between Task 6 (definition) and Task 7 (usage). `JobsBoard`/`JobsTable` `sort?` prop consistent Task 4 ↔ Task 7. ✅

**Import-cycle guard:** `jobSort.ts` imports only `JobDto` (type) — no `jobFilters` import. `jobFilters.ts` imports `jobSort` one-way. No cycle. ✅
