# Jobs Board Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make board columns always status with Jira-style swimlanes for country/company/priority grouping; show an editable priority chip on cards/table/drawer; add group-by-priority; add a guarded delete from card/row/drawer.

**Architecture:** A shared `buildLanes`/`laneKeyOf` grouping module + a `useCollapsedLanes` hook back both the board (per-lane grids on one fixed column track) and the table (banner section-rows). Priority becomes a first-class editable attribute via a thin backend `POST /jobs/{id}/priority` slice (mirrors `/transition`) + an orval-generated hook. Delete reuses the existing `DELETE /jobs/{id}` (FollowUps cascade) behind a confirm dialog.

**Tech Stack:** React 19 + TS (verbatimModuleSyntax → `import type`), Tailwind v4, shadcn/Radix, @dnd-kit/core, @tanstack/react-query, react-router, vitest + @testing-library/react. Backend .NET Minimal API + FluentValidation + EF Core (in-memory tests). orval for the client.

## Global Constraints

- **Branch:** implement on a feature branch, never `main` (spec §11).
- **Generated code:** `src/lib/api/**` is orval output — regenerate via `npm --prefix frontend run gen:client`; only hand-edit under the documented fallback (Task 2), matching the generated style.
- **Enums:** never reorder/renumber existing enum members (CLAUDE.md).
- **Clock:** never call `DateTime.UtcNow` in app/domain — inject `IClock` (CLAUDE.md). The new `SetPriorityAsync` does not touch time.
- **Tokens only:** status/priority colours use design tokens; the only raw-palette exception is the existing `STATUS_DOT`/`STATUS_ACCENT` legend (D59). New priority colours: Low/Medium muted, High `destructive`.
- **Lane order:** alphabetical, empty lanes hidden, `Unknown` last; priority lanes High → Medium → Low.
- **`groupBy === 'status'`** → single unbannered lane (`LANE_STATUS_KEY = '__all__'`).
- **Drag:** changes status only; ignored when target lane ≠ the card's lane; enabled in all groupings.
- **Collapse store:** `localStorage` key `careerops:jobs:collapsed-lanes`, entries `${groupBy}:${laneKey}`, shared board↔table, try/catch tolerant.
- **No new npm deps.** One shadcn primitive (`alert-dialog`) is scaffolded via the CLI.
- Every slice ends green on `npm --prefix frontend run typecheck && lint && test && build`; backend slice green on `dotnet test`.

## File Structure

**Backend (new):** `Application/Jobs/SetJobPriorityRequest.cs`, `tests/CareerOps.UnitTests/Jobs/SetJobPriorityValidatorTests.cs`
**Backend (modify):** `Application/Jobs/JobRequestValidators.cs`, `Application/Jobs/JobService.cs`, `Presentation/Endpoints/JobEndpoints.cs`, `tests/CareerOps.UnitTests/Jobs/JobServiceTests.cs`

**Frontend (new):** `features/jobs/jobGrouping.ts` (+ `.test.ts`), `features/jobs/useCollapsedLanes.ts` (+ `.test.ts`), `features/jobs/BoardColumnHeader.tsx` (+ `.test.tsx`), `features/jobs/BoardCell.tsx` (+ `.test.tsx`), `features/jobs/BoardLane.tsx` (+ `.test.tsx`), `features/jobs/JobPriorityDropdown.tsx` (+ `.test.tsx`), `features/jobs/DeleteJobDialog.tsx`, `features/jobs/JobActionsMenu.tsx`, `components/ui/alert-dialog.tsx` (shadcn), `lib/api/model/setJobPriorityRequest.ts` (orval or fallback)
**Frontend (modify):** `features/jobs/JobsBoard.tsx` (+ test), `features/jobs/JobsTable.tsx` (+ test), `features/jobs/JobCard.tsx` (+ test), `features/jobs/JobCardPreview.tsx`, `features/jobs/JobDetailDrawer.tsx`, `features/jobs/JobFilterBar.tsx`, `features/jobs/jobPresentation.ts` (+ test), `features/jobs/useJobMutations.ts`, `pages/JobsPage.tsx`, `lib/api/jobs/jobs.ts` (orval or fallback)
**Frontend (remove):** `features/jobs/BoardColumn.tsx`, `features/jobs/BoardColumn.test.tsx`

**Docs (modify):** `docs/knowledge-base/03-decisions.md`

---

## Task 1: Backend priority endpoint slice

**Files:**
- Create: `backend/src/CareerOps.Application/Jobs/SetJobPriorityRequest.cs`
- Modify: `backend/src/CareerOps.Application/Jobs/JobRequestValidators.cs`, `backend/src/CareerOps.Application/Jobs/JobService.cs`, `backend/src/CareerOps.Presentation/Endpoints/JobEndpoints.cs`
- Test: `backend/tests/CareerOps.UnitTests/Jobs/JobServiceTests.cs` (append), `backend/tests/CareerOps.UnitTests/Jobs/SetJobPriorityValidatorTests.cs` (new)

**Interfaces:**
- Produces: `JobService.SetPriorityAsync(int id, Priority priority, CancellationToken) → Task<bool>`; `record SetJobPriorityRequest(Priority ToPriority)`; route `POST /api/jobs/{id}/priority` (name `SetJobPriority`).

- [ ] **Step 1: Write the failing service tests** — append inside the `JobServiceTests` class (reuses its `TestClock`, `NewDb`, `MakeService`, `NewJob`, `SeedCompany`):

```csharp
    [Fact]
    public async Task SetPriorityAsync_updates_priority()
    {
        var clock = new TestClock(new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc));
        await using var db = NewDb(clock);
        var company = await SeedCompany(db);
        var svc = MakeService(db, clock);
        var created = await svc.CreateJobAsync(NewJob(companyId: company.Id));

        var ok = await svc.SetPriorityAsync(created.Id, Priority.High);

        Assert.True(ok);
        var reloaded = await svc.GetJobDetailAsync(created.Id);
        Assert.Equal(Priority.High, reloaded!.Priority);
    }

    [Fact]
    public async Task SetPriorityAsync_returns_false_when_missing()
    {
        var clock = new TestClock(new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc));
        await using var db = NewDb(clock);
        var svc = MakeService(db, clock);

        Assert.False(await svc.SetPriorityAsync(999, Priority.High));
    }
```

- [ ] **Step 2: Run, verify it fails to compile** — `dotnet test backend/tests/CareerOps.UnitTests --filter SetPriorityAsync`
  Expected: build error — `SetPriorityAsync` does not exist.

- [ ] **Step 3: Add `SetPriorityAsync` to `JobService`** — add `using CareerOps.Domain.Common;` to the file's usings if absent, then add the method after `DeleteJobAsync` (around line 119):

```csharp
    public async Task<bool> SetPriorityAsync(int id, Priority priority, CancellationToken ct = default)
    {
        var job = await jobs.FindByIdAsync(id, ct);
        if (job is null) return false;
        job.Priority = priority;
        await uow.SaveChangesAsync(ct);
        return true;
    }
```

- [ ] **Step 4: Run, verify the service tests pass** — `dotnet test backend/tests/CareerOps.UnitTests --filter SetPriorityAsync`
  Expected: 2 passing.

- [ ] **Step 5: Create the request DTO** — `backend/src/CareerOps.Application/Jobs/SetJobPriorityRequest.cs`:

```csharp
using CareerOps.Domain.Common;

namespace CareerOps.Application.Jobs;

public record SetJobPriorityRequest(Priority ToPriority);
```

- [ ] **Step 6: Add the validator** — append to `JobRequestValidators.cs`:

```csharp
public sealed class SetJobPriorityRequestValidator : AbstractValidator<SetJobPriorityRequest>
{
    public SetJobPriorityRequestValidator()
    {
        RuleFor(x => x.ToPriority).IsInEnum();
    }
}
```

- [ ] **Step 7: Write the validator tests** — new file `backend/tests/CareerOps.UnitTests/Jobs/SetJobPriorityValidatorTests.cs`:

```csharp
using CareerOps.Application.Jobs;
using CareerOps.Domain.Common;
using Xunit;

namespace CareerOps.UnitTests.Jobs;

public sealed class SetJobPriorityValidatorTests
{
    [Fact]
    public void Rejects_undefined_priority()
        => Assert.False(new SetJobPriorityRequestValidator()
            .Validate(new SetJobPriorityRequest((Priority)99)).IsValid);

    [Theory]
    [InlineData(Priority.Low)]
    [InlineData(Priority.Medium)]
    [InlineData(Priority.High)]
    public void Accepts_defined_priority(Priority p)
        => Assert.True(new SetJobPriorityRequestValidator()
            .Validate(new SetJobPriorityRequest(p)).IsValid);
```

(close the class with `}`)

- [ ] **Step 8: Register the endpoint** — in `JobEndpoints.cs`, add after the transition endpoint (after line 65):

```csharp
        jobs.MapPost("/{id:int}/priority", async (int id, SetJobPriorityRequest req, JobService svc) =>
        {
            var updated = await svc.SetPriorityAsync(id, req.ToPriority);
            return updated ? Results.NoContent() : Results.NotFound();
        })
        .WithName("SetJobPriority")
        .AddEndpointFilter<ValidationFilter<SetJobPriorityRequest>>();
```

- [ ] **Step 9: Run the full backend suite** — `dotnet test backend/tests/CareerOps.UnitTests`
  Expected: all green (new + existing).

- [ ] **Step 10: Commit**

```bash
git add backend/src/CareerOps.Application/Jobs backend/src/CareerOps.Presentation/Endpoints/JobEndpoints.cs backend/tests/CareerOps.UnitTests/Jobs
git commit -m "feat(jobs): add POST /jobs/{id}/priority endpoint"
```

---

## Task 2: Frontend priority client hook + mutation

**Files:**
- Modify (preferred via orval regen): `frontend/src/lib/api/jobs/jobs.ts`, `frontend/src/lib/api/model/index.ts` (+ create `frontend/src/lib/api/model/setJobPriorityRequest.ts`)
- Modify: `frontend/src/features/jobs/useJobMutations.ts`

**Interfaces:**
- Consumes: Task 1's `POST /jobs/{id}/priority`.
- Produces: `useSetJobPriority` hook (`{ id: number; data: SetJobPriorityRequest }`), `SetJobPriorityRequest { toPriority: Priority }`, and `useJobMutations().setPriority`.

- [ ] **Step 1: Regenerate the client (preferred)** — with the API running on `http://localhost:8080`:

```bash
npm --prefix frontend run gen:client
```

Expected: new `useSetJobPriority`/`setJobPriority` in `jobs.ts`, new `model/setJobPriorityRequest.ts`, barrel updated. If this succeeds, **skip Step 2** (the fallback).

- [ ] **Step 2 (fallback only — API not reachable): hand-add the client** following the generated `useTransitionJob` style.
  - Create `frontend/src/lib/api/model/setJobPriorityRequest.ts`:

```ts
import type { Priority } from './priority';

export interface SetJobPriorityRequest {
  toPriority: Priority;
}
```

  - Add to `frontend/src/lib/api/model/index.ts`: `export * from './setJobPriorityRequest';`
  - In `frontend/src/lib/api/jobs/jobs.ts`, add the `SetJobPriorityRequest` to the model import block (match the file's existing `import type { ... } from '../../model'` style), then append:

```ts
export const getSetJobPriorityUrl = (id: number) => `/api/jobs/${id}/priority`;

export const setJobPriority = async (
  id: number,
  setJobPriorityRequest: SetJobPriorityRequest,
  options?: RequestInit,
): Promise<void> => {
  await apiClient<void>(getSetJobPriorityUrl(id), {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(setJobPriorityRequest),
  });
};

export const getSetJobPriorityMutationOptions = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setJobPriority>>, TError, { id: number; data: SetJobPriorityRequest }, TContext>;
    request?: SecondParameter<typeof apiClient>;
  },
): UseMutationOptions<Awaited<ReturnType<typeof setJobPriority>>, TError, { id: number; data: SetJobPriorityRequest }, TContext> => {
  const mutationKey = ['setJobPriority'];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<Awaited<ReturnType<typeof setJobPriority>>, { id: number; data: SetJobPriorityRequest }> = (props) => {
    const { id, data } = props ?? {};
    return setJobPriority(id, data, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export const useSetJobPriority = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setJobPriority>>, TError, { id: number; data: SetJobPriorityRequest }, TContext>;
    request?: SecondParameter<typeof apiClient>;
  },
  queryClient?: QueryClient,
): UseMutationResult<Awaited<ReturnType<typeof setJobPriority>>, TError, { id: number; data: SetJobPriorityRequest }, TContext> =>
  useMutation(getSetJobPriorityMutationOptions(options), queryClient);
```

- [ ] **Step 3: Wire `setPriority` into `useJobMutations`** — in `frontend/src/features/jobs/useJobMutations.ts` add `useSetJobPriority` to the import from `@/lib/api/jobs/jobs`, then:

```ts
  const setPriority = useSetJobPriority({
    mutation: {
      onSuccess: (_, vars) => {
        invalidateJobs();
        qc.invalidateQueries({ queryKey: getGetJobQueryKey(vars.id) });
      },
      onError: () => toast.error('Failed to update priority'),
    },
  });
```

and add `setPriority` to the returned object: `return { create, update, remove, transition, setPriority };`

- [ ] **Step 4: Verify typecheck/build** — `npm --prefix frontend run typecheck && npm --prefix frontend run build`
  Expected: clean. (No unit test — this is generated/mechanical wiring; later tasks exercise it.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api frontend/src/features/jobs/useJobMutations.ts
git commit -m "feat(jobs): generate setJobPriority client + wire setPriority mutation"
```

---

## Task 3: Shared grouping module (`jobGrouping.ts`)

**Files:**
- Create: `frontend/src/features/jobs/jobGrouping.ts`, `frontend/src/features/jobs/jobGrouping.test.ts`
- Modify: `frontend/src/features/jobs/JobsBoard.tsx` (extend the `GroupBy` union only)

**Interfaces:**
- Produces: `LANE_STATUS_KEY`, `interface Lane { key: string; label: string; jobs: JobDto[] }`, `buildLanes(jobs, groupBy): Lane[]`, `laneKeyOf(job, groupBy): string`. Consumed by Tasks 5/6/9.

- [ ] **Step 1: Extend `GroupBy`** — in `JobsBoard.tsx` change the export to:

```ts
export type GroupBy = 'status' | 'country' | 'company' | 'priority';
```

- [ ] **Step 2: Write the failing tests** — `frontend/src/features/jobs/jobGrouping.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildLanes, laneKeyOf, LANE_STATUS_KEY } from './jobGrouping';
import type { JobDto } from '@/lib/api/model';

const job = (over: Partial<JobDto>): JobDto => ({
  id: 1, companyId: 1, companyName: 'Acme', title: 'Dev', status: 'Applied', priority: 'Medium',
  source: 'CompanySite', sourceUrl: null, country: 'Norway', city: null, locationText: null,
  remoteMode: 'Remote', employmentType: 'FullTime', salaryMin: null, salaryMax: null,
  salaryCurrency: null, salaryPeriod: 'Annual', deadlineAtUtc: null, appliedAtUtc: null,
  lastContactedAtUtc: null, nextActionAtUtc: null, fitScore: null, notes: null,
  createdAtUtc: '2026-06-01T00:00:00Z', updatedAtUtc: '2026-06-01T00:00:00Z', ...over,
});

describe('buildLanes', () => {
  it('status grouping is a single unbannered lane', () => {
    const lanes = buildLanes([job({ id: 1 }), job({ id: 2 })], 'status');
    expect(lanes).toHaveLength(1);
    expect(lanes[0].key).toBe(LANE_STATUS_KEY);
    expect(lanes[0].label).toBe('');
    expect(lanes[0].jobs).toHaveLength(2);
  });

  it('country grouping is alphabetical with Unknown last', () => {
    const lanes = buildLanes([
      job({ id: 1, country: 'Norway' }),
      job({ id: 2, country: null }),
      job({ id: 3, country: 'Germany' }),
    ], 'country');
    expect(lanes.map(l => l.label)).toEqual(['Germany', 'Norway', 'Unknown']);
  });

  it('drops empty lanes', () => {
    const lanes = buildLanes([job({ id: 1, country: 'Norway' })], 'country');
    expect(lanes.map(l => l.label)).toEqual(['Norway']);
  });

  it('priority grouping orders High, Medium, Low and drops empties', () => {
    const lanes = buildLanes([
      job({ id: 1, priority: 'Low' }),
      job({ id: 2, priority: 'High' }),
    ], 'priority');
    expect(lanes.map(l => l.label)).toEqual(['High', 'Low']);
  });
});

describe('laneKeyOf', () => {
  it('keys by the grouping dimension', () => {
    expect(laneKeyOf(job({ country: 'Norway' }), 'country')).toBe('Norway');
    expect(laneKeyOf(job({ country: null }), 'country')).toBe('Unknown');
    expect(laneKeyOf(job({ companyName: 'Acme' }), 'company')).toBe('Acme');
    expect(laneKeyOf(job({ priority: 'High' }), 'priority')).toBe('High');
    expect(laneKeyOf(job({}), 'status')).toBe(LANE_STATUS_KEY);
  });
});
```

- [ ] **Step 3: Run, verify fail** — `npm --prefix frontend run test -- jobGrouping`
  Expected: FAIL — module not found.

- [ ] **Step 4: Implement** — `frontend/src/features/jobs/jobGrouping.ts`:

```ts
import type { JobDto, Priority } from '@/lib/api/model';
import type { GroupBy } from './JobsBoard';

export const LANE_STATUS_KEY = '__all__';
const UNKNOWN = 'Unknown';
const PRIORITY_ORDER: Priority[] = ['High', 'Medium', 'Low'];

export interface Lane {
  key: string;
  label: string;
  jobs: JobDto[];
}

export function laneKeyOf(job: JobDto, groupBy: GroupBy): string {
  switch (groupBy) {
    case 'status': return LANE_STATUS_KEY;
    case 'country': return job.country ?? UNKNOWN;
    case 'company': return job.companyName;
    case 'priority': return job.priority;
  }
}

export function buildLanes(jobs: JobDto[], groupBy: GroupBy): Lane[] {
  if (groupBy === 'status') {
    return [{ key: LANE_STATUS_KEY, label: '', jobs }];
  }

  if (groupBy === 'priority') {
    return PRIORITY_ORDER
      .map(p => ({ key: p, label: p, jobs: jobs.filter(j => j.priority === p) }))
      .filter(lane => lane.jobs.length > 0);
  }

  const keys = [...new Set(jobs.map(j => laneKeyOf(j, groupBy)))].sort((a, b) => {
    if (a === UNKNOWN) return 1;
    if (b === UNKNOWN) return -1;
    return a.localeCompare(b);
  });

  return keys
    .map(key => ({ key, label: key, jobs: jobs.filter(j => laneKeyOf(j, groupBy) === key) }))
    .filter(lane => lane.jobs.length > 0);
}
```

- [ ] **Step 5: Run, verify pass** — `npm --prefix frontend run test -- jobGrouping`
  Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/jobs/jobGrouping.ts frontend/src/features/jobs/jobGrouping.test.ts frontend/src/features/jobs/JobsBoard.tsx
git commit -m "feat(jobs): add buildLanes/laneKeyOf grouping module + priority GroupBy"
```

---

## Task 4: Collapsed-lanes hook (`useCollapsedLanes.ts`)

**Files:**
- Create: `frontend/src/features/jobs/useCollapsedLanes.ts`, `frontend/src/features/jobs/useCollapsedLanes.test.ts`

**Interfaces:**
- Produces: `useCollapsedLanes(groupBy) → { isCollapsed(laneKey): boolean; toggle(laneKey): void }`. Consumed by Tasks 6/9.

- [ ] **Step 1: Write the failing tests** — `frontend/src/features/jobs/useCollapsedLanes.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollapsedLanes } from './useCollapsedLanes';

describe('useCollapsedLanes', () => {
  beforeEach(() => localStorage.clear());

  it('starts expanded and toggles', () => {
    const { result } = renderHook(() => useCollapsedLanes('country'));
    expect(result.current.isCollapsed('Norway')).toBe(false);
    act(() => result.current.toggle('Norway'));
    expect(result.current.isCollapsed('Norway')).toBe(true);
    act(() => result.current.toggle('Norway'));
    expect(result.current.isCollapsed('Norway')).toBe(false);
  });

  it('persists collapsed lanes to localStorage keyed by groupBy', () => {
    const { result } = renderHook(() => useCollapsedLanes('country'));
    act(() => result.current.toggle('Norway'));
    const raw = JSON.parse(localStorage.getItem('careerops:jobs:collapsed-lanes')!);
    expect(raw).toContain('country:Norway');
  });

  it('isolates keys per grouping dimension', () => {
    const { result } = renderHook(() => useCollapsedLanes('company'));
    act(() => result.current.toggle('Acme'));
    expect(result.current.isCollapsed('Acme')).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npm --prefix frontend run test -- useCollapsedLanes`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `frontend/src/features/jobs/useCollapsedLanes.ts`:

```ts
import { useState, useCallback } from 'react';
import type { GroupBy } from './JobsBoard';

const STORAGE_KEY = 'careerops:jobs:collapsed-lanes';

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((x): x is string => typeof x === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

export function useCollapsedLanes(groupBy: GroupBy) {
  const [collapsed, setCollapsed] = useState<Set<string>>(load);

  const isCollapsed = useCallback(
    (laneKey: string) => collapsed.has(`${groupBy}:${laneKey}`),
    [collapsed, groupBy],
  );

  const toggle = useCallback((laneKey: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      const k = `${groupBy}:${laneKey}`;
      if (next.has(k)) next.delete(k); else next.add(k);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* storage unavailable */ }
      return next;
    });
  }, [groupBy]);

  return { isCollapsed, toggle };
}
```

- [ ] **Step 4: Run, verify pass** — `npm --prefix frontend run test -- useCollapsedLanes`
  Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/useCollapsedLanes.ts frontend/src/features/jobs/useCollapsedLanes.test.ts
git commit -m "feat(jobs): add useCollapsedLanes persisted collapse hook"
```

---

## Task 5: Board building blocks (`BoardColumnHeader`, `BoardCell`, `BoardLane`)

**Files:**
- Create: `BoardColumnHeader.tsx` (+ test), `BoardCell.tsx` (+ test), `BoardLane.tsx` (+ test)
- Remove: `BoardColumn.tsx`, `BoardColumn.test.tsx`

**Interfaces:**
- Consumes: `Lane` (Task 3), `getStatusPresentation` (`jobPresentation`).
- Produces:
  - `BoardColumnHeader({ statuses: JobStatus[] })`
  - `BoardCell({ laneKey: string; status: JobStatus; jobs: JobDto[]; onJobClick: (id: number) => void; isDragActive?: boolean })` — droppable id `${laneKey}::${status}`
  - `BoardLane({ lane: Lane; statuses: JobStatus[]; showBanner: boolean; collapsed: boolean; onToggle: (laneKey: string) => void; onJobClick: (id: number) => void; isDragActive?: boolean })`
  - All grids use inline `gridTemplateColumns: repeat(${statuses.length}, var(--board-col))`.

- [ ] **Step 1: `BoardCell.tsx`**:

```tsx
import { useDroppable } from '@dnd-kit/core';
import type { JobDto, JobStatus } from '@/lib/api/model';
import { JobCard } from './JobCard';
import { cn } from '@/lib/utils';

interface Props {
  laneKey: string;
  status: JobStatus;
  jobs: JobDto[];
  onJobClick: (id: number) => void;
  isDragActive?: boolean;
}

export function BoardCell({ laneKey, status, jobs, onJobClick, isDragActive }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `${laneKey}::${status}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-24 flex-col gap-2 rounded-md bg-muted/20 p-2 transition-colors duration-150 motion-reduce:transition-none',
        isOver && 'bg-muted/50 ring-1 ring-ring/40',
      )}
    >
      {jobs.length === 0 && isDragActive && (
        <div className="rounded-md border-2 border-dashed border-ring/40 py-6 text-center text-xs text-muted-foreground">
          Drop here
        </div>
      )}
      {jobs.map(job => (
        <JobCard key={job.id as number} job={job} onClick={() => onJobClick(job.id as number)} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `BoardColumnHeader.tsx`**:

```tsx
import type { CSSProperties } from 'react';
import type { JobStatus } from '@/lib/api/model';
import { getStatusPresentation } from './jobPresentation';
import { cn } from '@/lib/utils';

interface Props {
  statuses: JobStatus[];
}

export function BoardColumnHeader({ statuses }: Props) {
  const style: CSSProperties = { gridTemplateColumns: `repeat(${statuses.length}, var(--board-col))` };
  return (
    <div
      className="sticky top-0 z-20 grid gap-3 bg-background/95 pb-2 backdrop-blur"
      style={style}
    >
      {statuses.map(status => {
        const { accentClassName } = getStatusPresentation(status);
        return (
          <div
            key={status}
            className={cn(
              'flex items-center justify-between rounded-md border-t-2 bg-muted/60 px-2.5 py-1.5',
              accentClassName,
            )}
          >
            <span className="text-sm font-medium">{status}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: `BoardLane.tsx`**:

```tsx
import type { CSSProperties } from 'react';
import { ChevronRight } from 'lucide-react';
import type { JobStatus } from '@/lib/api/model';
import { BoardCell } from './BoardCell';
import type { Lane } from './jobGrouping';
import { cn } from '@/lib/utils';

interface Props {
  lane: Lane;
  statuses: JobStatus[];
  showBanner: boolean;
  collapsed: boolean;
  onToggle: (laneKey: string) => void;
  onJobClick: (id: number) => void;
  isDragActive?: boolean;
}

export function BoardLane({ lane, statuses, showBanner, collapsed, onToggle, onJobClick, isDragActive }: Props) {
  const gridStyle: CSSProperties = { gridTemplateColumns: `repeat(${statuses.length}, var(--board-col))` };

  return (
    <section className="flex flex-col gap-1.5">
      {showBanner && (
        <button
          type="button"
          onClick={() => onToggle(lane.key)}
          aria-expanded={!collapsed}
          className="flex w-full items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight aria-hidden className={cn('size-4 transition-transform motion-reduce:transition-none', !collapsed && 'rotate-90')} />
          <span className="text-sm font-medium">{lane.label}</span>
          <span className="rounded-full bg-muted-foreground/10 px-1.5 text-[11px] tabular-nums text-muted-foreground">
            {lane.jobs.length}
          </span>
        </button>
      )}
      {!collapsed && (
        <div className="grid gap-3" style={gridStyle}>
          {statuses.map(status => (
            <BoardCell
              key={status}
              laneKey={lane.key}
              status={status}
              jobs={lane.jobs.filter(j => j.status === status)}
              onJobClick={onJobClick}
              isDragActive={isDragActive}
            />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Tests** — create the three test files:

`BoardCell.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { BoardCell } from './BoardCell';

describe('BoardCell', () => {
  it('shows the drop target only while dragging', () => {
    renderWithProviders(<BoardCell laneKey="__all__" status="Applied" jobs={[]} onJobClick={() => {}} isDragActive />);
    expect(screen.getByText(/Drop here/i)).toBeInTheDocument();
  });

  it('renders nothing extra when idle and empty', () => {
    renderWithProviders(<BoardCell laneKey="__all__" status="Applied" jobs={[]} onJobClick={() => {}} />);
    expect(screen.queryByText(/Drop here/i)).not.toBeInTheDocument();
  });
});
```

`BoardColumnHeader.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { BoardColumnHeader } from './BoardColumnHeader';

describe('BoardColumnHeader', () => {
  it('renders one header per status', () => {
    renderWithProviders(<BoardColumnHeader statuses={['Applied', 'Interviewing']} />);
    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('Interviewing')).toBeInTheDocument();
  });
});
```

`BoardLane.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { BoardLane } from './BoardLane';
import type { Lane } from './jobGrouping';

const lane: Lane = { key: 'Norway', label: 'Norway', jobs: [] };

describe('BoardLane', () => {
  it('renders a banner with the label and count and toggles', () => {
    const onToggle = vi.fn();
    renderWithProviders(
      <BoardLane lane={lane} statuses={['Applied']} showBanner collapsed={false} onToggle={onToggle} onJobClick={() => {}} />,
    );
    const banner = screen.getByRole('button', { name: /Norway/ });
    expect(banner).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(banner);
    expect(onToggle).toHaveBeenCalledWith('Norway');
  });

  it('hides the cell grid when collapsed', () => {
    renderWithProviders(
      <BoardLane lane={lane} statuses={['Applied']} showBanner collapsed onToggle={() => {}} onJobClick={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /Norway/ })).toHaveAttribute('aria-expanded', 'false');
  });
});
```

- [ ] **Step 5: Remove the old `BoardColumn`** — delete `BoardColumn.tsx` and `BoardColumn.test.tsx`:

```bash
git rm frontend/src/features/jobs/BoardColumn.tsx frontend/src/features/jobs/BoardColumn.test.tsx
```

- [ ] **Step 6: Run tests + typecheck** — `npm --prefix frontend run test -- Board && npm --prefix frontend run typecheck`
  Expected: new board tests pass; typecheck fails only inside `JobsBoard.tsx` (still imports `BoardColumn`) — that is fixed in Task 6. If you want a green gate here, proceed directly to Task 6 before committing; otherwise commit the new files now and let Task 6 restore typecheck.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/jobs/BoardCell.tsx frontend/src/features/jobs/BoardColumnHeader.tsx frontend/src/features/jobs/BoardLane.tsx frontend/src/features/jobs/BoardCell.test.tsx frontend/src/features/jobs/BoardColumnHeader.test.tsx frontend/src/features/jobs/BoardLane.test.tsx
git rm frontend/src/features/jobs/BoardColumn.tsx frontend/src/features/jobs/BoardColumn.test.tsx
git commit -m "feat(jobs): add BoardColumnHeader/BoardCell/BoardLane, remove BoardColumn"
```

---

## Task 6: Rewire `JobsBoard` to lanes + DnD in all groupings

**Files:**
- Modify: `frontend/src/features/jobs/JobsBoard.tsx`, `frontend/src/features/jobs/JobsBoard.test.tsx`

**Interfaces:**
- Consumes: `buildLanes`/`laneKeyOf`/`LANE_STATUS_KEY` (Task 3), `useCollapsedLanes` (Task 4), `BoardColumnHeader`/`BoardLane` (Task 5).

- [ ] **Step 1: Replace `JobsBoard.tsx`** with:

```tsx
import { useState, type CSSProperties } from 'react';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { BoardColumnHeader } from './BoardColumnHeader';
import { BoardLane } from './BoardLane';
import { JobCardPreview } from './JobCardPreview';
import { useJobMutations } from './useJobMutations';
import { useCollapsedLanes } from './useCollapsedLanes';
import { buildLanes, laneKeyOf, LANE_STATUS_KEY } from './jobGrouping';
import { getListJobsQueryKey } from '@/lib/api/jobs/jobs';
import type { JobDto, JobStatus, ListJobsParams } from '@/lib/api/model';

export type GroupBy = 'status' | 'country' | 'company' | 'priority';

const ACTIVE_STATUSES: JobStatus[] = ['Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered'];
const CLOSED_STATUSES: JobStatus[] = ['Rejected', 'Ghosted', 'Withdrawn', 'Archived'];
const ALL_STATUSES: JobStatus[] = [...ACTIVE_STATUSES, ...CLOSED_STATUSES];
const HIDDEN_STORAGE_KEY = 'careerops:jobs:hidden-status-columns';
const BOARD_COL_WIDTH = '18rem';

function loadHiddenStatuses(): JobStatus[] {
  try {
    const raw = localStorage.getItem(HIDDEN_STORAGE_KEY);
    if (raw === null) return [...CLOSED_STATUSES];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...CLOSED_STATUSES];
    return parsed.filter((s): s is JobStatus => ALL_STATUSES.includes(s as JobStatus));
  } catch {
    return [...CLOSED_STATUSES];
  }
}

interface Props {
  jobs: JobDto[];
  groupBy: GroupBy;
  listParams: ListJobsParams;
  onJobClick: (id: number) => void;
}

export function JobsBoard({ jobs, groupBy, listParams, onJobClick }: Props) {
  const [hiddenStatuses, setHiddenStatuses] = useState<JobStatus[]>(loadHiddenStatuses);
  const [activeJob, setActiveJob] = useState<JobDto | null>(null);
  const { isCollapsed, toggle } = useCollapsedLanes(groupBy);
  const qc = useQueryClient();
  const { transition } = useJobMutations();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const toggleStatusColumn = (status: JobStatus) => {
    setHiddenStatuses(prev => {
      const next = prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status];
      try { localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };

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

    const key = getListJobsQueryKey(listParams);
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
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Columns
                <ChevronDown aria-hidden className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ALL_STATUSES.map(s => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={!hiddenStatuses.includes(s)}
                  onCheckedChange={() => toggleStatusColumn(s)}
                  onSelect={e => e.preventDefault()}
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {visibleStatuses.length === 0 ? (
          <p className="m-auto text-sm text-muted-foreground">
            All status columns are hidden. Use the Columns menu to show some.
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

(Note: `LANE_STATUS_KEY` is imported for parity/readability via `laneKeyOf`; if lint flags it as unused, drop it from the import.)

- [ ] **Step 2: Update `JobsBoard.test.tsx`** — replace the file with:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { JobsBoard } from "./JobsBoard";
import type { JobDto } from "@/lib/api/model";

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
      <JobsBoard jobs={[job(1, "Applied")]} groupBy="status" listParams={{}} onJobClick={() => {}} />,
    );
    expect(screen.getAllByText("Applied").length).toBeGreaterThanOrEqual(2); // header + card chip
    expect(screen.getByText("Role 1")).toBeInTheDocument();
  });

  it("shows an empty board message when there are no jobs", () => {
    renderWithProviders(<JobsBoard jobs={[]} groupBy="status" listParams={{}} onJobClick={() => {}} />);
    expect(screen.getByText(/No jobs found/i)).toBeInTheDocument();
  });

  it("hides closed-status columns by default", () => {
    renderWithProviders(
      <JobsBoard jobs={[job(1, "Applied"), job(2, "Rejected")]} groupBy="status" listParams={{}} onJobClick={() => {}} />,
    );
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
    expect(screen.queryByText("Role 2")).not.toBeInTheDocument();
  });

  it("offers a Columns menu in every grouping", () => {
    renderWithProviders(
      <JobsBoard jobs={[job(1, "Applied")]} groupBy="country" listParams={{}} onJobClick={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /columns/i })).toBeInTheDocument();
  });

  it("renders a lane banner when grouped by country", () => {
    renderWithProviders(
      <JobsBoard jobs={[job(1, "Applied", { country: "Norway" })]} groupBy="country" listParams={{}} onJobClick={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /Norway/ })).toBeInTheDocument();
    expect(screen.getByText("Role 1")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests + typecheck + lint** — `npm --prefix frontend run test -- JobsBoard && npm --prefix frontend run typecheck && npm --prefix frontend run lint`
  Expected: green.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/jobs/JobsBoard.tsx frontend/src/features/jobs/JobsBoard.test.tsx
git commit -m "feat(jobs): swimlane board — status columns + lanes + DnD in all groupings"
```

---

## Task 7: Priority presentation + `JobPriorityDropdown`

**Files:**
- Modify: `frontend/src/features/jobs/jobPresentation.ts`, `frontend/src/features/jobs/jobPresentation.test.ts`
- Create: `frontend/src/features/jobs/JobPriorityDropdown.tsx`, `frontend/src/features/jobs/JobPriorityDropdown.test.tsx`

**Interfaces:**
- Consumes: `useJobMutations().setPriority` (Task 2).
- Produces: `getPriorityPresentation(priority) → { label: Priority; dotClassName: string; isHigh: boolean }`; `JobPriorityDropdown({ jobId, currentPriority, variant? })`.

- [ ] **Step 1: Update the presentation test** — replace the `getPriorityPresentation` block in `jobPresentation.test.ts`:

```ts
describe("getPriorityPresentation", () => {
  it("returns a label, a dot class, and a High flag", () => {
    const high = getPriorityPresentation("High");
    expect(high.label).toBe("High");
    expect(high.isHigh).toBe(true);
    expect(high.dotClassName.length).toBeGreaterThan(0);
    expect(getPriorityPresentation("Medium").isHigh).toBe(false);
    expect(getPriorityPresentation("Low").isHigh).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npm --prefix frontend run test -- jobPresentation`
  Expected: FAIL (`.show` / `.isHigh` mismatch).

- [ ] **Step 3: Update `getPriorityPresentation`** — replace the function in `jobPresentation.ts`:

```ts
const PRIORITY_DOT: Record<Priority, string> = {
  Low: "bg-muted-foreground/40",
  Medium: "bg-muted-foreground/70",
  High: "bg-destructive",
};

export function getPriorityPresentation(priority: Priority): { label: Priority; dotClassName: string; isHigh: boolean } {
  return { label: priority, dotClassName: PRIORITY_DOT[priority], isHigh: priority === "High" };
}
```

- [ ] **Step 4: Run, verify pass** — `npm --prefix frontend run test -- jobPresentation`
  Expected: PASS. (Callers `JobCard`/`JobCardPreview` now type-error on `.show` — fixed in Task 8; do not commit a broken typecheck — proceed through Task 8 or temporarily keep `.show`? No: continue to Step 5–7 which only add the new dropdown, then Task 8 fixes callers. Commit at Step 7 covers presentation + dropdown; the broken callers are fixed in Task 8's commit. If a green typecheck gate is required at each commit, fold Task 8 Step for JobCard/JobCardPreview into this commit.)

- [ ] **Step 5: Create `JobPriorityDropdown.tsx`**:

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobMutations } from './useJobMutations';
import { getPriorityPresentation } from './jobPresentation';
import { cn } from '@/lib/utils';
import type { Priority } from '@/lib/api/model';

const ALL_PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];

interface Props {
  jobId: number;
  currentPriority: Priority;
  variant?: 'default' | 'chip';
}

export function JobPriorityDropdown({ jobId, currentPriority, variant = 'default' }: Props) {
  const { setPriority } = useJobMutations();

  const handleChange = (value: string) => {
    const toPriority = value as Priority;
    if (toPriority === currentPriority) return;
    setPriority.mutate({ id: jobId, data: { toPriority } });
  };

  const current = getPriorityPresentation(currentPriority);

  return (
    <Select value={currentPriority} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className={cn(
          'text-xs transition-colors motion-reduce:transition-none',
          variant === 'chip'
            ? 'h-6 w-fit gap-1 border-transparent bg-transparent px-1.5 text-muted-foreground hover:bg-muted'
            : 'w-32',
        )}
      >
        {variant === 'chip' ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={cn('size-2 rounded-full', current.dotClassName)} />
            {current.label}
          </span>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent position="popper">
        {ALL_PRIORITIES.map(p => {
          const pp = getPriorityPresentation(p);
          return (
            <SelectItem key={p} value={p}>
              <span className="flex items-center gap-2">
                <span aria-hidden className={cn('size-2 rounded-full', pp.dotClassName)} />
                {p}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 6: Create `JobPriorityDropdown.test.tsx`**:

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { JobPriorityDropdown } from './JobPriorityDropdown';

describe('JobPriorityDropdown', () => {
  it('renders the current priority as a chip', () => {
    renderWithProviders(<JobPriorityDropdown jobId={1} currentPriority="High" variant="chip" />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run tests** — `npm --prefix frontend run test -- "jobPresentation|JobPriorityDropdown"`
  Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/jobs/jobPresentation.ts frontend/src/features/jobs/jobPresentation.test.ts frontend/src/features/jobs/JobPriorityDropdown.tsx frontend/src/features/jobs/JobPriorityDropdown.test.tsx
git commit -m "feat(jobs): editable priority dropdown + all-levels presentation"
```

---

## Task 8: Wire priority chip into card/preview/table/drawer + group-by-priority

**Files:**
- Modify: `JobCard.tsx` (+ `JobCard.test.tsx` if it asserts the old High label), `JobCardPreview.tsx`, `JobsTable.tsx`, `JobDetailDrawer.tsx`, `JobFilterBar.tsx`

**Interfaces:**
- Consumes: `JobPriorityDropdown` (Task 7), `getPriorityPresentation` (Task 7), `GroupBy` (already includes `'priority'` from Task 3).

- [ ] **Step 1: `JobCard.tsx`** — import the dropdown, switch `.show` → `.isHigh`, drop the top-right High label, add the priority chip beside the status chip.
  - Add import: `import { JobPriorityDropdown } from './JobPriorityDropdown';`
  - Line 32 `const showMeta` stays; line 31 `const priority = getPriorityPresentation(job.priority);` stays.
  - Accent bar (lines 76-78): change `priority.show` → `priority.isHigh`.
  - Remove the top-right priority span (lines 82-84): the `<div className="flex items-start justify-between gap-2">` keeps only the company `<p>`.
  - Replace the status-chip wrapper (lines 120-126) with a row holding both chips:

```tsx
        <div
          data-card-interactive
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1"
        >
          <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} variant="chip" />
          <JobPriorityDropdown jobId={job.id as number} currentPriority={job.priority} variant="chip" />
        </div>
```

- [ ] **Step 2: `JobCardPreview.tsx`** — switch `.show` → `.isHigh` and replace the top-right High label with a static priority indicator (preview is the non-interactive drag overlay).
  - Line 17 accent: `priority.show` → `priority.isHigh`.
  - Replace lines 21-24 block with company only:

```tsx
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{job.companyName}</p>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            <span aria-hidden className={cn('size-2 rounded-full', priority.dotClassName)} />
            {priority.label}
          </span>
        </div>
```

- [ ] **Step 3: `JobsTable.tsx`** — replace the read-only priority `Badge` cell with the editable dropdown.
  - Add import: `import { JobPriorityDropdown } from './JobPriorityDropdown';`
  - Replace the priority `<TableCell>` (lines 61-63):

```tsx
              <TableCell onClick={e => e.stopPropagation()}>
                <JobPriorityDropdown jobId={job.id as number} currentPriority={job.priority} />
              </TableCell>
```

  - Remove the now-unused `PRIORITY_VARIANT` const and the `Badge` import if no longer used elsewhere in the file (lint will flag).

- [ ] **Step 4: `JobDetailDrawer.tsx`** — show priority beside status in the header actions.
  - Add import: `import { JobPriorityDropdown } from './JobPriorityDropdown';`
  - In the header actions slot (the `<div className="shrink-0">` wrapping `JobStatusDropdown`, ~line 60), render both:

```tsx
                <div className="flex shrink-0 items-center gap-2">
                  <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} />
                  <JobPriorityDropdown jobId={job.id as number} currentPriority={job.priority} />
                </div>
```

- [ ] **Step 5: `JobFilterBar.tsx`** — add the priority grouping option:

```ts
const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'status',   label: 'By Status' },
  { value: 'country',  label: 'By Country' },
  { value: 'company',  label: 'By Company' },
  { value: 'priority', label: 'By Priority' },
];
```

- [ ] **Step 6: Update `JobCard.test.tsx` if needed** — if it asserts the old behaviour (e.g. only-High label), update those assertions to reflect a priority chip now always rendering the level (e.g. `expect(screen.getByText('Medium')).toBeInTheDocument()` for a Medium job). Keep all other assertions.

- [ ] **Step 7: Run the full frontend suite + typecheck + lint** — `npm --prefix frontend run typecheck && npm --prefix frontend run lint && npm --prefix frontend run test`
  Expected: green.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/jobs/JobCard.tsx frontend/src/features/jobs/JobCard.test.tsx frontend/src/features/jobs/JobCardPreview.tsx frontend/src/features/jobs/JobsTable.tsx frontend/src/features/jobs/JobDetailDrawer.tsx frontend/src/features/jobs/JobFilterBar.tsx
git commit -m "feat(jobs): show editable priority chip on card/table/drawer + group by priority"
```

---

## Task 9: Grouped table rows

**Files:**
- Modify: `frontend/src/features/jobs/JobsTable.tsx`, `frontend/src/features/jobs/JobsTable.test.tsx`, `frontend/src/pages/JobsPage.tsx`

**Interfaces:**
- Consumes: `buildLanes`/`useCollapsedLanes` (Tasks 3/4), `GroupBy`.

- [ ] **Step 1: Pass `groupBy` from the page** — in `JobsPage.tsx`, update the table render:

```tsx
          <JobsTable jobs={filtered} groupBy={filters.groupBy} onJobClick={setSelectedJobId} />
```

- [ ] **Step 2: Refactor `JobsTable`** to render grouped banner rows. The flat `<TableBody>` row markup moves into a `JobRow` row-fragment so it can be reused under each lane. Add the props + grouping:

  - Update `Props`: `interface Props { jobs: JobDto[]; groupBy: GroupBy; onJobClick: (id: number) => void; }`
  - Add imports: `import { Fragment } from 'react';`, `import { ChevronRight } from 'lucide-react';`, `import { buildLanes } from './jobGrouping';`, `import { useCollapsedLanes } from './useCollapsedLanes';`, `import type { GroupBy } from './JobsBoard';`
  - The component body:

```tsx
export function JobsTable({ jobs, groupBy, onJobClick }: Props) {
  const { isCollapsed, toggle } = useCollapsedLanes(groupBy);
  const lanes = buildLanes(jobs, groupBy);
  const grouped = groupBy !== 'status';
  const COLS = 9;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="text-right">Salary</TableHead>
          <TableHead>Applied</TableHead>
          <TableHead>Next action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lanes.map(lane => {
          const collapsed = grouped && isCollapsed(lane.key);
          return (
            <Fragment key={lane.key}>
              {grouped && (
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={COLS} className="py-1.5">
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
              {!collapsed && lane.jobs.map(job => <JobRow key={job.id as number} job={job} onJobClick={onJobClick} />)}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
```

  - Extract the existing per-job row markup (current lines 38-83) verbatim into a `JobRow` component in the same file:

```tsx
function JobRow({ job, onJobClick }: { job: JobDto; onJobClick: (id: number) => void }) {
  const isOverdue = Boolean(job.nextActionAtUtc && new Date(job.nextActionAtUtc) < new Date());
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onJobClick(job.id as number)}
    >
      <TableCell onClick={e => e.stopPropagation()}>
        <Link to={`/jobs/${job.id}`} target="_blank" rel="noopener noreferrer"
          className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline">
          JOB-{job.id}
        </Link>
      </TableCell>
      <TableCell className="font-medium">{job.companyName}</TableCell>
      <TableCell>{job.title}</TableCell>
      <TableCell onClick={e => e.stopPropagation()}>
        <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} />
      </TableCell>
      <TableCell onClick={e => e.stopPropagation()}>
        <JobPriorityDropdown jobId={job.id as number} currentPriority={job.priority} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {[job.city, job.country].filter(Boolean).join(', ')}
        {job.remoteMode !== 'OnSite' && ` · ${job.remoteMode}`}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums">
        {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) ?? '—'}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatDate(job.appliedAtUtc) ?? '—'}</TableCell>
      <TableCell
        data-overdue={isOverdue || undefined}
        className={cn('text-sm', isOverdue ? 'text-destructive' : 'text-muted-foreground')}
      >
        <span className="inline-flex items-center gap-1">
          {isOverdue && <TriangleAlert aria-hidden className="size-3.5 shrink-0" />}
          {formatDate(job.nextActionAtUtc) ?? '—'}
        </span>
      </TableCell>
    </TableRow>
  );
}
```

  (This `JobRow` already contains the Task 8 priority cell — if Task 8 and Task 9 are done in order, the priority cell lives here once.)

- [ ] **Step 3: Update `JobsTable.test.tsx`** — pass `groupBy="status"` to existing render calls; add a grouped test:

```tsx
  it('renders a banner row when grouped by country', () => {
    renderWithProviders(
      <JobsTable jobs={[/* two jobs, Norway + Germany */]} groupBy="country" onJobClick={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /Norway/ })).toBeInTheDocument();
  });
```

(Use the file's existing job factory; ensure each render passes the new required `groupBy` prop.)

- [ ] **Step 4: Run tests + typecheck + lint** — `npm --prefix frontend run test -- JobsTable && npm --prefix frontend run typecheck && npm --prefix frontend run lint`
  Expected: green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/JobsTable.tsx frontend/src/features/jobs/JobsTable.test.tsx frontend/src/pages/JobsPage.tsx
git commit -m "feat(jobs): grouped table rows with collapsible banner sections"
```

---

## Task 10: Delete a job (kebab + confirm dialog)

**Files:**
- Create: `frontend/src/components/ui/alert-dialog.tsx` (shadcn CLI), `frontend/src/features/jobs/DeleteJobDialog.tsx`, `frontend/src/features/jobs/JobActionsMenu.tsx`, `frontend/src/features/jobs/JobActionsMenu.test.tsx`
- Modify: `frontend/src/features/jobs/JobCard.tsx`, `frontend/src/features/jobs/JobsTable.tsx`, `frontend/src/features/jobs/JobDetailDrawer.tsx`

**Interfaces:**
- Consumes: `useJobMutations().remove` (existing).
- Produces: `DeleteJobDialog({ open, onOpenChange, jobId, jobLabel, onDeleted? })`; `JobActionsMenu({ jobId, jobLabel, onDeleted? })`.

- [ ] **Step 1: Scaffold the alert-dialog primitive**:

```bash
cd frontend && npx shadcn@latest add alert-dialog
```

Expected: `src/components/ui/alert-dialog.tsx` created. Verify it exports `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle`.

- [ ] **Step 2: Create `DeleteJobDialog.tsx`**:

```tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useJobMutations } from './useJobMutations';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  jobLabel: string;
  onDeleted?: () => void;
}

export function DeleteJobDialog({ open, onOpenChange, jobId, jobLabel, onDeleted }: Props) {
  const { remove } = useJobMutations();

  const confirm = () => {
    remove.mutate(
      { id: jobId },
      {
        onSuccess: () => {
          toast.success('Job deleted');
          onOpenChange(false);
          onDeleted?.();
        },
      },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {jobLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the job and its follow-up tasks. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            className={cn(buttonVariants({ variant: 'destructive' }))}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

(If `buttonVariants` is not exported from `button.tsx`, use `className="bg-destructive text-white hover:bg-destructive/90"` instead.)

- [ ] **Step 3: Create `JobActionsMenu.tsx`** (kebab for card/row):

```tsx
import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { DeleteJobDialog } from './DeleteJobDialog';

interface Props {
  jobId: number;
  jobLabel: string;
  onDeleted?: () => void;
}

export function JobActionsMenu({ jobId, jobLabel, onDeleted }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label="Job actions">
            <MoreVertical aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteJobDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        jobId={jobId}
        jobLabel={jobLabel}
        onDeleted={onDeleted}
      />
    </>
  );
}
```

(If `DropdownMenuItem` has no `variant` prop in this project's component, drop it and add `className="text-destructive focus:text-destructive"`.)

- [ ] **Step 4: Test `JobActionsMenu.test.tsx`**:

```tsx
import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { JobActionsMenu } from './JobActionsMenu';

describe('JobActionsMenu', () => {
  it('opens a confirm dialog naming the job', async () => {
    renderWithProviders(<JobActionsMenu jobId={12} jobLabel="JOB-12 — Acme Dev" />);
    fireEvent.click(screen.getByRole('button', { name: /job actions/i }));
    fireEvent.click(await screen.findByText('Delete'));
    expect(await screen.findByText(/Delete JOB-12 — Acme Dev\?/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Add the kebab to `JobCard.tsx`** — top-right of the company row (where the High label used to be), guarded as interactive:

```tsx
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{job.companyName}</p>
          <div
            data-card-interactive
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            className="-mr-1 -mt-1 shrink-0"
          >
            <JobActionsMenu jobId={job.id as number} jobLabel={`JOB-${job.id} — ${job.companyName}`} />
          </div>
        </div>
```

(Import `JobActionsMenu`.)

- [ ] **Step 6: Add an actions column to `JobsTable`** — a trailing header + a kebab cell in `JobRow`; bump `COLS` to `10`:
  - Add `<TableHead className="w-8" />` after the Next-action head.
  - In `JobRow`, append:

```tsx
      <TableCell onClick={e => e.stopPropagation()} className="w-8">
        <JobActionsMenu jobId={job.id as number} jobLabel={`JOB-${job.id} — ${job.companyName}`} />
      </TableCell>
```

  - Update the banner-row `colSpan` to `10`.

- [ ] **Step 7: Add delete to the drawer** — in `JobDetailDrawer.tsx`, add a delete control in the header actions and close the drawer on success:

```tsx
// state near the top of the rendered job branch:
const [confirmDelete, setConfirmDelete] = useState(false);
// in the header actions row, after the priority dropdown:
<Button variant="ghost" size="icon" aria-label="Delete job" onClick={() => setConfirmDelete(true)}>
  <Trash2 aria-hidden className="size-4" />
</Button>
// and render the dialog inside the branch:
{job && (
  <DeleteJobDialog
    open={confirmDelete}
    onOpenChange={setConfirmDelete}
    jobId={job.id as number}
    jobLabel={`JOB-${job.id} — ${job.companyName}`}
    onDeleted={onClose}
  />
)}
```

(Import `useState`, `Trash2` from lucide, `Button`, `DeleteJobDialog`. Place the dialog so it is mounted whenever `job` is defined.)

- [ ] **Step 8: Run the full suite + typecheck + lint + build** — `npm --prefix frontend run typecheck && npm --prefix frontend run lint && npm --prefix frontend run test && npm --prefix frontend run build`
  Expected: green.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/ui/alert-dialog.tsx frontend/src/features/jobs/DeleteJobDialog.tsx frontend/src/features/jobs/JobActionsMenu.tsx frontend/src/features/jobs/JobActionsMenu.test.tsx frontend/src/features/jobs/JobCard.tsx frontend/src/features/jobs/JobsTable.tsx frontend/src/features/jobs/JobDetailDrawer.tsx
git commit -m "feat(jobs): delete a job from card/row kebab and drawer with confirm"
```

---

## Task 11: Decisions log + final validation

**Files:**
- Modify: `docs/knowledge-base/03-decisions.md`

- [ ] **Step 1: Append decisions** — add a dated block (use the file's existing entry format; next sequential D-number):
  - Swimlane board: columns always status; country/company/priority grouping → horizontal lanes; `groupBy='status'` is a single unbannered lane (`__all__`).
  - Per-lane grids share one fixed column track (`--board-col`); status header row sticky-top, lane banners not sticky.
  - DnD changes status only, ignores cross-lane drops, enabled in all groupings.
  - Hidden-columns menu applies to all groupings; collapse store `careerops:jobs:collapsed-lanes` keyed `${groupBy}:${laneKey}`, shared board↔table.
  - Priority is editable inline via a dedicated `POST /jobs/{id}/priority` endpoint (full-PUT-from-card rejected to avoid data loss); priority shown as a chip on card/table/drawer; High keeps its destructive accent bar; priority colours use tokens.
  - Group-by-priority lanes ordered High → Medium → Low.
  - Hard delete from card/row kebab + drawer behind a confirm dialog; relies on the existing `FollowUpTask.Job` cascade (no orphans), distinct from the Archive status.

- [ ] **Step 2: Full validation**:

```bash
dotnet test backend/tests/CareerOps.UnitTests
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
```

Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add docs/knowledge-base/03-decisions.md
git commit -m "docs(decisions): log jobs board overhaul decisions"
```

---

## Self-Review Notes

- **Spec coverage:** swimlanes (T3,5,6), grouped table (T9), priority display+endpoint+grouping (T1,2,7,8), delete (T10) — all spec sections mapped.
- **Type consistency:** `Lane`, `buildLanes`, `laneKeyOf`, `LANE_STATUS_KEY` defined in T3 and consumed unchanged in T5/6/9; `getPriorityPresentation` shape changed in T7 and all callers updated in T7/8; `JobsTable` gains required `groupBy` prop in T9 with the page updated same task.
- **Ordering gate:** T1 → T2 (endpoint before client regen); T3/T4 before T5/T6/T9; T7 before T8; T7's caller breakage is closed in T8 (or fold JobCard/JobCardPreview edits into T7's commit if a green typecheck is required per commit).
- **No placeholders:** every code step carries full code; the only judgement calls are clearly flagged conditionals (buttonVariants/DropdownMenuItem variant availability, JobCard/JobsTable test assertions that depend on the existing files' current text).
