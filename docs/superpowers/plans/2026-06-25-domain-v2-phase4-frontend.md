# Domain V2 — Phase 4: Frontend Clean Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace V1 JobLeads + Applications + Interviews pages with a unified Jira-style Jobs workspace: Kanban board with status-dropdown + DnD transitions, sortable table view, Job detail side drawer with full activity/follow-up/attachment/property management.

**Architecture:** Feature-based file organization. All types from orval-generated client (`src/lib/api/`). Tanstack Query for server state. Optimistic updates with rollback. Status dropdown first, then DnD.

**Tech Stack:** React 19, TypeScript 6, Vite 8, shadcn/ui (radix-ui 1.6), @tanstack/react-query 5, @dnd-kit/core 6 + @dnd-kit/sortable, react-hook-form 7, zod 4, orval 8

## Global Constraints

- **Prerequisite:** Phase 3 Task 23 (`just gen-client`) must have completed successfully and `frontend/src/lib/api/jobs/jobs.ts` must exist before any Phase 4 task begins. If it doesn't exist, complete Phase 3 Task 23 first.
- All TypeScript types come from `src/lib/api/` (orval-generated) — do not hand-author API types
- `@dnd-kit/core` already installed; `@dnd-kit/sortable` is NOT used — DnD uses `useDraggable` on cards + `useDroppable` on columns
- Status dropdown transitions come BEFORE DnD implementation
- Optimistic updates: move card immediately, rollback on API error + toast
- Same-column DnD drop = no-op (no API call)
- Phase ends with `just verify` (typecheck + build must pass)
- Working directory: `E:\personal\projects\CareerOps`

---

## File Structure

### Delete (V1 pages and features)
- `frontend/src/pages/JobLeadsPage.tsx`
- `frontend/src/pages/ApplicationsPage.tsx`
- `frontend/src/pages/InterviewsPage.tsx`
- `frontend/src/pages/ResumeVariantsPage.tsx`
- `frontend/src/features/jobLeads/` — entire directory
- `frontend/src/features/applications/` — entire directory
- `frontend/src/features/interviews/` — entire directory
- `frontend/src/features/resumeVariants/` — entire directory
- `frontend/src/lib/api/job-leads/` — entire directory (replaced by orval)
- `frontend/src/lib/api/applications/` — entire directory (replaced by orval)
- `frontend/src/lib/api/interviews/` — entire directory (replaced by orval)
- `frontend/src/lib/api/resume-variants/` — entire directory (replaced by orval)

### Create (V2)
- `frontend/src/pages/JobsPage.tsx`
- `frontend/src/pages/JobDetailPage.tsx`
- `frontend/src/features/jobs/JobDetailContent.tsx`
- `frontend/src/features/jobs/useJobMutations.ts`
- `frontend/src/features/jobs/JobsBoard.tsx`
- `frontend/src/features/jobs/BoardColumn.tsx`
- `frontend/src/features/jobs/JobCard.tsx`
- `frontend/src/features/jobs/JobStatusDropdown.tsx`
- `frontend/src/features/jobs/JobsTable.tsx`
- `frontend/src/features/jobs/JobQuickAdd.tsx`
- `frontend/src/features/jobs/JobFilterBar.tsx`
- `frontend/src/features/jobs/JobDetailDrawer.tsx`
- `frontend/src/features/jobs/drawer/OverviewTab.tsx`
- `frontend/src/features/jobs/drawer/ActivitiesTab.tsx`
- `frontend/src/features/jobs/drawer/FollowUpsTab.tsx`
- `frontend/src/features/jobs/drawer/AttachmentsTab.tsx`
- `frontend/src/features/jobs/drawer/PropertiesTab.tsx`
- `frontend/src/features/jobs/drawer/ActivityForm.tsx`
- `frontend/src/features/jobs/drawer/FollowUpForm.tsx`
- `frontend/src/features/jobs/drawer/AttachmentForm.tsx`

### Modify
- `frontend/src/app/router.tsx` — add `/jobs`, remove old routes
- `frontend/src/components/AppLayout.tsx` — update nav items
- `frontend/src/pages/DashboardPage.tsx` — rebuild on V2 dashboard summary
- `frontend/src/pages/TasksPage.tsx` — update to use V2 follow-up API

---

## Tasks

### Task 23: Install @dnd-kit/sortable and delete V1 files

- [ ] **Step 1: Install @dnd-kit/sortable and @hookform/resolvers**

```
cd frontend && npm install @dnd-kit/sortable @hookform/resolvers
```

Expected: both packages added to `node_modules` and `package.json`.

- [ ] **Step 2: Update Field component to support error display**

In `frontend/src/components/form/Field.tsx`, add optional `error` prop:

```tsx
// frontend/src/components/form/Field.tsx
import { ReactNode } from 'react';

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Delete V1 pages**

```powershell
Remove-Item frontend/src/pages/JobLeadsPage.tsx
Remove-Item frontend/src/pages/ApplicationsPage.tsx
Remove-Item frontend/src/pages/InterviewsPage.tsx
Remove-Item frontend/src/pages/ResumeVariantsPage.tsx
```

- [ ] **Step 4: Delete V1 feature directories**

```powershell
Remove-Item -Recurse -Force frontend/src/features/jobLeads
Remove-Item -Recurse -Force frontend/src/features/applications
Remove-Item -Recurse -Force frontend/src/features/interviews
Remove-Item -Recurse -Force frontend/src/features/resumeVariants
```

- [ ] **Step 5: Delete V1 generated API directories**

```powershell
Remove-Item -Recurse -Force frontend/src/lib/api/job-leads
Remove-Item -Recurse -Force frontend/src/lib/api/applications
Remove-Item -Recurse -Force frontend/src/lib/api/interviews
Remove-Item -Recurse -Force frontend/src/lib/api/resume-variants
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(frontend): delete V1 pages, features, and API dirs; install @dnd-kit/sortable, @hookform/resolvers; update Field with error prop"
```

---

### Task 24: Update router and navigation

**Files:**
- Modify: `frontend/src/app/router.tsx`
- Modify: `frontend/src/components/AppLayout.tsx`

- [ ] **Step 1: Update router.tsx**

Replace the file with V2 routes (remove job-leads/applications/interviews/resume-variants, add /jobs):

```tsx
// frontend/src/app/router.tsx
import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import JobsPage from '@/pages/JobsPage';
import JobDetailPage from '@/pages/JobDetailPage';
import CompaniesPage from '@/pages/CompaniesPage';
import TasksPage from '@/pages/TasksPage';
import SettingsProfilePage from '@/pages/SettingsProfilePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'jobs', element: <JobsPage /> },
      { path: 'jobs/:id', element: <JobDetailPage /> },  // no nav item; opened via JOB-{id} link
      { path: 'companies', element: <CompaniesPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'settings/profile', element: <SettingsProfilePage /> },
    ],
  },
]);
```

- [ ] **Step 2: Update AppLayout.tsx nav array**

Find the nav array and replace with:

```tsx
const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/settings/profile', label: 'Settings', icon: Settings },
];
```

Update the icon imports — add `Briefcase` from `lucide-react`, remove `FileText`, `Send`, `CalendarDays`, `FileStack`.

- [ ] **Step 3: Run typecheck**

```
cd frontend && npm run typecheck
```

Expected: errors about missing `JobsPage` import — that's fine, create a placeholder next.

- [ ] **Step 4: Create placeholder JobsPage**

```tsx
// frontend/src/pages/JobsPage.tsx
export default function JobsPage() {
  return <div>Jobs</div>;
}
```

- [ ] **Step 4b: Create placeholder JobDetailPage**

The router imports `JobDetailPage` (line `{ path: 'jobs/:id', element: <JobDetailPage /> }`). Create a placeholder so the router compiles — this file is fully implemented in Task 38.

```tsx
// frontend/src/pages/JobDetailPage.tsx
export default function JobDetailPage() {
  return <div>Job Detail</div>;
}
```

- [ ] **Step 5: Run typecheck again**

```
cd frontend && npm run typecheck
```

Expected: fewer errors. Remaining errors are from DashboardPage/TasksPage using old types — fix in later tasks.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/router.tsx frontend/src/components/AppLayout.tsx frontend/src/pages/JobsPage.tsx
git commit -m "feat(frontend): update router and nav to V2 Jobs workspace"
```

---

### Task 25: Job mutations hook

**Files:**
- Create: `frontend/src/features/jobs/useJobMutations.ts`

**Interfaces:**
- Consumes: orval-generated hooks from `src/lib/api/jobs/` (e.g. `usePostApiJobs`, `usePutApiJobsId`, `useDeleteApiJobsId`, `usePostApiJobsIdTransition`)
- Produces: `useJobMutations()` — `createJob`, `updateJob`, `deleteJob`, `transitionJob` with optimistic updates

Note: Check the exact hook names in `frontend/src/lib/api/jobs/jobs.ts` after orval generation. Orval generates hooks like `useGetApiJobs`, `usePostApiJobs`, etc.

- [ ] **Step 1: Create useJobMutations**

```tsx
// frontend/src/features/jobs/useJobMutations.ts
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  usePostApiJobs,
  usePutApiJobsId,
  useDeleteApiJobsId,
  usePostApiJobsIdTransition,
  getGetApiJobsQueryKey,
  getGetApiJobsIdQueryKey,
} from '@/lib/api/jobs/jobs';
import type { CreateJobRequest, UpdateJobRequest, TransitionJobRequest } from '@/lib/api/model';

export function useJobMutations() {
  const qc = useQueryClient();

  const invalidateJobs = () => {
    qc.invalidateQueries({ queryKey: getGetApiJobsQueryKey() });
  };

  const create = usePostApiJobs({
    mutation: {
      onSuccess: invalidateJobs,
      onError: () => toast.error('Failed to create job'),
    },
  });

  const update = usePutApiJobsId({
    mutation: {
      onSuccess: (_, vars) => {
        invalidateJobs();
        qc.invalidateQueries({ queryKey: getGetApiJobsIdQueryKey(vars.id) });
      },
      onError: () => toast.error('Failed to update job'),
    },
  });

  const remove = useDeleteApiJobsId({
    mutation: {
      onSuccess: invalidateJobs,
      onError: () => toast.error('Failed to delete job'),
    },
  });

  const transition = usePostApiJobsIdTransition({
    mutation: {
      onSuccess: (data, vars) => {
        invalidateJobs();
        qc.invalidateQueries({ queryKey: getGetApiJobsIdQueryKey(vars.id) });
        // orval serializes C# `Suggestion` → camelCase `suggestion`; verify in generated type if needed
        if (data.suggestion) {
          toast.info(data.suggestion);
        }
      },
      onError: (_, vars, context: any) => {
        // Rollback optimistic update if caller stored context
        if (context?.previousJobs) {
          qc.setQueryData(getGetApiJobsQueryKey(), context.previousJobs);
        }
        toast.error('Failed to transition job');
      },
    },
  });

  return { create, update, remove, transition };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/jobs/useJobMutations.ts
git commit -m "feat(frontend): useJobMutations hook with optimistic update support"
```

---

### Task 26: JobStatusDropdown

**Files:**
- Create: `frontend/src/features/jobs/JobStatusDropdown.tsx`

**Interfaces:**
- Consumes: `JobStatus` enum from `src/lib/api/model`, `useJobMutations`
- Produces: `<JobStatusDropdown jobId={number} currentStatus={JobStatus} />` — dropdown that calls transition on select

- [ ] **Step 1: Create JobStatusDropdown**

```tsx
// frontend/src/features/jobs/JobStatusDropdown.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobMutations } from './useJobMutations';
import type { JobStatus } from '@/lib/api/model';

const ALL_STATUSES: JobStatus[] = [
  'Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered',
  'Rejected', 'Ghosted', 'Withdrawn', 'Archived',
];

const STATUS_COLORS: Record<JobStatus, string> = {
  Discovered: 'text-slate-500',
  Interested: 'text-blue-500',
  Applied: 'text-indigo-500',
  Interviewing: 'text-violet-500',
  Offered: 'text-green-600',
  Rejected: 'text-red-500',
  Ghosted: 'text-orange-400',
  Withdrawn: 'text-yellow-600',
  Archived: 'text-gray-400',
};

interface Props {
  jobId: number;
  currentStatus: JobStatus;
}

export function JobStatusDropdown({ jobId, currentStatus }: Props) {
  const { transition } = useJobMutations();

  const handleChange = (value: string) => {
    const toStatus = value as JobStatus;
    if (toStatus === currentStatus) return;
    transition.mutate({ id: jobId, data: { toStatus } });
  };

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger className="w-36 h-7 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_STATUSES.map(s => (
          <SelectItem key={s} value={s}>
            <span className={STATUS_COLORS[s]}>{s}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/jobs/JobStatusDropdown.tsx
git commit -m "feat(frontend): JobStatusDropdown — inline status transition"
```

---

### Task 27: JobCard

**Files:**
- Create: `frontend/src/features/jobs/JobCard.tsx`

**Interfaces:**
- Consumes: `JobDto` from `src/lib/api/model`, `JobStatusDropdown`
- Produces: `<JobCard job={JobDto} onClick={() => void} />` — board card with JOB-{id} link (opens `/jobs/:id` in new tab), company+title, priority, remote mode, salary, next action date

- [ ] **Step 1: Create JobCard**

```tsx
// frontend/src/features/jobs/JobCard.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { JobStatusDropdown } from './JobStatusDropdown';
import type { JobDto } from '@/lib/api/model';
import { cn } from '@/lib/utils';

const PRIORITY_COLOR = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-red-100 text-red-700',
} as const;

interface Props {
  job: JobDto;
  onClick: () => void;
  isDragging?: boolean;
}

export function JobCard({ job, onClick, isDragging }: Props) {
  const isOverdue = job.nextActionAtUtc && new Date(job.nextActionAtUtc) < new Date();

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow select-none',
        isDragging && 'opacity-50 shadow-xl rotate-1',
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-1.5">
        {/* Header: ID link (new tab) + priority badge */}
        <div className="flex items-center justify-between">
          <Link
            to={`/jobs/${job.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground hover:underline"
          >
            JOB-{job.id}
          </Link>
          <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', PRIORITY_COLOR[job.priority])}>
            {job.priority}
          </Badge>
        </div>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{job.companyName}</p>
            <p className="font-medium text-sm leading-tight truncate">{job.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {job.country && <span>{job.country}</span>}
          {job.country && job.remoteMode !== 'OnSite' && <span>·</span>}
          {job.remoteMode !== 'OnSite' && <span>{job.remoteMode}</span>}
        </div>

        {job.salaryMin && (
          <p className="text-[11px] text-muted-foreground">
            {job.salaryCurrency ?? ''} {job.salaryMin.toLocaleString()}
            {job.salaryMax ? `–${job.salaryMax.toLocaleString()}` : '+'}
          </p>
        )}

        {job.nextActionAtUtc && (
          <p className={cn('text-[11px]', isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
            Next: {new Date(job.nextActionAtUtc).toLocaleDateString()}
            {isOverdue && ' ⚠'}
          </p>
        )}

        <div onClick={e => e.stopPropagation()}>
          <JobStatusDropdown jobId={job.id} currentStatus={job.status} />
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/jobs/JobCard.tsx
git commit -m "feat(frontend): JobCard with priority, location, salary, next-action display"
```

---

### Task 28: BoardColumn + JobsBoard (status dropdown only)

**Files:**
- Create: `frontend/src/features/jobs/BoardColumn.tsx`
- Create: `frontend/src/features/jobs/JobsBoard.tsx`

**Interfaces:**
- Consumes: `JobDto[]` from `useGetApiJobs`, `JobCard`, `JobStatusDropdown`
- Produces: `<JobsBoard jobs={JobDto[]} onJobClick={(id) => void} />` — Kanban with 5 active columns + toggle for closed

- [ ] **Step 1: Create BoardColumn**

```tsx
// frontend/src/features/jobs/BoardColumn.tsx
import type { JobDto, JobStatus } from '@/lib/api/model';
import { JobCard } from './JobCard';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

const COLUMN_COLORS: Partial<Record<JobStatus, string>> = {
  Discovered: 'border-slate-300',
  Interested: 'border-blue-300',
  Applied: 'border-indigo-300',
  Interviewing: 'border-violet-300',
  Offered: 'border-green-400',
  Rejected: 'border-red-300',
  Ghosted: 'border-orange-300',
  Withdrawn: 'border-yellow-300',
  Archived: 'border-gray-300',
};

interface Props {
  label: string;       // status name, country, or company — whatever groupBy is active
  jobs: JobDto[];
  onJobClick: (id: number) => void;
}

export function BoardColumn({ label, jobs, onJobClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: label });

  return (
    <div className="flex flex-col w-64 shrink-0">
      <div className={cn('rounded-t-md border-t-2 px-2 py-1.5 bg-muted/50', COLUMN_COLORS[label as JobStatus] ?? 'border-slate-300')}>
        <span className="font-medium text-sm">{label}</span>
        <span className="ml-2 text-xs text-muted-foreground">{jobs.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-b-md p-2 space-y-2 min-h-24 bg-muted/20 transition-colors',
          isOver && 'bg-muted/50',
        )}
      >
        {jobs.length === 0 && (
          <div className="rounded border-2 border-dashed border-muted-foreground/20 py-4 text-center text-xs text-muted-foreground">
            Drop here
          </div>
        )}
        {jobs.map(job => (
          <JobCard key={job.id} job={job} onClick={() => onJobClick(job.id)} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create JobsBoard**

```tsx
// frontend/src/features/jobs/JobsBoard.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BoardColumn } from './BoardColumn';
import type { JobDto, JobStatus } from '@/lib/api/model';

// GroupBy is defined here (not in JobFilterBar) so Task 28 compiles before Task 29 creates JobFilterBar.
// JobFilterBar imports it from here.
export type GroupBy = 'status' | 'country' | 'company';

const ACTIVE_STATUSES: JobStatus[] = ['Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered'];
const CLOSED_STATUSES: JobStatus[] = ['Rejected', 'Ghosted', 'Withdrawn', 'Archived'];

interface Props {
  jobs: JobDto[];
  groupBy: GroupBy;
  onJobClick: (id: number) => void;
}

function groupJobs(jobs: JobDto[], groupBy: GroupBy): { key: string; label: string; jobs: JobDto[] }[] {
  if (groupBy === 'country') {
    const keys = [...new Set(jobs.map(j => j.country ?? 'Unknown'))].sort();
    return keys.map(k => ({ key: k, label: k, jobs: jobs.filter(j => (j.country ?? 'Unknown') === k) }));
  }
  if (groupBy === 'company') {
    const keys = [...new Set(jobs.map(j => j.companyName))].sort();
    return keys.map(k => ({ key: k, label: k, jobs: jobs.filter(j => j.companyName === k) }));
  }
  // default: status
  return [...ACTIVE_STATUSES, ...CLOSED_STATUSES].map(s => ({
    key: s, label: s, jobs: jobs.filter(j => j.status === s),
  }));
}

export function JobsBoard({ jobs, groupBy, onJobClick }: Props) {
  const [showClosed, setShowClosed] = useState(false);

  const allGroups = groupJobs(jobs, groupBy);

  // For status grouping, hide closed unless toggled; for other groupings always show all
  const visibleGroups = groupBy === 'status' && !showClosed
    ? allGroups.filter(g => ACTIVE_STATUSES.includes(g.key as JobStatus))
    : allGroups;

  return (
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
          <BoardColumn
            key={group.key}
            label={group.label}
            jobs={group.jobs}
            onJobClick={onJobClick}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/jobs/BoardColumn.tsx frontend/src/features/jobs/JobsBoard.tsx
git commit -m "feat(frontend): BoardColumn and JobsBoard with status columns and closed toggle"
```

---

### Task 29: JobFilterBar + JobQuickAdd

**Files:**
- Create: `frontend/src/features/jobs/JobFilterBar.tsx`
- Create: `frontend/src/features/jobs/JobQuickAdd.tsx`

- [ ] **Step 1: Create JobFilterBar**

```tsx
// frontend/src/features/jobs/JobFilterBar.tsx
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { JobStatus } from '@/lib/api/model';
import type { GroupBy } from './JobsBoard';

// GroupBy is defined in JobsBoard.tsx and re-exported here for consumers of JobFilterBar.
export type { GroupBy };

export interface JobFilters {
  search: string;
  status?: JobStatus;     // undefined = all statuses
  countries: string[];    // ISO or free-text country strings; empty = all
  companySearch: string;
  groupBy: GroupBy;
}

export const DEFAULT_FILTERS: JobFilters = {
  search: '',
  status: undefined,
  countries: [],
  companySearch: '',
  groupBy: 'status',
};

interface Props {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
}

const STATUSES: JobStatus[] = [
  'Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered',
  'Rejected', 'Ghosted', 'Withdrawn', 'Archived',
];

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'status',  label: 'By Status' },
  { value: 'country', label: 'By Country' },
  { value: 'company', label: 'By Company' },
];

export function JobFilterBar({ filters, onChange }: Props) {
  const [countryInput, setCountryInput] = useState('');

  const addCountry = (raw: string) => {
    const c = raw.trim();
    if (!c || filters.countries.includes(c)) { setCountryInput(''); return; }
    onChange({ ...filters, countries: [...filters.countries, c] });
    setCountryInput('');
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Full-text search */}
      <Input
        placeholder="Search jobs..."
        value={filters.search}
        onChange={e => onChange({ ...filters, search: e.target.value })}
        className="h-8 w-52"
      />

      {/* Status filter */}
      <Select
        value={filters.status ?? ''}
        onValueChange={value => onChange({ ...filters, status: value ? value as JobStatus : undefined })}
      >
        <SelectTrigger className="h-8 w-36">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All statuses</SelectItem>
          {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Country chips */}
      <div className="flex items-center gap-1 flex-wrap">
        {filters.countries.map(c => (
          <Badge key={c} variant="secondary" className="h-7 gap-1 pr-1">
            {c}
            <Button
              variant="ghost" size="icon" className="h-4 w-4 p-0"
              onClick={() => onChange({ ...filters, countries: filters.countries.filter(x => x !== c) })}
            >
              <X className="h-2.5 w-2.5" />
            </Button>
          </Badge>
        ))}
        <Input
          placeholder="Add country…"
          value={countryInput}
          onChange={e => setCountryInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCountry(countryInput); } }}
          onBlur={() => addCountry(countryInput)}
          className="h-8 w-32"
        />
      </div>

      {/* Company search */}
      <Input
        placeholder="Company…"
        value={filters.companySearch}
        onChange={e => onChange({ ...filters, companySearch: e.target.value })}
        className="h-8 w-36"
      />

      {/* Group by */}
      <Select
        value={filters.groupBy}
        onValueChange={value => onChange({ ...filters, groupBy: value as GroupBy })}
      >
        <SelectTrigger className="h-8 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GROUP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: Create JobQuickAdd**

```tsx
// frontend/src/features/jobs/JobQuickAdd.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/form/Field';
import { useJobMutations } from './useJobMutations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { JobSource } from '@/lib/api/model';

const schema = z.object({
  companyName: z.string().min(1, 'Company required'),
  title: z.string().min(1, 'Title required').max(300),
  source: z.string().min(1) as z.ZodType<JobSource>,
  sourceUrl: z.string().url().optional().or(z.literal('')),
  priority: z.enum(['Low', 'Medium', 'High']),
});

type FormValues = z.infer<typeof schema>;

const SOURCES: JobSource[] = [
  'LinkedIn', 'Indeed', 'Glassdoor', 'Wellfound', 'Otta',
  'StepStone', 'Bdjobs', 'Monster',
  'CompanySite', 'Recruiter', 'Referral', 'Other',
];

export function JobQuickAdd() {
  const [open, setOpen] = useState(false);
  const { create } = useJobMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'Medium', source: 'LinkedIn' },
  });

  const onSubmit = async (values: FormValues) => {
    await create.mutateAsync({
      data: {
        companyName: values.companyName,
        title: values.title,
        status: 'Discovered',
        priority: values.priority,
        source: values.source,
        sourceUrl: values.sourceUrl || undefined,
        remoteMode: 'OnSite',
        employmentType: 'FullTime',
        salaryPeriod: 'Annual',
      },
    });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Add job</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add job</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <Field label="Company" error={form.formState.errors.companyName?.message}>
            <Input {...form.register('companyName')} placeholder="e.g. Acme Corp" />
          </Field>
          <Field label="Title" error={form.formState.errors.title?.message}>
            <Input {...form.register('title')} placeholder="e.g. Senior Software Engineer" />
          </Field>
          <Field label="Source" error={form.formState.errors.source?.message}>
            <Select defaultValue="LinkedIn" onValueChange={v => form.setValue('source', v as JobSource)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Source URL">
            <Input {...form.register('sourceUrl')} placeholder="https://..." />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>Add</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/jobs/JobFilterBar.tsx frontend/src/features/jobs/JobQuickAdd.tsx
git commit -m "feat(frontend): JobFilterBar and JobQuickAdd dialog"
```

---

### Task 30: JobsTable

**Files:**
- Create: `frontend/src/features/jobs/JobsTable.tsx`

**Interfaces:**
- Consumes: `JobDto[]`, `JobStatusDropdown`, shadcn Table components
- Produces: `<JobsTable jobs={JobDto[]} onJobClick={(id) => void} />`

- [ ] **Step 1: Create JobsTable**

```tsx
// frontend/src/features/jobs/JobsTable.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { JobStatusDropdown } from './JobStatusDropdown';
import type { JobDto } from '@/lib/api/model';

const PRIORITY_COLOR = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-red-100 text-red-700',
} as const;

interface Props {
  jobs: JobDto[];
  onJobClick: (id: number) => void;
}

export function JobsTable({ jobs, onJobClick }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Company</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Salary</TableHead>
          <TableHead>Applied</TableHead>
          <TableHead>Next action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map(job => {
          const isOverdue = job.nextActionAtUtc && new Date(job.nextActionAtUtc) < new Date();
          return (
            <TableRow
              key={job.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onJobClick(job.id)}
            >
              <TableCell className="font-medium">{job.companyName}</TableCell>
              <TableCell>{job.title}</TableCell>
              <TableCell onClick={e => e.stopPropagation()}>
                <JobStatusDropdown jobId={job.id} currentStatus={job.status} />
              </TableCell>
              <TableCell>
                <Badge className={PRIORITY_COLOR[job.priority]}>{job.priority}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {[job.city, job.country].filter(Boolean).join(', ')}
                {job.remoteMode !== 'OnSite' && ` · ${job.remoteMode}`}
              </TableCell>
              <TableCell className="text-sm">
                {job.salaryMin
                  ? `${job.salaryCurrency ?? ''} ${job.salaryMin.toLocaleString()}${job.salaryMax ? `–${job.salaryMax.toLocaleString()}` : '+'}`
                  : '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {job.appliedAtUtc ? new Date(job.appliedAtUtc).toLocaleDateString() : '—'}
              </TableCell>
              <TableCell className={`text-sm ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                {job.nextActionAtUtc ? new Date(job.nextActionAtUtc).toLocaleDateString() : '—'}
                {isOverdue && ' ⚠'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/jobs/JobsTable.tsx
git commit -m "feat(frontend): JobsTable with status dropdown and overdue indicators"
```

---

### Task 31: JobDetailDrawer — shell + Overview tab

**Files:**
- Create: `frontend/src/features/jobs/JobDetailDrawer.tsx`
- Create: `frontend/src/features/jobs/drawer/OverviewTab.tsx`

**Interfaces:**
- Consumes: `useGetApiJobsId` hook, `JobDetailDto` from model
- Produces: `<JobDetailDrawer jobId={number | null} onClose={() => void} />` — sliding sheet with tabs

- [ ] **Step 1: Create OverviewTab**

```tsx
// frontend/src/features/jobs/drawer/OverviewTab.tsx
import type { JobDetailDto } from '@/lib/api/model';
import { Badge } from '@/components/ui/badge';

interface Props { job: JobDetailDto }

export function OverviewTab({ job }: Props) {
  const fields: Array<[string, string | number | null | undefined]> = [
    ['Source', job.source],
    ['Source URL', job.sourceUrl],
    ['Location', [job.city, job.country].filter(Boolean).join(', ') || null],
    ['Remote', job.remoteMode],
    ['Employment', job.employmentType],
    ['Salary', job.salaryMin ? `${job.salaryCurrency ?? ''} ${job.salaryMin?.toLocaleString()}–${job.salaryMax?.toLocaleString() ?? '+'} / ${job.salaryPeriod}` : null],
    ['Applied', job.appliedAtUtc ? new Date(job.appliedAtUtc).toLocaleDateString() : null],
    ['Deadline', job.deadlineAtUtc ? new Date(job.deadlineAtUtc).toLocaleDateString() : null],
    ['Next action', job.nextActionAtUtc ? new Date(job.nextActionAtUtc).toLocaleDateString() : null],
    ['Fit score', job.fitScore ? `${job.fitScore}/10` : null],
    ['Resume angle', job.resumeAngle],
    ['Offer salary', job.offerSalary ? `${job.offerCurrency ?? ''} ${job.offerSalary.toLocaleString()}` : null],
    ['Offer notes', job.offerNotes],
    ['Rejection reason', job.rejectionReason],
  ];

  return (
    <div className="space-y-3 py-2">
      {job.notes && (
        <div className="rounded-md bg-muted p-3 text-sm">{job.notes}</div>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {fields.filter(([, v]) => v != null && v !== '').map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-medium truncate">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

- [ ] **Step 2: Create JobDetailDrawer shell**

```tsx
// frontend/src/features/jobs/JobDetailDrawer.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetApiJobsId } from '@/lib/api/jobs/jobs';
import { JobStatusDropdown } from './JobStatusDropdown';
import { OverviewTab } from './drawer/OverviewTab';

interface Props {
  jobId: number | null;
  onClose: () => void;
}

export function JobDetailDrawer({ jobId, onClose }: Props) {
  const { data: job, isLoading } = useGetApiJobsId(jobId ?? 0, {
    query: { enabled: jobId !== null },
  });

  return (
    <Sheet open={jobId !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto">
        {isLoading || !job ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="pb-2">
              <SheetTitle className="text-lg">{job.title}</SheetTitle>
              <p className="text-sm text-muted-foreground">{job.companyName}</p>
              <div className="pt-1">
                <JobStatusDropdown jobId={job.id} currentStatus={job.status} />
              </div>
            </SheetHeader>
            <Tabs defaultValue="overview" className="mt-2">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activities">Activities ({job.activities?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="followups">Follow-ups</TabsTrigger>
                <TabsTrigger value="attachments">Attachments ({job.attachments?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="properties">Properties</TabsTrigger>
              </TabsList>
              <TabsContent value="overview"><OverviewTab job={job} /></TabsContent>
              <TabsContent value="activities"><div className="py-4 text-sm text-muted-foreground">Activities — Task 32</div></TabsContent>
              <TabsContent value="followups"><div className="py-4 text-sm text-muted-foreground">Follow-ups — Task 33</div></TabsContent>
              <TabsContent value="attachments"><div className="py-4 text-sm text-muted-foreground">Attachments — Task 34</div></TabsContent>
              <TabsContent value="properties"><div className="py-4 text-sm text-muted-foreground">Properties — Task 34</div></TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/jobs/JobDetailDrawer.tsx frontend/src/features/jobs/drawer/OverviewTab.tsx
git commit -m "feat(frontend): JobDetailDrawer shell with Overview tab"
```

---

### Task 32: Drawer — Activities tab

**Files:**
- Create: `frontend/src/features/jobs/drawer/ActivitiesTab.tsx`
- Create: `frontend/src/features/jobs/drawer/ActivityForm.tsx`

- [ ] **Step 1: Create ActivityForm**

```tsx
// frontend/src/features/jobs/drawer/ActivityForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/form/Field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { JobActivityDto, JobActivityType, JobActivityStatus } from '@/lib/api/model';

const TYPES: JobActivityType[] = ['Screening', 'Interview', 'Technical', 'SystemDesign', 'Behavioral', 'TakeHome', 'Assessment', 'OfferDiscussion', 'Other'];
const STATUSES: JobActivityStatus[] = ['Planned', 'Scheduled', 'Completed', 'Cancelled'];

const schema = z.object({
  label: z.string().min(1),
  type: z.string() as z.ZodType<JobActivityType>,
  status: z.string() as z.ZodType<JobActivityStatus>,
  scheduledAtUtc: z.string().optional(),
  contactName: z.string().optional(),
  meetingUrl: z.string().url().optional().or(z.literal('')),
  prepNotes: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  jobId: number;
  activity?: JobActivityDto;
  onSave: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}

export function ActivityForm({ activity, onSave, onCancel }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: activity?.label ?? '',
      type: activity?.type ?? 'Interview',
      status: activity?.status ?? 'Planned',
      scheduledAtUtc: activity?.scheduledAtUtc?.slice(0, 16) ?? '',
      contactName: activity?.contactName ?? '',
      meetingUrl: activity?.meetingUrl ?? '',
      prepNotes: activity?.prepNotes ?? '',
      notes: activity?.notes ?? '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-3">
      <Field label="Label" error={form.formState.errors.label?.message}>
        <Input {...form.register('label')} placeholder="e.g. Technical Round 1" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type">
          <Select defaultValue={form.getValues('type')} onValueChange={v => form.setValue('type', v as JobActivityType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select defaultValue={form.getValues('status')} onValueChange={v => form.setValue('status', v as JobActivityStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Scheduled (UTC)">
        <Input type="datetime-local" {...form.register('scheduledAtUtc')} />
      </Field>
      <Field label="Contact name">
        <Input {...form.register('contactName')} />
      </Field>
      <Field label="Meeting URL">
        <Input {...form.register('meetingUrl')} placeholder="https://meet..." />
      </Field>
      <Field label="Prep notes">
        <Input {...form.register('prepNotes')} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>Save</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create ActivitiesTab**

```tsx
// frontend/src/features/jobs/drawer/ActivitiesTab.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  usePostApiJobsIdActivities,
  usePutApiJobsIdActivitiesActivityId,
  useDeleteApiJobsIdActivitiesActivityId,
  usePostApiJobsIdActivitiesActivityIdComplete,
  getGetApiJobsIdQueryKey,
} from '@/lib/api/jobs/jobs';
import type { JobDetailDto, JobActivityDto, JobActivityOutcome } from '@/lib/api/model';
import { ActivityForm } from './ActivityForm';

const OUTCOME_COLOR: Record<JobActivityOutcome, string> = {
  Unknown: 'bg-slate-100',
  Waiting: 'bg-yellow-100 text-yellow-800',
  Passed: 'bg-green-100 text-green-800',
  Failed: 'bg-red-100 text-red-800',
};

interface Props { job: JobDetailDto }

export function ActivitiesTab({ job }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetApiJobsIdQueryKey(job.id) });

  const add = usePostApiJobsIdActivities({ mutation: { onSuccess: () => { invalidate(); setAdding(false); }, onError: () => toast.error('Failed') } });
  const update = usePutApiJobsIdActivitiesActivityId({ mutation: { onSuccess: () => { invalidate(); setEditing(null); }, onError: () => toast.error('Failed') } });
  const remove = useDeleteApiJobsIdActivitiesActivityId({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });
  const complete = usePostApiJobsIdActivitiesActivityIdComplete({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });

  return (
    <div className="space-y-3 py-2">
      {job.activities?.map(a => (
        <div key={a.id} className="border rounded-md p-3 space-y-1">
          {editing === a.id ? (
            <ActivityForm
              jobId={job.id}
              activity={a}
              onSave={async vals => update.mutate({ id: job.id, activityId: a.id, data: { ...vals, scheduledAtUtc: vals.scheduledAtUtc || undefined } })}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-medium text-sm">{a.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{a.type}</span>
                </div>
                <Badge className={OUTCOME_COLOR[a.outcome]}>{a.outcome}</Badge>
              </div>
              {a.scheduledAtUtc && (
                <p className="text-xs text-muted-foreground">{new Date(a.scheduledAtUtc).toLocaleString()}</p>
              )}
              {a.feedback && <p className="text-sm text-muted-foreground">{a.feedback}</p>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditing(a.id)}>Edit</Button>
                {a.status !== 'Completed' && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs"
                    onClick={() => complete.mutate({ id: job.id, activityId: a.id, data: { outcome: 'Passed', createFollowUp: false } })}>
                    Complete
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 text-xs text-red-500"
                  onClick={() => remove.mutate({ id: job.id, activityId: a.id })}>
                  Delete
                </Button>
              </div>
            </>
          )}
        </div>
      ))}

      {adding ? (
        <div className="border rounded-md p-3">
          <ActivityForm
            jobId={job.id}
            onSave={async vals => add.mutate({ id: job.id, data: { ...vals, scheduledAtUtc: vals.scheduledAtUtc || undefined } })}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ Add activity</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire ActivitiesTab into JobDetailDrawer**

In `JobDetailDrawer.tsx`, replace the Activities placeholder with:
```tsx
import { ActivitiesTab } from './drawer/ActivitiesTab';
// ...
<TabsContent value="activities"><ActivitiesTab job={job} /></TabsContent>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/jobs/drawer/
git commit -m "feat(frontend): Activities tab with add/edit/complete/delete"
```

---

### Task 33: Drawer — FollowUps tab

**Files:**
- Create: `frontend/src/features/jobs/drawer/FollowUpsTab.tsx`
- Create: `frontend/src/features/jobs/drawer/FollowUpForm.tsx`

- [ ] **Step 1: Create FollowUpForm**

```tsx
// frontend/src/features/jobs/drawer/FollowUpForm.tsx
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/form/Field';

const schema = z.object({
  title: z.string().min(1),
  dueAtUtc: z.string().min(1),
  priority: z.enum(['Low', 'Medium', 'High']),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSave: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}

export function FollowUpForm({ onSave, onCancel }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'Medium' },
  });

  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-2">
      <Field label="Title" error={form.formState.errors.title?.message}>
        <Input {...form.register('title')} placeholder="e.g. Follow up with recruiter" />
      </Field>
      <Field label="Due date" error={form.formState.errors.dueAtUtc?.message}>
        <Input type="datetime-local" {...form.register('dueAtUtc')} />
      </Field>
      <Field label="Description">
        <Input {...form.register('description')} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm">Save</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create FollowUpsTab**

```tsx
// frontend/src/features/jobs/drawer/FollowUpsTab.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  usePostApiJobsIdFollowUps,
  getGetApiJobsIdQueryKey,
} from '@/lib/api/jobs/jobs';
import {
  usePostApiFollowUpTasksIdComplete,
  usePostApiFollowUpTasksIdSkip,
} from '@/lib/api/follow-up-tasks/follow-up-tasks';
import type { JobDetailDto, FollowUpStatus } from '@/lib/api/model';
import { FollowUpForm } from './FollowUpForm';

interface Props { job: JobDetailDto }

export function FollowUpsTab({ job }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetApiJobsIdQueryKey(job.id) });

  const followUps = job.followUps ?? [];
  const add = usePostApiJobsIdFollowUps({ mutation: { onSuccess: () => { invalidate(); setAdding(false); }, onError: () => toast.error('Failed') } });
  const complete = usePostApiFollowUpTasksIdComplete({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });
  const skip = usePostApiFollowUpTasksIdSkip({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });

  const STATUS_COLOR: Record<FollowUpStatus, string> = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Completed: 'bg-green-100 text-green-800',
    Skipped: 'bg-slate-100',
  };

  return (
    <div className="space-y-2 py-2">
      {followUps?.map(f => (
        <div key={f.id} className="border rounded-md p-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{f.title}</p>
            <p className="text-xs text-muted-foreground">{new Date(f.dueAtUtc).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-1">
            <Badge className={STATUS_COLOR[f.status]}>{f.status}</Badge>
            {f.status === 'Pending' && (
              <>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => complete.mutate({ id: f.id })}>Done</Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => skip.mutate({ id: f.id })}>Skip</Button>
              </>
            )}
          </div>
        </div>
      ))}

      {adding ? (
        <div className="border rounded-md p-3">
          <FollowUpForm
            onSave={async vals => add.mutate({ id: job.id, data: { title: vals.title, dueAtUtc: vals.dueAtUtc, priority: vals.priority, description: vals.description, jobId: job.id } })}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ Add follow-up</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire into JobDetailDrawer**

```tsx
import { FollowUpsTab } from './drawer/FollowUpsTab';
// ...
<TabsContent value="followups"><FollowUpsTab job={job} /></TabsContent>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/jobs/drawer/FollowUpsTab.tsx frontend/src/features/jobs/drawer/FollowUpForm.tsx
git commit -m "feat(frontend): FollowUps tab with add/complete/skip"
```

---

### Task 34: Drawer — Attachments + Properties tabs

**Files:**
- Create: `frontend/src/features/jobs/drawer/AttachmentsTab.tsx`
- Create: `frontend/src/features/jobs/drawer/AttachmentForm.tsx`
- Create: `frontend/src/features/jobs/drawer/PropertiesTab.tsx`

- [ ] **Step 1: Create AttachmentForm**

```tsx
// frontend/src/features/jobs/drawer/AttachmentForm.tsx
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/form/Field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { JobAttachmentDto, JobAttachmentType } from '@/lib/api/model';

const TYPES: JobAttachmentType[] = ['Resume', 'CoverLetter', 'JobDescription', 'Email', 'Screenshot', 'Other'];

const schema = z.object({
  type: z.string() as z.ZodType<JobAttachmentType>,
  title: z.string().min(1),
  url: z.string().url().optional().or(z.literal('')),
  fileName: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  attachment?: JobAttachmentDto;
  onSave: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}

export function AttachmentForm({ attachment, onSave, onCancel }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: attachment?.type ?? 'Other',
      title: attachment?.title ?? '',
      url: attachment?.url ?? '',
      fileName: attachment?.fileName ?? '',
      notes: attachment?.notes ?? '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-2">
      <Field label="Type">
        <Select defaultValue={form.getValues('type')} onValueChange={v => form.setValue('type', v as JobAttachmentType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Title" error={form.formState.errors.title?.message}>
        <Input {...form.register('title')} placeholder="e.g. Resume v3" />
      </Field>
      <Field label="URL"><Input {...form.register('url')} placeholder="https://..." /></Field>
      <Field label="File name"><Input {...form.register('fileName')} /></Field>
      <Field label="Notes"><Input {...form.register('notes')} /></Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm">Save</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create AttachmentsTab**

```tsx
// frontend/src/features/jobs/drawer/AttachmentsTab.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  usePostApiJobsIdAttachments,
  usePutApiJobsIdAttachmentsAttachmentId,
  useDeleteApiJobsIdAttachmentsAttachmentId,
  getGetApiJobsIdQueryKey,
} from '@/lib/api/jobs/jobs';
import type { JobDetailDto } from '@/lib/api/model';
import { AttachmentForm } from './AttachmentForm';

interface Props { job: JobDetailDto }

export function AttachmentsTab({ job }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetApiJobsIdQueryKey(job.id) });

  const add = usePostApiJobsIdAttachments({ mutation: { onSuccess: () => { invalidate(); setAdding(false); }, onError: () => toast.error('Failed') } });
  const update = usePutApiJobsIdAttachmentsAttachmentId({ mutation: { onSuccess: () => { invalidate(); setEditing(null); }, onError: () => toast.error('Failed') } });
  const remove = useDeleteApiJobsIdAttachmentsAttachmentId({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });

  return (
    <div className="space-y-2 py-2">
      {job.attachments?.map(a => (
        <div key={a.id} className="border rounded-md p-3">
          {editing === a.id ? (
            <AttachmentForm
              attachment={a}
              onSave={async vals => update.mutate({ id: job.id, attachmentId: a.id, data: vals })}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.type}{a.url && ` · `}{a.url && <a href={a.url} target="_blank" rel="noopener" className="underline">Link</a>}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditing(a.id)}>Edit</Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs text-red-500" onClick={() => remove.mutate({ id: job.id, attachmentId: a.id })}>Delete</Button>
              </div>
            </div>
          )}
        </div>
      ))}
      {adding ? (
        <div className="border rounded-md p-3">
          <AttachmentForm onSave={async vals => add.mutate({ id: job.id, data: vals })} onCancel={() => setAdding(false)} />
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ Add attachment</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create PropertiesTab**

```tsx
// frontend/src/features/jobs/drawer/PropertiesTab.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  usePutApiJobsIdPropertiesKey,
  useDeleteApiJobsIdPropertiesKey,
  getGetApiJobsIdQueryKey,
} from '@/lib/api/jobs/jobs';
import type { JobDetailDto } from '@/lib/api/model';

interface Props { job: JobDetailDto }

export function PropertiesTab({ job }: Props) {
  const qc = useQueryClient();
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetApiJobsIdQueryKey(job.id) });

  const upsert = usePutApiJobsIdPropertiesKey({ mutation: { onSuccess: () => { invalidate(); setNewKey(''); setNewVal(''); }, onError: () => toast.error('Failed') } });
  const remove = useDeleteApiJobsIdPropertiesKey({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });

  return (
    <div className="space-y-2 py-2">
      <p className="text-xs text-muted-foreground">Agent notes and metadata. Collapsed by default — expand to view/edit.</p>
      {job.properties?.map(p => (
        <div key={p.id} className="flex items-center gap-2 text-sm">
          <span className="font-medium w-32 truncate">{p.key}</span>
          <span className="flex-1 text-muted-foreground truncate">{p.value}</span>
          <Button size="sm" variant="ghost" className="h-6 text-xs text-red-500"
            onClick={() => remove.mutate({ id: job.id, key: p.key })}>×</Button>
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Key" className="h-7 w-32" />
        <Input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="Value" className="h-7 flex-1" />
        <Button size="sm" className="h-7"
          disabled={!newKey}
          onClick={() => upsert.mutate({ id: job.id, key: newKey, data: { value: newVal, valueType: 'Text' } })}>
          Set
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire both tabs into JobDetailDrawer**

```tsx
import { AttachmentsTab } from './drawer/AttachmentsTab';
import { PropertiesTab } from './drawer/PropertiesTab';
// ...
<TabsContent value="attachments"><AttachmentsTab job={job} /></TabsContent>
<TabsContent value="properties"><PropertiesTab job={job} /></TabsContent>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/jobs/drawer/
git commit -m "feat(frontend): Attachments and Properties tabs in JobDetailDrawer"
```

---

### Task 35: Assemble JobsPage

**Files:**
- Modify: `frontend/src/pages/JobsPage.tsx`

**Interfaces:**
- Consumes: `JobsBoard`, `JobsTable`, `JobFilterBar`, `JobQuickAdd`, `JobDetailDrawer`, `useGetApiJobs`
- Produces: complete `/jobs` page with board/table toggle, filters, quick-add, detail drawer

- [ ] **Step 1: Write JobsPage**

```tsx
// frontend/src/pages/JobsPage.tsx
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useGetApiJobs } from '@/lib/api/jobs/jobs';
import { JobsBoard } from '@/features/jobs/JobsBoard';
import { JobsTable } from '@/features/jobs/JobsTable';
import { JobFilterBar, DEFAULT_FILTERS, type JobFilters } from '@/features/jobs/JobFilterBar';
import { JobQuickAdd } from '@/features/jobs/JobQuickAdd';
import { JobDetailDrawer } from '@/features/jobs/JobDetailDrawer';
import type { JobDto } from '@/lib/api/model';

export default function JobsPage() {
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Send server-side filters (status, countries, companySearch) to the API.
  // Client-side search applied on top for instant UX.
  const { data: jobs = [], isLoading, isError } = useGetApiJobs({
    ...(filters.status ? { statuses: [filters.status] } : {}),
    ...(filters.countries.length > 0 ? { countries: filters.countries } : {}),
    ...(filters.companySearch ? { companySearch: filters.companySearch } : {}),
  });

  const filtered = useMemo(() => {
    if (!filters.search) return jobs as JobDto[];
    const s = filters.search.toLowerCase();
    return (jobs as JobDto[]).filter(j =>
      j.title.toLowerCase().includes(s) ||
      j.companyName.toLowerCase().includes(s) ||
      j.sourceUrl?.toLowerCase().includes(s) ||
      j.notes?.toLowerCase().includes(s)
    );
  }, [jobs, filters.search]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Jobs</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <JobFilterBar filters={filters} onChange={setFilters} />
          <JobQuickAdd />
        </div>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>
        <TabsContent value="board">
          {isError ? (
            <div className="py-8 text-center text-sm text-destructive">Failed to load jobs. Check your connection.</div>
          ) : isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
          ) : (
            <JobsBoard jobs={filtered} groupBy={filters.groupBy} onJobClick={setSelectedJobId} />
          )}
        </TabsContent>
        <TabsContent value="table">
          <JobsTable jobs={filtered} onJobClick={setSelectedJobId} />
        </TabsContent>
      </Tabs>

      <JobDetailDrawer jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/JobsPage.tsx
git commit -m "feat(frontend): assemble JobsPage with board/table toggle, filters, drawer"
```

---

### Task 36: DnD implementation

**Files:**
- Modify: `frontend/src/features/jobs/JobsBoard.tsx`
- Modify: `frontend/src/features/jobs/JobCard.tsx`
- Modify: `frontend/src/features/jobs/BoardColumn.tsx`

**Interfaces:**
- Consumes: `@dnd-kit/core` `DndContext`, `DragOverlay`, `useDraggable`; `useDroppable` already on `BoardColumn` from Task 28; no `@dnd-kit/sortable`
- Produces: drag-to-column triggers `transition_job`; optimistic card move + rollback on error

> **Constraint:** DnD transitions only work when `groupBy === 'status'`. The `DndContext` is only rendered when `groupBy === 'status'`; other groupings render columns directly. `BoardColumn`'s `useDroppable` is harmless without a `DndContext` — `isOver` stays false and `setNodeRef` is a no-op.

- [ ] **Step 1: Replace JobCard with useDraggable version**

Replace the entire file content. Uses `useDraggable` (not `useSortable`) — only the card's own position matters, not sortable ordering within a column. The `PointerSensor` in Step 2 ensures drag only activates after 8px movement, so normal clicks still open the drawer.

```tsx
// Modify frontend/src/features/jobs/JobCard.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { JobStatusDropdown } from './JobStatusDropdown';
import type { JobDto } from '@/lib/api/model';
import { cn } from '@/lib/utils';

const PRIORITY_COLOR = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-red-100 text-red-700',
} as const;

interface Props {
  job: JobDto;
  onClick: () => void;
  isDragging?: boolean;
}

export function JobCard({ job, onClick, isDragging }: Props) {
  const isOverdue = job.nextActionAtUtc && new Date(job.nextActionAtUtc) < new Date();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isBeingDragged,
  } = useDraggable({ id: job.id });

  // CSS.Translate.toString ignores scale — correct for a draggable card (not sortable)
  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        // cursor-pointer (not cursor-grab) — drag activates only after 8px movement, not on click
        'cursor-pointer hover:shadow-md transition-shadow select-none',
        (isDragging || isBeingDragged) && 'opacity-40',
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-1.5">
        {/* Header: ID link (new tab) + priority badge */}
        <div className="flex items-center justify-between">
          <Link
            to={`/jobs/${job.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground hover:underline"
          >
            JOB-{job.id}
          </Link>
          <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', PRIORITY_COLOR[job.priority])}>
            {job.priority}
          </Badge>
        </div>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{job.companyName}</p>
            <p className="font-medium text-sm leading-tight truncate">{job.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {job.country && <span>{job.country}</span>}
          {job.country && job.remoteMode !== 'OnSite' && <span>·</span>}
          {job.remoteMode !== 'OnSite' && <span>{job.remoteMode}</span>}
        </div>

        {job.salaryMin && (
          <p className="text-[11px] text-muted-foreground">
            {job.salaryCurrency ?? ''} {job.salaryMin.toLocaleString()}
            {job.salaryMax ? `–${job.salaryMax.toLocaleString()}` : '+'}
          </p>
        )}

        {job.nextActionAtUtc && (
          <p className={cn('text-[11px]', isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
            Next: {new Date(job.nextActionAtUtc).toLocaleDateString()}
            {isOverdue && ' ⚠'}
          </p>
        )}

        <div onClick={e => e.stopPropagation()}>
          <JobStatusDropdown jobId={job.id} currentStatus={job.status} />
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Add DnD to JobsBoard**

Build on top of the `JobsBoard` from Task 28. Add DnD imports, state, and handlers; then replace the return statement with a DnD-conditional version.

```tsx
// Modify frontend/src/features/jobs/JobsBoard.tsx
// Add these imports alongside existing ones from Task 28:
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { useJobMutations } from './useJobMutations';
import { getGetApiJobsQueryKey } from '@/lib/api/jobs/jobs';

// Inside JobsBoard component, add state and handlers after the existing groupJobs/visibleGroups lines:
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
);
const [activeJob, setActiveJob] = useState<JobDto | null>(null);
const qc = useQueryClient();
const { transition } = useJobMutations();

const handleDragStart = ({ active }: DragStartEvent) => {
  setActiveJob(jobs.find(j => j.id === active.id) ?? null);
};

const handleDragEnd = ({ active, over }: DragEndEvent) => {
  setActiveJob(null);
  if (groupBy !== 'status') return;   // DnD only active for status grouping
  if (!over) return;

  const job = jobs.find(j => j.id === active.id);
  const toStatus = over.id as JobStatus;

  // Same column = no-op
  if (!job || job.status === toStatus) return;

  // Optimistic update
  const prevJobs = qc.getQueryData(getGetApiJobsQueryKey());
  qc.setQueryData(getGetApiJobsQueryKey(), (old: JobDto[] | undefined) =>
    old?.map(j => j.id === job.id ? { ...j, status: toStatus } : j)
  );

  transition.mutate(
    { id: job.id, data: { toStatus } },
    { onError: () => qc.setQueryData(getGetApiJobsQueryKey(), prevJobs) }
  );
};

// Replace the return statement from Task 28 with this DnD-conditional version.
// `visibleGroups` comes from Task 28's groupJobs() — no change needed there.
const columns = (
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

// DndContext wraps only when groupBy === 'status'; other groupings render columns directly.
return groupBy === 'status' ? (
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  >
    {columns}
    <DragOverlay>
      {activeJob && <JobCard job={activeJob} onClick={() => {}} isDragging />}
    </DragOverlay>
  </DndContext>
) : columns;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/jobs/
git commit -m "feat(frontend): DnD board with optimistic status transition and rollback"
```

---

### Task 37: Dashboard and Tasks page updates

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`
- Modify: `frontend/src/pages/TasksPage.tsx`

- [ ] **Step 0: Update frontend enums constants file**

**Prerequisite:** `frontend/src/lib/api/model` must exist (generated in Phase 3 Task 23). If it doesn't, complete Phase 3 Task 23 before this step.

Open `frontend/src/lib/enums.ts` (or wherever `JOB_STATUS_LABELS`, `APPLICATION_STAGE_LABELS`, etc. are defined). Replace V1 enum maps with V2 ones:

```ts
// frontend/src/lib/enums.ts
import type { JobStatus, JobActivityType, JobActivityStatus, JobActivityOutcome } from '@/lib/api/model';

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  Discovered:   'Discovered',
  Interested:   'Interested',
  Applied:      'Applied',
  Interviewing: 'Interviewing',
  Offered:      'Offered',
  Rejected:     'Rejected',
  Ghosted:      'Ghosted',
  Withdrawn:    'Withdrawn',
  Archived:     'Archived',
};

export const ACTIVITY_TYPE_LABELS: Record<JobActivityType, string> = {
  Screening:       'Screening',
  Interview:       'Interview',
  Technical:       'Technical',
  SystemDesign:    'System Design',
  Behavioral:      'Behavioral',
  TakeHome:        'Take-home',
  Assessment:      'Assessment',
  OfferDiscussion: 'Offer Discussion',
  Other:           'Other',
};

export const ACTIVITY_STATUS_LABELS: Record<JobActivityStatus, string> = {
  Planned:    'Planned',
  Scheduled:  'Scheduled',
  Completed:  'Completed',
  Cancelled:  'Cancelled',
};

export const ACTIVITY_OUTCOME_LABELS: Record<JobActivityOutcome, string> = {
  Unknown: 'Unknown',
  Waiting: 'Waiting',
  Passed:  'Passed',
  Failed:  'Failed',
};
```

Delete any old V1 enum maps (`JOB_LEAD_STATUS_LABELS`, `APPLICATION_STAGE_LABELS`, etc.).

- [ ] **Step 1: Rewrite DashboardPage**

Replace the entire file with:

```tsx
// frontend/src/pages/DashboardPage.tsx
import { Link } from 'react-router-dom';
import { useGetApiDashboardSummary } from '@/lib/api/dashboard/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { JobStatus } from '@/lib/api/model';

const STATUS_ORDER: JobStatus[] = ['Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered'];

export default function DashboardPage() {
  const { data: summary, isLoading, isError } = useGetApiDashboardSummary();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return <div className="p-6 text-sm text-destructive">Failed to load dashboard.</div>;
  }

  // activeJobsByStatus is serialized as { "Applied": 5, "Interviewing": 2, ... }
  const byStatus = summary.activeJobsByStatus as Record<string, number>;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {/* Active jobs by status */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Active pipeline</h2>
        <div className="flex gap-3 flex-wrap">
          {STATUS_ORDER.map(status => (
            <Card key={status} className="flex-1 min-w-[100px]">
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold">{byStatus[status] ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{status}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Follow-up counts */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.followUpsDueToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.overdueFollowUps > 0 ? 'text-red-500' : ''}`}>
              {summary.overdueFollowUps}
            </p>
          </CardContent>
        </Card>
        {summary.daysUntilSearchDeadline != null && (
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Days until deadline</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.daysUntilSearchDeadline <= 7 ? 'text-orange-500' : ''}`}>
                {summary.daysUntilSearchDeadline}
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Upcoming activities */}
      {summary.upcomingActivities.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Upcoming activities (next 7 days)</h2>
          <div className="space-y-2">
            {summary.upcomingActivities.map(a => (
              <div key={a.activityId} className="flex items-center justify-between p-3 rounded-md border text-sm">
                <div>
                  <Link to={`/jobs/${a.jobId}`} className="font-medium hover:underline">{a.jobTitle}</Link>
                  <span className="text-muted-foreground"> · {a.companyName}</span>
                  <p className="text-xs text-muted-foreground">{a.activityLabel}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {new Date(a.scheduledAtUtc).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stale jobs */}
      {summary.staleJobs.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Stale jobs</h2>
          <div className="space-y-2">
            {summary.staleJobs.map(j => (
              <div key={j.id} className="flex items-center justify-between p-3 rounded-md border text-sm">
                <div>
                  <Link to={`/jobs/${j.id}`} className="font-medium hover:underline">{j.title}</Link>
                  <span className="text-muted-foreground"> · {j.companyName}</span>
                </div>
                <p className="text-xs text-muted-foreground">{j.status}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Offer deadlines */}
      {summary.offerDeadlines.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Offer deadlines</h2>
          <div className="space-y-2">
            {summary.offerDeadlines.map(o => (
              <div key={o.jobId} className="flex items-center justify-between p-3 rounded-md border text-sm">
                <div>
                  <Link to={`/jobs/${o.jobId}`} className="font-medium hover:underline">{o.title}</Link>
                  <span className="text-muted-foreground"> · {o.companyName}</span>
                </div>
                <p className="text-xs font-medium text-orange-500">
                  {new Date(o.offerDeadlineAtUtc).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite TasksPage**

Replace the entire file with:

```tsx
// frontend/src/pages/TasksPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetApiFollowUpTasks,
  getGetApiFollowUpTasksQueryKey,
  usePostApiFollowUpTasksIdComplete,
  usePostApiFollowUpTasksIdSkip,
} from '@/lib/api/follow-up-tasks/follow-up-tasks';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FollowUpStatus } from '@/lib/api/model';
import { toast } from 'sonner';

type DueFilter = 'all' | 'today' | 'overdue';

const STATUS_BADGE: Record<FollowUpStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Completed: 'bg-green-100 text-green-800',
  Skipped: 'bg-gray-100 text-gray-600',
};

export default function TasksPage() {
  const [due, setDue] = useState<DueFilter>('all');
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | undefined>(undefined);
  const qc = useQueryClient();

  const { data: tasks = [], isLoading, isError } = useGetApiFollowUpTasks({
    params: {
      due: due === 'all' ? undefined : due,
      status: statusFilter,
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: getGetApiFollowUpTasksQueryKey() });

  const complete = usePostApiFollowUpTasksIdComplete({
    mutation: { onSuccess: invalidate, onError: () => toast.error('Failed to complete task') },
  });

  const skip = usePostApiFollowUpTasksIdSkip({
    mutation: { onSuccess: invalidate, onError: () => toast.error('Failed to skip task') },
  });

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Tasks</h1>
        <div className="flex gap-2">
          <Select value={due} onValueChange={v => setDue(v as DueFilter)}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="today">Due today</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter ?? 'all'}
            onValueChange={v => setStatusFilter(v === 'all' ? undefined : v as FollowUpStatus)}
          >
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError && <p className="text-sm text-destructive">Failed to load tasks.</p>}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No tasks found.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const isPending = task.status === 'Pending';
            const isOverdue = isPending && task.dueAtUtc && new Date(task.dueAtUtc) < new Date();
            return (
              <div key={task.id} className="flex items-start justify-between p-3 rounded-md border gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{task.title}</p>
                  {task.jobId && (
                    <Link
                      to={`/jobs/${task.jobId}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {task.jobTitle ?? `JOB-${task.jobId}`}
                    </Link>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${STATUS_BADGE[task.status as FollowUpStatus] ?? ''}`}
                    >
                      {task.status}
                    </Badge>
                    {task.dueAtUtc && (
                      <span className={`text-[11px] ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                        {new Date(task.dueAtUtc).toLocaleDateString()}{isOverdue ? ' · overdue' : ''}
                      </span>
                    )}
                  </div>
                </div>
                {isPending && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => complete.mutate({ id: task.id })}
                      disabled={complete.isPending}
                    >
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => skip.mutate({ id: task.id })}
                      disabled={skip.isPending}
                    >
                      Skip
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

> **Note:** Verify exact hook names in `frontend/src/lib/api/follow-up-tasks/follow-up-tasks.ts` after orval generation — `useGetApiFollowUpTasks`, `usePostApiFollowUpTasksIdComplete`, `usePostApiFollowUpTasksIdSkip`, and `getGetApiFollowUpTasksQueryKey` are the expected names from the V2 API routes.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/pages/TasksPage.tsx
git commit -m "feat(frontend): rebuild Dashboard and Tasks pages on V2 data model"
```

---

### Task 38: JobDetailContent + JobDetailPage

**Files:**
- Create: `frontend/src/features/jobs/JobDetailContent.tsx`
- Create: `frontend/src/pages/JobDetailPage.tsx`
- Modify: `frontend/src/features/jobs/JobDetailDrawer.tsx`

**Interfaces:**
- Consumes: all drawer tab components (OverviewTab, ActivitiesTab, FollowUpsTab, AttachmentsTab, PropertiesTab) built in Tasks 31–34
- Produces: `<JobDetailContent job={JobDetailDto} />` — shared tab content used by both drawer and full page; `<JobDetailPage />` — dedicated `/jobs/:id` full-page view

> **Timeline tab:** `TimelineTab` is created in Phase 5 Task 40. After completing that task, add `<TabsTrigger value="timeline">Timeline</TabsTrigger>` + `<TabsContent value="timeline"><TimelineTab jobId={job.id} /></TabsContent>` to `JobDetailContent.tsx`.

- [ ] **Step 1: Create JobDetailContent**

Extract the tabs from the drawer into a shared component. Both the drawer and the full page render this.

```tsx
// frontend/src/features/jobs/JobDetailContent.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './drawer/OverviewTab';
import { ActivitiesTab } from './drawer/ActivitiesTab';
import { FollowUpsTab } from './drawer/FollowUpsTab';
import { AttachmentsTab } from './drawer/AttachmentsTab';
import { PropertiesTab } from './drawer/PropertiesTab';
import type { JobDetailDto } from '@/lib/api/model';

interface Props { job: JobDetailDto }

export function JobDetailContent({ job }: Props) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activities">Activities ({job.activities?.length ?? 0})</TabsTrigger>
        <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        <TabsTrigger value="attachments">Attachments ({job.attachments?.length ?? 0})</TabsTrigger>
        <TabsTrigger value="properties">Properties</TabsTrigger>
        {/* Timeline tab added here in Phase 5 Task 40 */}
      </TabsList>
      <TabsContent value="overview"><OverviewTab job={job} /></TabsContent>
      <TabsContent value="activities"><ActivitiesTab job={job} /></TabsContent>
      <TabsContent value="followups"><FollowUpsTab job={job} /></TabsContent>
      <TabsContent value="attachments"><AttachmentsTab job={job} /></TabsContent>
      <TabsContent value="properties"><PropertiesTab job={job} /></TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 2: Rewrite JobDetailDrawer to use JobDetailContent**

Replace the entire file content with:

```tsx
// frontend/src/features/jobs/JobDetailDrawer.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetApiJobsId } from '@/lib/api/jobs/jobs';
import { JobStatusDropdown } from './JobStatusDropdown';
import { JobDetailContent } from './JobDetailContent';

interface Props {
  jobId: number | null;
  onClose: () => void;
}

export function JobDetailDrawer({ jobId, onClose }: Props) {
  const { data: job, isLoading } = useGetApiJobsId(jobId ?? 0, {
    query: { enabled: jobId !== null },
  });

  return (
    <Sheet open={jobId !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto">
        {isLoading || !job ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="pb-2">
              <SheetTitle className="text-lg">{job.title}</SheetTitle>
              <p className="text-sm text-muted-foreground">{job.companyName}</p>
              <div className="pt-1">
                <JobStatusDropdown jobId={job.id} currentStatus={job.status} />
              </div>
            </SheetHeader>
            <JobDetailContent job={job} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

This removes the inline `<Tabs>` block, all `TabsList`/`TabsTrigger`/`TabsContent` elements, and the individual tab imports (`OverviewTab`, etc.) — those are now in `JobDetailContent.tsx`.

- [ ] **Step 3: Create JobDetailPage**

```tsx
// frontend/src/pages/JobDetailPage.tsx
import { useParams, Link } from 'react-router-dom';
import { useGetApiJobsId } from '@/lib/api/jobs/jobs';
import { JobDetailContent } from '@/features/jobs/JobDetailContent';
import { JobStatusDropdown } from '@/features/jobs/JobStatusDropdown';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const { data: job, isLoading, isError } = useGetApiJobsId(jobId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !job) {
    return <div className="p-6 text-sm text-destructive">Job not found.</div>;
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto">
      <Link
        to="/jobs"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </Link>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground font-mono mb-1">JOB-{job.id}</p>
          <h1 className="text-xl font-semibold">{job.title}</h1>
          <p className="text-sm text-muted-foreground">{job.companyName}</p>
        </div>
        <JobStatusDropdown jobId={job.id} currentStatus={job.status} />
      </div>
      <JobDetailContent job={job} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/jobs/JobDetailContent.tsx \
        frontend/src/features/jobs/JobDetailDrawer.tsx \
        frontend/src/pages/JobDetailPage.tsx
git commit -m "feat(frontend): JobDetailContent shared + JobDetailPage at /jobs/:id"
```

---

### Task 39: Phase 4 quality gate

> **Deferred to post-MVP:** Source, remote mode, employment type, salary range, and applied date range filters are not in the filter bar UI. The backend supports them via `ListJobsQuery`; they can be added later without backend changes. Table column sorting is also post-MVP.

- [ ] **Step 1: Run typecheck**

```
cd frontend && npm run typecheck
```

Fix all TypeScript errors. Common issues:
- Hook names from orval may differ (e.g. `useGetApiJobsId` vs `useGetApiJobsById`) — check `src/lib/api/jobs/jobs.ts` for exact names
- Missing query param types — check orval-generated parameter types
- `JobDetailDto` vs `JobDto` — detail is returned by `GET /api/jobs/{id}`, list by `GET /api/jobs`

- [ ] **Step 2: Run full verify**

```
just verify
```

Expected: `Build succeeded`, all tests pass, typecheck passes, build passes.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(frontend): typecheck fixes for V2 orval client"
```

---

*Phase 4 complete. Proceed to `docs/superpowers/plans/2026-06-25-domain-v2-phase5-timeline.md`.*
