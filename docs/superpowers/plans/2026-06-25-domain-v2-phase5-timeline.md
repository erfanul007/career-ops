# Domain V2 — Phase 5: Timeline + Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add timeline read model (chronological job history feed), wire it into the drawer, polish empty/loading/error states, and run the final verify gate.

**Architecture:** Backend timeline service produces a sorted list of heterogeneous events. Frontend renders a vertical timeline in the drawer's dedicated tab. All types orval-generated.

**Tech Stack:** .NET 10, React 19, TypeScript 6, orval 8, shadcn/ui

## Global Constraints

- Timeline events are read-only — no mutations from this endpoint
- Phase ends with `just verify` (the final gate for the whole V2 redesign)
- Working directory: `E:\personal\projects\CareerOps`

---

## File Structure

### Create
- `frontend/src/features/jobs/drawer/TimelineTab.tsx`

### Modify
- `frontend/src/features/jobs/JobDetailContent.tsx` — add Timeline tab (also wires it into `JobDetailPage`)
- `frontend/src/features/jobs/JobsBoard.tsx` — empty state
- `frontend/src/features/jobs/BoardColumn.tsx` — loading skeleton
- `frontend/src/pages/JobsPage.tsx` — error state

> **Note:** Backend timeline service (`JobTimelineService.cs`, `JobTimelineDto.cs`), endpoint (`GET /api/jobs/{id}/timeline` in `JobEndpoints.cs`), and DI registration (`DependencyInjection.cs`) were all implemented in Phase 3 Task 22. The orval client was regenerated in Phase 3 Task 23. Task 39 verifies these are in place before building the frontend tab.

---

## Tasks

### Task 39: Verify timeline backend (from Phase 3)

The timeline backend (`JobTimelineService`, `JobTimelineDto`, `GET /api/jobs/{id}/timeline`) was implemented in Phase 3 Task 22. The orval client was regenerated in Phase 3 Task 23 and should include `useGetApiJobsIdTimeline`.

- [ ] **Step 1: Confirm hook exists**

**Prerequisite:** Phase 3 Task 23 (gen-client) must have completed. If `frontend/src/lib/api/jobs/jobs.ts` does not exist, complete Phase 3 Task 23 before continuing.

Open `frontend/src/lib/api/jobs/jobs.ts` and verify `useGetApiJobsIdTimeline` is exported.

If the hook is missing (timeline endpoint was added after gen-client ran):
```
just up        # ensure Docker DB is running
just api       # start API — wait for: Now listening on: http://localhost:8080
just gen-client
```

- [ ] **Step 2: Commit if regenerated**

```bash
git add frontend/src/lib/api/
git commit -m "chore(frontend): ensure timeline hook in orval client"
```

---

### Task 40: Frontend Timeline tab

**Files:**
- Create: `frontend/src/features/jobs/drawer/TimelineTab.tsx`
- Modify: `frontend/src/features/jobs/JobDetailContent.tsx`

- [ ] **Step 1: Create TimelineTab**

```tsx
// frontend/src/features/jobs/drawer/TimelineTab.tsx
import { useGetApiJobsIdTimeline } from '@/lib/api/jobs/jobs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
// TimelineEventKind may or may not be in orval-generated model depending on how orval treats plain enums.
// Import it if available; otherwise use the local fallback below.
import type { TimelineEventDto } from '@/lib/api/model';

// Fallback — remove if orval exports TimelineEventKind from @/lib/api/model
type TimelineEventKind = 'Transition' | 'Activity' | 'FollowUp';

const KIND_STYLES: Record<TimelineEventKind, { dot: string; label: string }> = {
  Transition: { dot: 'bg-indigo-500', label: 'Status' },
  Activity:   { dot: 'bg-violet-500', label: 'Activity' },
  FollowUp:   { dot: 'bg-amber-500',  label: 'Follow-up' },
};

interface Props { jobId: number }

export function TimelineTab({ jobId }: Props) {
  const { data: events, isLoading, isError } = useGetApiJobsIdTimeline(jobId);

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-3 w-3 rounded-full mt-1 shrink-0" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive py-4">Failed to load timeline.</p>;
  }

  if (!events?.length) {
    return <p className="text-sm text-muted-foreground py-4">No events yet.</p>;
  }

  return (
    <div className="relative py-2">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-4 pl-6">
        {(events as TimelineEventDto[]).map(event => {
          const style = KIND_STYLES[event.kind] ?? KIND_STYLES.Transition;
          return (
            <div key={`${event.kind}-${event.id}`} className="relative">
              {/* Dot */}
              <div className={cn('absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-background', style.dot)} />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{event.title}</span>
                  {event.actor && (
                    <span className="text-[10px] text-muted-foreground border rounded px-1">{event.actor}</span>
                  )}
                </div>
                {event.detail && (
                  <p className="text-xs text-muted-foreground">{event.detail}</p>
                )}
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  {new Date(event.timestampUtc).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire TimelineTab into JobDetailContent**

The tabs for drawer + full page live in `JobDetailContent.tsx` (Phase 4 Task 38). Add Timeline there so both experiences get it.

In `frontend/src/features/jobs/JobDetailContent.tsx`:

1. Add import:
```tsx
import { TimelineTab } from './drawer/TimelineTab';
```

2. Add trigger to TabsList (after Properties):
```tsx
<TabsTrigger value="timeline">Timeline</TabsTrigger>
```

3. Add TabsContent (after Properties content):
```tsx
<TabsContent value="timeline"><TimelineTab jobId={job.id} /></TabsContent>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/jobs/drawer/TimelineTab.tsx
git add frontend/src/features/jobs/JobDetailContent.tsx
git commit -m "feat(frontend): Timeline tab in job detail (drawer + detail page)"
```

---

### Task 41: Empty, loading, and error states

**Files:**
- Modify: `frontend/src/features/jobs/JobsBoard.tsx`
- Modify: `frontend/src/pages/JobsPage.tsx`

- [ ] **Step 1: Add empty state to BoardColumn**

In `BoardColumn.tsx`, add inside the droppable div when `jobs.length === 0`:

```tsx
{jobs.length === 0 && (
  <div className="rounded border-2 border-dashed border-muted-foreground/20 py-4 text-center text-xs text-muted-foreground">
    Drop here
  </div>
)}
```

- [ ] **Step 2: Add board-level empty state**

In `JobsBoard.tsx`, add an early-return guard before the `boardColumns` const so an empty job list shows a placeholder instead of an empty scrollable row. Replace the `return groupBy === 'status' ? ...` block with:

```tsx
// Add before the boardColumns const:
if (jobs.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
      <p className="text-sm">No jobs found.</p>
      <p className="text-xs">Add a job to get started.</p>
    </div>
  );
}

const boardColumns = (
  <div className="space-y-2">
    {groupBy === 'status' && (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setShowClosed(v => !v)} className="text-xs">
          {showClosed ? 'Hide closed' : 'Show closed'}
        </Button>
      </div>
    )}
    <div className="flex gap-3 overflow-x-auto pb-4">
      {visibleGroups.map(group => (
        <BoardColumn key={group.key} label={group.label} jobs={group.jobs} onJobClick={onJobClick} />
      ))}
    </div>
  </div>
);

return groupBy === 'status' ? (
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  >
    {boardColumns}
    <DragOverlay>
      {activeJob && <JobCard job={activeJob} onClick={() => {}} isDragging />}
    </DragOverlay>
  </DndContext>
) : boardColumns;
```

- [ ] **Step 3: Add error state to JobsPage**

> **Note:** If Task 35's error/loading handling is already in `JobsPage.tsx`, verify the `isError` branch exists and skip this step — it's a no-op.

In `JobsPage.tsx`, destructure `isError` from `useGetApiJobs`:

```tsx
const { data: jobs = [], isLoading, isError } = useGetApiJobs(...);

// Inside the board TabsContent:
{isError ? (
  <div className="py-8 text-center text-sm text-destructive">Failed to load jobs. Check your connection.</div>
) : isLoading ? (
  <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
) : (
  <JobsBoard jobs={filtered} onJobClick={setSelectedJobId} />
)}
```

- [ ] **Step 4: Add loading skeleton to board**

Optionally in `JobsBoard.tsx` when `isLoading` prop passed: render `BoardColumn` placeholders with `Skeleton` cards. This is visual polish only — acceptable to skip for MVP.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/ frontend/src/pages/JobsPage.tsx
git commit -m "feat(frontend): empty and error states for board and jobs page"
```

---

### Task 42: Final quality gate

- [ ] **Step 1: Run full verify**

```
just verify
```

Expected output:
```
Build succeeded.
Passed!  [all tests]
vite v5.x.x building for production...
✓ built in N.Nms
```

- [ ] **Step 2: Fix any remaining issues**

Common final issues:
- Orval-generated hook names may not exactly match what's written in components — open `frontend/src/lib/api/jobs/jobs.ts` and verify each hook name used in `FollowUpsTab.tsx`, `PropertiesTab.tsx`, `AttachmentsTab.tsx`
- `FollowUpStatus` enum values in frontend — verify exact strings match backend (`Pending`, `Completed`, `Skipped`)
- `TimelineEventKind` enum — verify it's exported from orval model; if not, define locally in `TimelineTab.tsx`

- [ ] **Step 3: Run backend tests only to confirm clean**

```
dotnet test backend/CareerOps.slnx --verbosity normal
```

Expected: all unit + integration tests pass.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore(phase5): Domain V2 complete — timeline, empty states, final verify passing"
```

---

## Self-Review Checklist

This checklist was run against the spec after writing the plan:

**Spec coverage:**
- [x] Job aggregate (Phase 2, Tasks 2–3)
- [x] JobTransition append-only (Phase 2, Task 9 — same-status no-op test)
- [x] JobProperty unique index (Phase 2, Task 5)
- [x] EF cascade rules (Phase 2, Task 5 — CASCADE vs SET NULL)
- [x] TransitionActor System=2 (Phase 2, Task 2 — enum pinned)
- [x] FollowUpTask FK invariant: activity requires job (Phase 2, Tasks 3 and 5)
- [x] 23 MCP tools (Phase 3, Tasks 19–20 — 13 in JobTools + 4 FollowUp + 2 Company + 1 Dashboard + 2 Profile + 1 Diagnostics = 23 ✓)
- [x] API ~28–30 endpoints (Phase 3, Tasks 16–17)
- [x] `just gen-client` after Phase 3 (Phase 3, Task 23)
- [x] Status dropdown before DnD (Phase 4, Task 26 before Task 36)
- [x] Optimistic update + rollback (Phase 4, Task 36)
- [x] Same-column DnD = no-op (Phase 4, Task 36)
- [x] Closed columns toggle (Phase 4, Task 28)
- [x] Properties collapsed / "Agent Notes" label (Phase 4, Task 34)
- [x] No file upload (Phase 4, Task 34 — metadata only)
- [x] Timeline endpoint (Phase 3, Task 22 — backend; Phase 5, Task 39 verifies client; Phase 5, Task 40 wires tab into `JobDetailContent`)
- [x] DB wipe + V1 migrations deleted (Phase 2, Task 1)
- [x] Delete V1 tests (Phase 2, Task 1 + Phase 3, Task 15)

**MCP tool count verification:**
- JobTools: `list_jobs`, `get_job`, `create_job`, `update_job`, `transition_job`, `archive_job`, `add_job_activity`, `update_job_activity`, `complete_job_activity`, `upsert_job_attachment`, `remove_job_attachment`, `upsert_job_property`, `remove_job_property` = **13**
- FollowUpTools: `list_follow_ups`, `add_follow_up`, `complete_follow_up`, `skip_follow_up` = **4**
- CompanyTools: `list_companies`, `upsert_company` = **2**
- DashboardTools: `get_dashboard_summary` = **1**
- ProfileTools: `get_user_profile`, `update_user_profile` = **2**
- DiagnosticsTools: `ping` = **1**
- **Total: 13 + 4 + 2 + 1 + 2 + 1 = 23** ✓
