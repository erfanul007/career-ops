# Domain V2 — Phase 4: Frontend Clean Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace V1 JobLeads + Applications + Interviews pages with a unified Jira-style Jobs workspace: Kanban board with status-dropdown + DnD transitions, sortable table view, Job detail side drawer with full activity/follow-up/attachment/property management.

**Architecture:** Feature-based file organization. All types from orval-generated client (`src/lib/api/`). Tanstack Query for server state. Optimistic updates with rollback. Status dropdown first, then DnD.

**Tech Stack:** React 19, TypeScript 6, Vite 8, shadcn/ui (radix-ui 1.6), @tanstack/react-query 5, @dnd-kit/core 6 + @dnd-kit/sortable, react-hook-form 7, zod 4, orval 8

## Global Constraints

- All TypeScript types come from `src/lib/api/` (orval-generated) — do not hand-author API types
- `@dnd-kit/core` already installed; install `@dnd-kit/sortable` in Task 23
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

- [ ] **Step 1: Install @dnd-kit/sortable**

```
cd frontend && npm install @dnd-kit/sortable
```

Expected: `@dnd-kit/sortable` added to `node_modules` and `package.json`.

- [ ] **Step 2: Delete V1 pages**

```powershell
Remove-Item frontend/src/pages/JobLeadsPage.tsx
Remove-Item frontend/src/pages/ApplicationsPage.tsx
Remove-Item frontend/src/pages/InterviewsPage.tsx
Remove-Item frontend/src/pages/ResumeVariantsPage.tsx
```

- [ ] **Step 3: Delete V1 feature directories**

```powershell
Remove-Item -Recurse -Force frontend/src/features/jobLeads
Remove-Item -Recurse -Force frontend/src/features/applications
Remove-Item -Recurse -Force frontend/src/features/interviews
Remove-Item -Recurse -Force frontend/src/features/resumeVariants
```

- [ ] **Step 4: Delete V1 generated API directories**

```powershell
Remove-Item -Recurse -Force frontend/src/lib/api/job-leads
Remove-Item -Recurse -Force frontend/src/lib/api/applications
Remove-Item -Recurse -Force frontend/src/lib/api/interviews
Remove-Item -Recurse -Force frontend/src/lib/api/resume-variants
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(frontend): delete V1 pages, features, and API dirs; install @dnd-kit/sortable"
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
- Produces: `<JobCard job={JobDto} onClick={() => void} />` — board card with company+title, priority, remote mode, salary, next action date

- [ ] **Step 1: Create JobCard**

```tsx
// frontend/src/features/jobs/JobCard.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{job.companyName}</p>
            <p className="font-medium text-sm leading-tight truncate">{job.title}</p>
          </div>
          <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', PRIORITY_COLOR[job.priority])}>
            {job.priority}
          </Badge>
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
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
  status: JobStatus;
  jobs: JobDto[];
  onJobClick: (id: number) => void;
}

export function BoardColumn({ status, jobs, onJobClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col w-64 shrink-0">
      <div className={cn('rounded-t-md border-t-2 px-2 py-1.5 bg-muted/50', COLUMN_COLORS[status] ?? '')}>
        <span className="font-medium text-sm">{status}</span>
        <span className="ml-2 text-xs text-muted-foreground">{jobs.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-b-md p-2 space-y-2 min-h-24 bg-muted/20 transition-colors',
          isOver && 'bg-muted/50',
        )}
      >
        <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map(job => (
            <JobCard key={job.id} job={job} onClick={() => onJobClick(job.id)} />
          ))}
        </SortableContext>
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

const ACTIVE_STATUSES: JobStatus[] = ['Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered'];
const CLOSED_STATUSES: JobStatus[] = ['Rejected', 'Ghosted', 'Withdrawn', 'Archived'];

interface Props {
  jobs: JobDto[];
  onJobClick: (id: number) => void;
}

export function JobsBoard({ jobs, onJobClick }: Props) {
  const [showClosed, setShowClosed] = useState(false);

  const visibleStatuses = showClosed
    ? [...ACTIVE_STATUSES, ...CLOSED_STATUSES]
    : ACTIVE_STATUSES;

  const byStatus = (status: JobStatus) => jobs.filter(j => j.status === status);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowClosed(v => !v)}
          className="text-xs"
        >
          {showClosed ? 'Hide closed' : 'Show closed'}
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {visibleStatuses.map(status => (
          <BoardColumn
            key={status}
            status={status}
            jobs={byStatus(status)}
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
import type { JobStatus } from '@/lib/api/model';

export interface JobFilters {
  search: string;
  status: JobStatus | '';
}

interface Props {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
}

const STATUSES: JobStatus[] = [
  'Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered',
  'Rejected', 'Ghosted', 'Withdrawn', 'Archived',
];

export function JobFilterBar({ filters, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Search jobs..."
        value={filters.search}
        onChange={e => onChange({ ...filters, search: e.target.value })}
        className="h-8 w-64"
      />
      <Select
        value={filters.status}
        onValueChange={value => onChange({ ...filters, status: value as JobStatus | '' })}
      >
        <SelectTrigger className="h-8 w-36">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All statuses</SelectItem>
          {STATUSES.map(s => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
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
import { useGetApiCompanies } from '@/lib/api/companies/companies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { JobSource } from '@/lib/api/model';

const schema = z.object({
  companyId: z.number({ required_error: 'Company required' }),
  title: z.string().min(1, 'Title required').max(300),
  source: z.string().min(1) as z.ZodType<JobSource>,
  sourceUrl: z.string().url().optional().or(z.literal('')),
  priority: z.enum(['Low', 'Medium', 'High']),
});

type FormValues = z.infer<typeof schema>;

const SOURCES: JobSource[] = ['LinkedIn', 'Finn', 'Referral', 'CompanySite', 'Recruiter', 'Other'];

export function JobQuickAdd() {
  const [open, setOpen] = useState(false);
  const { create } = useJobMutations();
  const { data: companies } = useGetApiCompanies();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'Medium', source: 'LinkedIn' },
  });

  const onSubmit = async (values: FormValues) => {
    await create.mutateAsync({
      data: {
        companyId: values.companyId,
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
          <Field label="Company" error={form.formState.errors.companyId?.message}>
            <Select onValueChange={v => form.setValue('companyId', parseInt(v))}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {companies?.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
  usePostApiFollowUpTasksIdComplete,
  usePostApiFollowUpTasksIdSkip,
  getGetApiJobsIdQueryKey,
  useGetApiFollowUpTasks,
} from '@/lib/api/jobs/jobs';
import type { JobDetailDto } from '@/lib/api/model';
import { FollowUpForm } from './FollowUpForm';

interface Props { job: JobDetailDto }

export function FollowUpsTab({ job }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetApiJobsIdQueryKey(job.id) });

  const { data: followUps } = useGetApiFollowUpTasks({ jobId: job.id });
  const add = usePostApiJobsIdFollowUps({ mutation: { onSuccess: () => { invalidate(); setAdding(false); }, onError: () => toast.error('Failed') } });
  const complete = usePostApiFollowUpTasksIdComplete({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });
  const skip = usePostApiFollowUpTasksIdSkip({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });

  const STATUS_COLOR = { Pending: 'bg-yellow-100 text-yellow-800', Completed: 'bg-green-100 text-green-800', Skipped: 'bg-slate-100' };

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
import { JobFilterBar, type JobFilters } from '@/features/jobs/JobFilterBar';
import { JobQuickAdd } from '@/features/jobs/JobQuickAdd';
import { JobDetailDrawer } from '@/features/jobs/JobDetailDrawer';
import type { JobDto } from '@/lib/api/model';

export default function JobsPage() {
  const [filters, setFilters] = useState<JobFilters>({ search: '', status: '' });
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const { data: jobs = [], isLoading } = useGetApiJobs(
    filters.status ? { statuses: [filters.status] } : undefined
  );

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Jobs</h1>
        <div className="flex items-center gap-3">
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
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
          ) : (
            <JobsBoard jobs={filtered} onJobClick={setSelectedJobId} />
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
- Consumes: `@dnd-kit/core` `DndContext`, `DragOverlay`; `@dnd-kit/sortable` `useSortable`
- Produces: drag-to-column triggers `transition_job`; optimistic card move + rollback on error

- [ ] **Step 1: Add useSortable to JobCard**

Wrap the card with `useSortable`:

```tsx
// Modify frontend/src/features/jobs/JobCard.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Add to Props interface:
// draggable?: boolean   (when true, apply sortable transforms)

export function JobCard({ job, onClick, isDragging }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition: dndTransition,
    isDragging: isSortableDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: dndTransition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none',
        (isDragging || isSortableDragging) && 'opacity-40',
      )}
      onClick={onClick}
    >
      {/* ... existing card content unchanged ... */}
    </Card>
  );
}
```

- [ ] **Step 2: Wrap JobsBoard with DndContext**

```tsx
// Modify frontend/src/features/jobs/JobsBoard.tsx
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, closestCenter } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { useJobMutations } from './useJobMutations';
import { getGetApiJobsQueryKey } from '@/lib/api/jobs/jobs';
import type { JobDto, JobStatus } from '@/lib/api/model';
import { useState } from 'react';

// Inside JobsBoard component, add:
const [activeJob, setActiveJob] = useState<JobDto | null>(null);
const qc = useQueryClient();
const { transition } = useJobMutations();

const handleDragStart = ({ active }: DragStartEvent) => {
  setActiveJob(jobs.find(j => j.id === active.id) ?? null);
};

const handleDragEnd = ({ active, over }: DragEndEvent) => {
  setActiveJob(null);
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
    {
      onError: () => {
        qc.setQueryData(getGetApiJobsQueryKey(), prevJobs);
      },
    }
  );
};

// Wrap board columns in:
return (
  <DndContext
    collisionDetection={closestCenter}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  >
    <div className="space-y-2">
      {/* ... existing toggle button ... */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {visibleStatuses.map(status => (
          <BoardColumn key={status} status={status} jobs={byStatus(status)} onJobClick={onJobClick} />
        ))}
      </div>
    </div>
    <DragOverlay>
      {activeJob && <JobCard job={activeJob} onClick={() => {}} isDragging />}
    </DragOverlay>
  </DndContext>
);
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

- [ ] **Step 1: Update DashboardPage to use V2 summary**

Replace old `useGetApiDashboardSummary` consumption with V2 shape. The `DashboardSummaryDto` from V2 has `activeJobsByStatus`, `followUpsDueToday`, `overdueFollowUps`, `upcomingActivities`, `staleJobs`, `offerDeadlines`, `daysUntilSearchDeadline`.

Update DashboardPage to show:
- Active jobs count per status (from `activeJobsByStatus`)
- `followUpsDueToday` + `overdueFollowUps` count cards
- `upcomingActivities` list
- `staleJobs` list
- `offerDeadlines` list

Remove any references to old V1 DTOs (`ApplicationDto`, `JobLeadDto`, `InterviewDto`).

- [ ] **Step 2: Update TasksPage to use V2 follow-ups**

```tsx
// frontend/src/pages/TasksPage.tsx — key changes:
import { useGetApiFollowUpTasks } from '@/lib/api/follow-up-tasks/follow-up-tasks';
// Use: const { data: tasks } = useGetApiFollowUpTasks()
// Remove: any references to old application/job-lead data
// Show: task title, job link (job.title), due date, status, complete/skip buttons
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/pages/TasksPage.tsx
git commit -m "feat(frontend): rebuild Dashboard and Tasks pages on V2 data model"
```

---

### Task 38: Phase 4 quality gate

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
