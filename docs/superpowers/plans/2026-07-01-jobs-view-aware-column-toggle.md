# Jobs View-Aware Column Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Group popover's column show/hide section reflect the active view — status lanes in Board view (unchanged), data-field columns in Table view (new).

**Architecture:** Lift the Board/Table view into a persisted `useJobsView` hook and make `Tabs` controlled. Extract the localStorage hidden-set logic in `useHiddenStatuses` into a generic `useHiddenSet`, reused by a new `useHiddenTableColumns`. `GroupPopover` becomes view-agnostic — it renders one generic `ColumnsSection` descriptor that `JobsPage` builds per view. `JobsTable` renders columns data-driven from shared `jobTableColumns` metadata, honouring a `hiddenColumns` prop.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library, radix-based shadcn primitives (all already installed).

## Global Constraints

- Frontend only. No backend/MCP changes. Do not edit generated `frontend/src/lib/api/**`.
- No new dependencies. Reuse existing primitives (`Checkbox`, `RadioGroup`, `Separator`, `Popover`, `Table`, `Tabs`, `Label`, `Button`, `Input`).
- English UI copy. Section titles exactly `"Board columns"` and `"Table columns"`.
- Table columns are toggleable data fields; **nothing is locked** (all 9 can be hidden).
- Default-hidden table columns = exactly `['id', 'nextAction']`.
- View persisted to localStorage key `careerops:jobs:view` (default `board`, invalid → `board`).
- Hidden-table-columns key `careerops:jobs:hidden-table-columns`. Board key unchanged: `careerops:jobs:hidden-status-columns`.
- Frontend time uses `new Date()` (matches existing `JobsTable`); IClock is a backend/domain rule and does not apply here.
- `useHiddenStatuses` refactor must be behaviour-preserving: its existing test (`useHiddenStatuses.test.ts`) stays green, same STORAGE_KEY, same default, same public shape (`hiddenStatuses`/`toggleStatus`/`reset`). `ALL_STATUSES` stays exported (consumed by `JobsBoard`).
- **Verification approach:** per-task gate = that task's own vitest suite (esbuild transpile, no typecheck). Project `typecheck` + `build` + `just verify` run once at Task 9. Expected type/runtime ripple: Task 7 changes `GroupPopover`'s API, breaking `JobToolbar` (and its test) until Task 8; `JobToolbar`'s new prop is relied on by `JobsPage` at Task 9. This is contained and documented — do Tasks 7→8→9 in order.

---

### Task 1: Table column metadata (`jobTableColumns.ts`)

**Files:**
- Create: `frontend/src/features/jobs/jobTableColumns.ts`
- Test: `frontend/src/features/jobs/jobTableColumns.test.ts`

**Interfaces:**
- Produces: `type TableColumnKey`; `TABLE_COLUMNS: { key: TableColumnKey; label: string }[]`; `DEFAULT_HIDDEN_TABLE_COLUMNS: TableColumnKey[]`.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/features/jobs/jobTableColumns.test.ts
import { describe, it, expect } from 'vitest';
import { TABLE_COLUMNS, DEFAULT_HIDDEN_TABLE_COLUMNS } from './jobTableColumns';

describe('jobTableColumns', () => {
  it('lists the 9 data columns in header order', () => {
    expect(TABLE_COLUMNS.map(c => c.key)).toEqual([
      'id', 'company', 'title', 'status', 'priority', 'location', 'salary', 'applied', 'nextAction',
    ]);
  });

  it('has unique keys and non-empty labels', () => {
    const keys = TABLE_COLUMNS.map(c => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(TABLE_COLUMNS.every(c => c.label.length > 0)).toBe(true);
  });

  it('defaults to hiding id and nextAction', () => {
    expect(DEFAULT_HIDDEN_TABLE_COLUMNS).toEqual(['id', 'nextAction']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/jobTableColumns.test.ts`
Expected: FAIL — cannot resolve `./jobTableColumns`.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/features/jobs/jobTableColumns.ts
export type TableColumnKey =
  | 'id' | 'company' | 'title' | 'status' | 'priority'
  | 'location' | 'salary' | 'applied' | 'nextAction';

export const TABLE_COLUMNS: { key: TableColumnKey; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'company', label: 'Company' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'location', label: 'Location' },
  { key: 'salary', label: 'Salary' },
  { key: 'applied', label: 'Applied' },
  { key: 'nextAction', label: 'Next action' },
];

export const DEFAULT_HIDDEN_TABLE_COLUMNS: TableColumnKey[] = ['id', 'nextAction'];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/jobTableColumns.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/jobTableColumns.ts frontend/src/features/jobs/jobTableColumns.test.ts
git commit -m "feat(jobs): table column metadata (single source of truth)"
```

---

### Task 2: Generic hidden-set hook (`useHiddenSet.ts`)

**Files:**
- Create: `frontend/src/features/jobs/useHiddenSet.ts`
- Test: `frontend/src/features/jobs/useHiddenSet.test.ts`

**Interfaces:**
- Produces: `useHiddenSet<T extends string>(storageKey: string, all: readonly T[], defaultHidden: readonly T[]): { hidden: T[]; toggle: (value: T) => void; reset: () => void }`.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/features/jobs/useHiddenSet.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHiddenSet } from './useHiddenSet';

const KEY = 'test:hidden-set';

describe('useHiddenSet', () => {
  beforeEach(() => localStorage.clear());

  it('starts from the default hidden set', () => {
    const { result } = renderHook(() => useHiddenSet<'a' | 'b' | 'c'>(KEY, ['a', 'b', 'c'], ['b']));
    expect(result.current.hidden).toEqual(['b']);
  });

  it('toggles values off and on, then resets to default', () => {
    const { result } = renderHook(() => useHiddenSet<'a' | 'b' | 'c'>(KEY, ['a', 'b', 'c'], ['b']));
    act(() => result.current.toggle('b'));
    expect(result.current.hidden).not.toContain('b');
    act(() => result.current.toggle('a'));
    expect(result.current.hidden).toContain('a');
    act(() => result.current.reset());
    expect(result.current.hidden).toEqual(['b']);
  });

  it('persists toggles to localStorage', () => {
    const { result } = renderHook(() => useHiddenSet<'a' | 'b' | 'c'>(KEY, ['a', 'b', 'c'], ['b']));
    act(() => result.current.toggle('a'));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(['b', 'a']);
  });

  it('falls back to default on unparseable storage', () => {
    localStorage.setItem(KEY, 'not-json');
    const { result } = renderHook(() => useHiddenSet<'a' | 'b' | 'c'>(KEY, ['a', 'b', 'c'], ['b']));
    expect(result.current.hidden).toEqual(['b']);
  });

  it('drops values outside the known universe', () => {
    localStorage.setItem(KEY, JSON.stringify(['a', 'zzz']));
    const { result } = renderHook(() => useHiddenSet<'a' | 'b' | 'c'>(KEY, ['a', 'b', 'c'], ['b']));
    expect(result.current.hidden).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/useHiddenSet.test.ts`
Expected: FAIL — cannot resolve `./useHiddenSet`.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/features/jobs/useHiddenSet.ts
import { useCallback, useState } from 'react';

export function useHiddenSet<T extends string>(
  storageKey: string,
  all: readonly T[],
  defaultHidden: readonly T[],
) {
  const [hidden, setHidden] = useState<T[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) return [...defaultHidden];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [...defaultHidden];
      return parsed.filter((v): v is T => all.includes(v as T));
    } catch {
      return [...defaultHidden];
    }
  });

  const persist = useCallback((next: T[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }, [storageKey]);

  const toggle = useCallback((value: T) => {
    setHidden(prev => {
      const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value];
      persist(next);
      return next;
    });
  }, [persist]);

  const reset = useCallback(() => {
    const next = [...defaultHidden];
    persist(next);
    setHidden(next);
  }, [persist, defaultHidden]);

  return { hidden, toggle, reset };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/useHiddenSet.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/useHiddenSet.ts frontend/src/features/jobs/useHiddenSet.test.ts
git commit -m "feat(jobs): generic localStorage-backed useHiddenSet hook"
```

---

### Task 3: Refactor `useHiddenStatuses` onto `useHiddenSet`

**Files:**
- Modify: `frontend/src/features/jobs/useHiddenStatuses.ts`
- Test (existing, must stay green): `frontend/src/features/jobs/useHiddenStatuses.test.ts`

**Interfaces:**
- Consumes: `useHiddenSet` (Task 2).
- Produces (unchanged): `ALL_STATUSES: JobStatus[]`; `useHiddenStatuses(): { hiddenStatuses: JobStatus[]; toggleStatus: (s: JobStatus) => void; reset: () => void }`.

- [ ] **Step 1: Confirm the existing test is the gate (behaviour-preserving refactor, no new test)**

The existing `useHiddenStatuses.test.ts` asserts: default hidden = `['Rejected','Ghosted','Withdrawn','Archived']`; toggle off/on; reset to default. It must remain green after the refactor.

- [ ] **Step 2: Run the existing test to confirm current green**

Run: `cd frontend && npx vitest run src/features/jobs/useHiddenStatuses.test.ts`
Expected: PASS (2/2).

- [ ] **Step 3: Replace the implementation with a thin wrapper**

```ts
// frontend/src/features/jobs/useHiddenStatuses.ts
import { useHiddenSet } from './useHiddenSet';
import type { JobStatus } from '@/lib/api/model';

const ACTIVE_STATUSES: JobStatus[] = ['Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered'];
const CLOSED_STATUSES: JobStatus[] = ['Rejected', 'Ghosted', 'Withdrawn', 'Archived'];
export const ALL_STATUSES: JobStatus[] = [...ACTIVE_STATUSES, ...CLOSED_STATUSES];
const STORAGE_KEY = 'careerops:jobs:hidden-status-columns';

export function useHiddenStatuses() {
  const { hidden, toggle, reset } = useHiddenSet(STORAGE_KEY, ALL_STATUSES, CLOSED_STATUSES);
  return { hiddenStatuses: hidden, toggleStatus: toggle, reset };
}
```

- [ ] **Step 4: Run the existing test to verify it still passes**

Run: `cd frontend && npx vitest run src/features/jobs/useHiddenStatuses.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/useHiddenStatuses.ts
git commit -m "refactor(jobs): useHiddenStatuses wraps generic useHiddenSet"
```

---

### Task 4: `useHiddenTableColumns` hook

**Files:**
- Create: `frontend/src/features/jobs/useHiddenTableColumns.ts`
- Test: `frontend/src/features/jobs/useHiddenTableColumns.test.ts`

**Interfaces:**
- Consumes: `useHiddenSet` (Task 2); `TABLE_COLUMNS`, `DEFAULT_HIDDEN_TABLE_COLUMNS`, `TableColumnKey` (Task 1).
- Produces: `useHiddenTableColumns(): { hiddenColumns: TableColumnKey[]; toggleColumn: (c: TableColumnKey) => void; reset: () => void }`.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/features/jobs/useHiddenTableColumns.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHiddenTableColumns } from './useHiddenTableColumns';

describe('useHiddenTableColumns', () => {
  beforeEach(() => localStorage.clear());

  it('hides id and nextAction by default', () => {
    const { result } = renderHook(() => useHiddenTableColumns());
    expect(result.current.hiddenColumns).toEqual(['id', 'nextAction']);
  });

  it('toggles a column and resets to default', () => {
    const { result } = renderHook(() => useHiddenTableColumns());
    act(() => result.current.toggleColumn('id'));
    expect(result.current.hiddenColumns).not.toContain('id');
    act(() => result.current.toggleColumn('salary'));
    expect(result.current.hiddenColumns).toContain('salary');
    act(() => result.current.reset());
    expect(result.current.hiddenColumns).toEqual(['id', 'nextAction']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/useHiddenTableColumns.test.ts`
Expected: FAIL — cannot resolve `./useHiddenTableColumns`.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/features/jobs/useHiddenTableColumns.ts
import { useHiddenSet } from './useHiddenSet';
import { TABLE_COLUMNS, DEFAULT_HIDDEN_TABLE_COLUMNS, type TableColumnKey } from './jobTableColumns';

const ALL_TABLE_COLUMNS: TableColumnKey[] = TABLE_COLUMNS.map(c => c.key);
const STORAGE_KEY = 'careerops:jobs:hidden-table-columns';

export function useHiddenTableColumns() {
  const { hidden, toggle, reset } = useHiddenSet(STORAGE_KEY, ALL_TABLE_COLUMNS, DEFAULT_HIDDEN_TABLE_COLUMNS);
  return { hiddenColumns: hidden, toggleColumn: toggle, reset };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/useHiddenTableColumns.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/useHiddenTableColumns.ts frontend/src/features/jobs/useHiddenTableColumns.test.ts
git commit -m "feat(jobs): useHiddenTableColumns hook"
```

---

### Task 5: `useJobsView` hook

**Files:**
- Create: `frontend/src/features/jobs/useJobsView.ts`
- Test: `frontend/src/features/jobs/useJobsView.test.ts`

**Interfaces:**
- Produces: `type JobsView = 'board' | 'table'`; `useJobsView(): { view: JobsView; setView: (v: JobsView) => void }`.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/features/jobs/useJobsView.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useJobsView } from './useJobsView';

const KEY = 'careerops:jobs:view';

describe('useJobsView', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to board', () => {
    const { result } = renderHook(() => useJobsView());
    expect(result.current.view).toBe('board');
  });

  it('sets and persists the view', () => {
    const { result } = renderHook(() => useJobsView());
    act(() => result.current.setView('table'));
    expect(result.current.view).toBe('table');
    expect(localStorage.getItem(KEY)).toBe('table');
  });

  it('falls back to board for an invalid stored value', () => {
    localStorage.setItem(KEY, 'kanban');
    const { result } = renderHook(() => useJobsView());
    expect(result.current.view).toBe('board');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/useJobsView.test.ts`
Expected: FAIL — cannot resolve `./useJobsView`.

- [ ] **Step 3: Write minimal implementation**

```ts
// frontend/src/features/jobs/useJobsView.ts
import { useCallback, useState } from 'react';

export type JobsView = 'board' | 'table';

const STORAGE_KEY = 'careerops:jobs:view';
const DEFAULT_VIEW: JobsView = 'board';

function isView(v: unknown): v is JobsView {
  return v === 'board' || v === 'table';
}

export function useJobsView() {
  const [view, setView] = useState<JobsView>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return isView(raw) ? raw : DEFAULT_VIEW;
    } catch {
      return DEFAULT_VIEW;
    }
  });

  const set = useCallback((next: JobsView) => {
    setView(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable */ }
  }, []);

  return { view, setView: set };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/useJobsView.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/useJobsView.ts frontend/src/features/jobs/useJobsView.test.ts
git commit -m "feat(jobs): persisted useJobsView hook"
```

---

### Task 6: Data-driven `JobsTable` columns

**Files:**
- Modify: `frontend/src/features/jobs/JobsTable.tsx`
- Test: `frontend/src/features/jobs/JobsTable.test.tsx` (existing tests kept; new tests appended)

**Interfaces:**
- Consumes: `TABLE_COLUMNS`, `TableColumnKey` (Task 1).
- Produces: `JobsTable` gains optional prop `hiddenColumns?: TableColumnKey[]` (default `[]`). Existing props unchanged (`jobs`, `groupBy`, `onJobClick`).

- [ ] **Step 1: Append the failing tests**

Append these to `frontend/src/features/jobs/JobsTable.test.tsx` (keep the existing `job()` factory and the three current tests):

```tsx
  it('renders every column header when nothing is hidden', () => {
    renderWithProviders(<JobsTable jobs={[job()]} groupBy="status" hiddenColumns={[]} onJobClick={vi.fn()} />);
    for (const header of ['ID', 'Company', 'Title', 'Status', 'Priority', 'Location', 'Salary', 'Applied', 'Next action']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
    expect(screen.getByText('JOB-1')).toBeInTheDocument();
  });

  it('omits hidden columns from header and body', () => {
    const { container } = renderWithProviders(
      <JobsTable jobs={[job()]} groupBy="status" hiddenColumns={['id', 'nextAction']} onJobClick={vi.fn()} />,
    );
    expect(screen.queryByRole('columnheader', { name: 'ID' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Next action' })).toBeNull();
    expect(screen.queryByText('JOB-1')).toBeNull();
    expect(container.querySelector('[data-overdue]')).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Company' })).toBeInTheDocument();
  });

  it('spans the grouped lane header across the visible columns plus actions', () => {
    renderWithProviders(
      <JobsTable jobs={[job({ country: 'Norway' })]} groupBy="country" hiddenColumns={['id', 'nextAction']} onJobClick={vi.fn()} />,
    );
    const banner = screen.getByRole('button', { name: /Norway/ }).closest('td');
    expect(banner).toHaveAttribute('colspan', '8');
  });
```

Header count math for the last test: 9 columns − 2 hidden (`id`, `nextAction`) = 7 visible + 1 actions = 8.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd frontend && npx vitest run src/features/jobs/JobsTable.test.tsx`
Expected: FAIL — `JobsTable` does not yet accept `hiddenColumns`; headers use `columnheader` role but `colSpan` is hardcoded to 10, so the colspan assertion fails (expects `8`).

- [ ] **Step 3: Rewrite `JobsTable` to render columns data-driven**

```tsx
// frontend/src/features/jobs/JobsTable.tsx
import { Fragment } from 'react';
import { Link } from 'react-router';
import { ChevronRight, TriangleAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { JobStatusDropdown } from './JobStatusDropdown';
import { JobPriorityDropdown } from './JobPriorityDropdown';
import { JobActionsMenu } from './JobActionsMenu';
import { buildLanes } from './jobGrouping';
import { useCollapsedLanes } from './useCollapsedLanes';
import { TABLE_COLUMNS, type TableColumnKey } from './jobTableColumns';
import { cn } from '@/lib/utils';
import { formatDate, formatSalary } from '@/lib/format';
import type { JobDto } from '@/lib/api/model';
import type { GroupBy } from './jobFilters';

interface Props {
  jobs: JobDto[];
  groupBy: GroupBy;
  hiddenColumns?: TableColumnKey[];
  onJobClick: (id: number) => void;
}

function Cell({ column, job }: { column: TableColumnKey; job: JobDto }) {
  switch (column) {
    case 'id':
      return (
        <TableCell onClick={e => e.stopPropagation()}>
          <Link to={`/jobs/${job.id}`} target="_blank" rel="noopener noreferrer"
            className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline">
            JOB-{job.id}
          </Link>
        </TableCell>
      );
    case 'company':
      return <TableCell className="font-medium">{job.companyName}</TableCell>;
    case 'title':
      return <TableCell>{job.title}</TableCell>;
    case 'status':
      return (
        <TableCell onClick={e => e.stopPropagation()}>
          <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} />
        </TableCell>
      );
    case 'priority':
      return (
        <TableCell onClick={e => e.stopPropagation()}>
          <JobPriorityDropdown jobId={job.id as number} currentPriority={job.priority} />
        </TableCell>
      );
    case 'location':
      return (
        <TableCell className="text-sm text-muted-foreground">
          {[job.city, job.country].filter(Boolean).join(', ')}
          {job.remoteMode !== 'OnSite' && ` · ${job.remoteMode}`}
        </TableCell>
      );
    case 'salary':
      return (
        <TableCell className="text-right text-sm tabular-nums">
          {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) ?? '—'}
        </TableCell>
      );
    case 'applied':
      return <TableCell className="text-sm text-muted-foreground">{formatDate(job.appliedAtUtc) ?? '—'}</TableCell>;
    case 'nextAction': {
      const isOverdue = Boolean(job.nextActionAtUtc && new Date(job.nextActionAtUtc) < new Date());
      return (
        <TableCell
          data-overdue={isOverdue || undefined}
          className={cn('text-sm', isOverdue ? 'text-destructive' : 'text-muted-foreground')}
        >
          <span className="inline-flex items-center gap-1">
            {isOverdue && <TriangleAlert aria-hidden className="size-3.5 shrink-0" />}
            {formatDate(job.nextActionAtUtc) ?? '—'}
          </span>
        </TableCell>
      );
    }
  }
}

function JobRow({ columns, job, onJobClick }: { columns: TableColumnKey[]; job: JobDto; onJobClick: (id: number) => void }) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => onJobClick(job.id as number)}>
      {columns.map(c => <Cell key={c} column={c} job={job} />)}
      <TableCell onClick={e => e.stopPropagation()} className="w-8">
        <JobActionsMenu jobId={job.id as number} jobLabel={`JOB-${job.id} — ${job.companyName}`} />
      </TableCell>
    </TableRow>
  );
}

export function JobsTable({ jobs, groupBy, hiddenColumns = [], onJobClick }: Props) {
  const { isCollapsed, toggle } = useCollapsedLanes(groupBy);
  const lanes = buildLanes(jobs, groupBy);
  const grouped = groupBy !== 'status';
  const columns = TABLE_COLUMNS.filter(c => !hiddenColumns.includes(c.key));
  const colSpan = columns.length + 1;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map(c => (
            <TableHead key={c.key} className={c.key === 'salary' ? 'text-right' : undefined}>{c.label}</TableHead>
          ))}
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {lanes.map(lane => {
          const collapsed = grouped && isCollapsed(lane.key);
          return (
            <Fragment key={lane.key}>
              {grouped && (
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={colSpan} className="py-1.5">
                    <button
                      type="button"
                      onClick={() => toggle(lane.key)}
                      aria-expanded={!collapsed}
                      className="flex items-center gap-2 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ChevronRight aria-hidden className={cn('size-4 transition-transform motion-reduce:transition-none', !collapsed && 'rotate-90')} />
                      {lane.label}
                      <span className="rounded-full bg-muted-foreground/10 px-1.5 text-[11px] tabular-nums text-muted-foreground">
                        {lane.jobs.length}
                      </span>
                    </button>
                  </TableCell>
                </TableRow>
              )}
              {!collapsed && lane.jobs.map(job => <JobRow key={job.id as number} columns={columns.map(c => c.key)} job={job} onJobClick={onJobClick} />)}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `cd frontend && npx vitest run src/features/jobs/JobsTable.test.tsx`
Expected: PASS (6/6 — 3 existing + 3 new). The existing tests pass no `hiddenColumns`, so all columns render (default `[]`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/JobsTable.tsx frontend/src/features/jobs/JobsTable.test.tsx
git commit -m "feat(jobs): data-driven table columns with hiddenColumns prop"
```

---

### Task 7: View-agnostic `GroupPopover` (descriptor API)

**Files:**
- Modify: `frontend/src/features/jobs/GroupPopover.tsx`
- Test: `frontend/src/features/jobs/GroupPopover.test.tsx` (rewrite)

**Interfaces:**
- Produces: `interface ColumnsSection { title: string; options: { value: string; label: string }[]; hidden: string[]; onToggle: (value: string) => void; onReset: () => void }`. `GroupPopover` props become `{ groupBy: GroupBy; onGroupChange: (g: GroupBy) => void; columns: ColumnsSection }`.
- Note: the old props `hiddenStatuses` / `onToggleStatus` / `onResetColumns` are removed. This breaks `JobToolbar` until Task 8 (expected ripple — see Global Constraints).

- [ ] **Step 1: Rewrite the test**

```tsx
// frontend/src/features/jobs/GroupPopover.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { GroupPopover, type ColumnsSection } from './GroupPopover';

function setup(over: Partial<Parameters<typeof GroupPopover>[0]> = {}) {
  const columns: ColumnsSection = {
    title: 'Board columns',
    options: [{ value: 'Applied', label: 'Applied' }, { value: 'Rejected', label: 'Rejected' }],
    hidden: ['Rejected'],
    onToggle: vi.fn(),
    onReset: vi.fn(),
  };
  const props = { groupBy: 'status' as const, onGroupChange: vi.fn(), columns, ...over };
  renderWithProviders(<GroupPopover {...props} />);
  return props;
}

describe('GroupPopover', () => {
  it('changes grouping, toggles a column and resets via the descriptor', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: /group/i }));
    expect(await screen.findByText('Board columns')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Country'));
    expect(props.onGroupChange).toHaveBeenCalledWith('country');
    await userEvent.click(screen.getByLabelText('Applied'));
    expect(props.columns.onToggle).toHaveBeenCalledWith('Applied');
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(props.columns.onReset).toHaveBeenCalled();
  });

  it('renders a table-columns descriptor title and options', async () => {
    setup({
      columns: {
        title: 'Table columns',
        options: [{ value: 'salary', label: 'Salary' }, { value: 'nextAction', label: 'Next action' }],
        hidden: ['nextAction'],
        onToggle: vi.fn(),
        onReset: vi.fn(),
      },
    });
    await userEvent.click(screen.getByRole('button', { name: /group/i }));
    expect(await screen.findByText('Table columns')).toBeInTheDocument();
    expect(screen.getByLabelText('Next action')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/GroupPopover.test.tsx`
Expected: FAIL — `ColumnsSection` not exported; `GroupPopover` still expects the old status props.

- [ ] **Step 3: Rewrite `GroupPopover`**

```tsx
// frontend/src/features/jobs/GroupPopover.tsx
import { Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { GroupBy } from './jobFilters';

const GROUPS: { value: GroupBy; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'country', label: 'Country' },
  { value: 'company', label: 'Company' },
  { value: 'priority', label: 'Priority' },
];

export interface ColumnsSection {
  title: string;
  options: { value: string; label: string }[];
  hidden: string[];
  onToggle: (value: string) => void;
  onReset: () => void;
}

interface Props {
  groupBy: GroupBy;
  onGroupChange: (g: GroupBy) => void;
  columns: ColumnsSection;
}

export function GroupPopover({ groupBy, onGroupChange, columns }: Props) {
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
              <p className="text-xs font-medium text-muted-foreground">{columns.title}</p>
              <Button variant="ghost" size="sm" className="h-6 px-1 text-xs" onClick={columns.onReset}>Reset</Button>
            </div>
            <div className="space-y-1">
              {columns.options.map(o => {
                const id = `col-${o.value}`;
                return (
                  <div key={o.value} className="flex items-center gap-2">
                    <Checkbox id={id} checked={!columns.hidden.includes(o.value)} onCheckedChange={() => columns.onToggle(o.value)} />
                    <Label htmlFor={id} className="cursor-pointer text-sm font-normal">{o.label}</Label>
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/GroupPopover.test.tsx`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/GroupPopover.tsx frontend/src/features/jobs/GroupPopover.test.tsx
git commit -m "refactor(jobs): GroupPopover renders a view-agnostic columns descriptor"
```

---

### Task 8: `JobToolbar` forwards the columns descriptor

**Files:**
- Modify: `frontend/src/features/jobs/JobToolbar.tsx`
- Test: `frontend/src/features/jobs/JobToolbar.test.tsx` (update props)

**Interfaces:**
- Consumes: `ColumnsSection` (Task 7).
- Produces: `JobToolbar` props become `{ filters: JobFilters; facets: Facets; onChange: (f: JobFilters) => void; columns: ColumnsSection }` (status props removed).

- [ ] **Step 1: Update the test to pass a columns descriptor**

```tsx
// frontend/src/features/jobs/JobToolbar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { JobToolbar } from './JobToolbar';
import { DEFAULT_FILTERS, facets } from './jobFilters';
import type { ColumnsSection } from './GroupPopover';

const columns: ColumnsSection = {
  title: 'Board columns', options: [], hidden: [], onToggle: () => {}, onReset: () => {},
};

describe('JobToolbar', () => {
  it('renders the search field, Filter, Group and Add controls', () => {
    renderWithProviders(
      <JobToolbar filters={DEFAULT_FILTERS} facets={facets([])} onChange={() => {}} columns={columns} />,
    );
    expect(screen.getByPlaceholderText(/search jobs/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /group/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add job/i })).toBeInTheDocument();
  });

  it('reports typed search text', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <JobToolbar filters={DEFAULT_FILTERS} facets={facets([])} onChange={onChange} columns={columns} />,
    );
    await userEvent.type(screen.getByPlaceholderText(/search jobs/i), 'a');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'a' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/jobs/JobToolbar.test.tsx`
Expected: FAIL — `JobToolbar` still requires `hiddenStatuses`/`onToggleStatus`/`onResetColumns`; runtime error because `GroupPopover` now needs `columns`.

- [ ] **Step 3: Update `JobToolbar`**

```tsx
// frontend/src/features/jobs/JobToolbar.tsx
import { Input } from '@/components/ui/input';
import { FilterPopover } from './FilterPopover';
import { GroupPopover, type ColumnsSection } from './GroupPopover';
import { JobQuickAdd } from './JobQuickAdd';
import type { GroupBy, JobFilters, Facets } from './jobFilters';

interface Props {
  filters: JobFilters;
  facets: Facets;
  onChange: (f: JobFilters) => void;
  columns: ColumnsSection;
}

export function JobToolbar({ filters, facets, onChange, columns }: Props) {
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
      <JobQuickAdd />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/jobs/JobToolbar.test.tsx`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/JobToolbar.tsx frontend/src/features/jobs/JobToolbar.test.tsx
git commit -m "refactor(jobs): JobToolbar forwards a columns descriptor to GroupPopover"
```

---

### Task 9: Wire `JobsPage` (view state + descriptor) and full verification

**Files:**
- Modify: `frontend/src/pages/JobsPage.tsx`
- Modify: `docs/knowledge-base/03-decisions.md` (append decision entry)

**Interfaces:**
- Consumes: `useJobsView` (Task 5), `useHiddenTableColumns` (Task 4), `useHiddenStatuses`/`ALL_STATUSES` (Task 3), `TABLE_COLUMNS` (Task 1), `ColumnsSection` (Task 7), `JobToolbar` (Task 8), `JobsTable.hiddenColumns` (Task 6).

- [ ] **Step 1: Rewrite `JobsPage`**

```tsx
// frontend/src/pages/JobsPage.tsx
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useJobs } from '@/lib/api/jobs/hooks';
import { JobsBoard } from '@/features/jobs/JobsBoard';
import { JobsTable } from '@/features/jobs/JobsTable';
import { JobToolbar } from '@/features/jobs/JobToolbar';
import { FilterChips } from '@/features/jobs/FilterChips';
import { useJobFilters } from '@/features/jobs/useJobFilters';
import { useHiddenStatuses, ALL_STATUSES } from '@/features/jobs/useHiddenStatuses';
import { useHiddenTableColumns } from '@/features/jobs/useHiddenTableColumns';
import { useJobsView, type JobsView } from '@/features/jobs/useJobsView';
import { facets, applyFilters } from '@/features/jobs/jobFilters';
import { TABLE_COLUMNS, type TableColumnKey } from '@/features/jobs/jobTableColumns';
import type { ColumnsSection } from '@/features/jobs/GroupPopover';
import { JobDetailDrawer } from '@/features/jobs/JobDetailDrawer';
import type { JobDto, JobStatus } from '@/lib/api/model';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';

export default function JobsPage() {
  const { filters, setFilters } = useJobFilters();
  const { hiddenStatuses, toggleStatus, reset: resetStatuses } = useHiddenStatuses();
  const { hiddenColumns, toggleColumn, reset: resetColumns } = useHiddenTableColumns();
  const { view, setView } = useJobsView();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const { data: jobsData, isLoading, isError } = useJobs();
  const jobs: JobDto[] = useMemo(() => jobsData ?? [], [jobsData]);

  const facetModel = useMemo(() => facets(jobs), [jobs]);
  const filtered = useMemo(() => applyFilters(jobs, filters), [jobs, filters]);

  const columnsSection: ColumnsSection = useMemo(
    () =>
      view === 'table'
        ? {
            title: 'Table columns',
            options: TABLE_COLUMNS.map(c => ({ value: c.key, label: c.label })),
            hidden: hiddenColumns,
            onToggle: v => toggleColumn(v as TableColumnKey),
            onReset: resetColumns,
          }
        : {
            title: 'Board columns',
            options: ALL_STATUSES.map(s => ({ value: s, label: s })),
            hidden: hiddenStatuses,
            onToggle: v => toggleStatus(v as JobStatus),
            onReset: resetStatuses,
          },
    [view, hiddenColumns, toggleColumn, resetColumns, hiddenStatuses, toggleStatus, resetStatuses],
  );

  return (
    <PageShell variant="full">
      <PageHeader
        title="Jobs"
        actions={<JobToolbar filters={filters} facets={facetModel} onChange={setFilters} columns={columnsSection} />}
      />
      <FilterChips filters={filters} facets={facetModel} onChange={setFilters} />
      <Tabs value={view} onValueChange={v => setView(v as JobsView)} className="flex min-h-0 flex-1 flex-col">
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
          <JobsTable jobs={filtered} groupBy={filters.groupBy} hiddenColumns={hiddenColumns} onJobClick={setSelectedJobId} />
        </TabsContent>
      </Tabs>
      <JobDetailDrawer jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </PageShell>
  );
}
```

- [ ] **Step 2: Append a decision entry to `docs/knowledge-base/03-decisions.md`**

Add a new dated decision (use the next free D-number; heading style must match the surrounding entries). Content:

```markdown
### D63 — Group popover column toggle is view-aware (2026-07-01)
The Group popover's column show/hide section reflects the active view: status
lanes ("Board columns") in Board view, data fields ("Table columns") in Table
view. View is persisted (`careerops:jobs:view`). Table column visibility is
persisted (`careerops:jobs:hidden-table-columns`), default-hidden = id +
nextAction, nothing locked. `GroupPopover` is view-agnostic (renders a generic
`ColumnsSection` descriptor built by `JobsPage`); the hidden-set localStorage
logic is shared via `useHiddenSet`. Frontend display pref only — no audit-trail,
approval-workflow, or document-control impact.
```

- [ ] **Step 3: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: PASS — all suites green (existing + the new/updated ones from Tasks 1–8).

- [ ] **Step 4: Typecheck and build**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: typecheck clean; build succeeds. (Confirm the exact script names in `frontend/package.json`; if `typecheck` is absent, use `npx tsc -p tsconfig.app.json --noEmit`.)

- [ ] **Step 5: Full project verify**

Run: `just verify`
Expected: backend unit + integration + frontend all green.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/JobsPage.tsx docs/knowledge-base/03-decisions.md
git commit -m "feat(jobs): view-aware column toggle in Group popover (board/table)"
```

- [ ] **Step 7: Manual UI check (report to human; do not automate)**

Run the app. Verify: (1) Board view → Group popover shows "Board columns" (statuses); hiding a status hides its lane. (2) Switch to Table → Group popover swaps to "Table columns" (fields); ID + Next action hidden by default; toggling a field shows/hides its table column; grouped lane header spans correctly. (3) Reload → the last-used view is restored. (4) Reset restores each view's defaults.

---

## Self-Review

**Spec coverage:**
- View-aware section (board vs table) → Tasks 7 (popover), 9 (descriptor wiring). ✅
- Lift + persist view → Task 5 + Task 9 controlled `Tabs`. ✅
- Generic hidden-set + table-columns hook → Tasks 2, 4; `useHiddenStatuses` refactor Task 3. ✅
- Table column metadata single source of truth → Task 1, consumed in Tasks 4, 6, 9. ✅
- Data-driven table with dynamic colSpan, nothing locked, default-hidden id+nextAction → Task 6 (component) + Task 4 (default). ✅
- Edge case all-hidden (actions column always renders) → Task 6 structure (actions `TableCell` outside the mapped columns). ✅
- Decision log → Task 9 Step 2 (D63). ✅

**Placeholder scan:** No TBD/TODO; every code step shows full code; every test asserts concrete values. ✅

**Type consistency:** `TableColumnKey`, `TABLE_COLUMNS`, `DEFAULT_HIDDEN_TABLE_COLUMNS` (Task 1) used identically in Tasks 4/6/9. `ColumnsSection` shape defined in Task 7, consumed unchanged in Tasks 8/9. Hook return names (`hiddenColumns`/`toggleColumn`, `hiddenStatuses`/`toggleStatus`, `view`/`setView`) consistent across producing and consuming tasks. `useHiddenSet` returns `{ hidden, toggle, reset }`; wrappers rename at their boundary. ✅
