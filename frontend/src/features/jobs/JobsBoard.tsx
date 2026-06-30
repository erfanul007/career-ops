import { useState } from 'react';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { BoardColumn } from './BoardColumn';
import { JobCardPreview } from './JobCardPreview';
import { useJobMutations } from './useJobMutations';
import { getListJobsQueryKey } from '@/lib/api/jobs/jobs';
import type { JobDto, JobStatus, ListJobsParams } from '@/lib/api/model';

export type GroupBy = 'status' | 'country' | 'company' | 'priority';

const ACTIVE_STATUSES: JobStatus[] = ['Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered'];
const CLOSED_STATUSES: JobStatus[] = ['Rejected', 'Ghosted', 'Withdrawn', 'Archived'];
const ALL_STATUSES: JobStatus[] = [...ACTIVE_STATUSES, ...CLOSED_STATUSES];
const HIDDEN_STORAGE_KEY = 'careerops:jobs:hidden-status-columns';

// Which status columns are hidden. Persisted across reloads; defaults to the
// closed statuses so the board opens focused on the active pipeline.
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

function groupJobs(jobs: JobDto[], groupBy: GroupBy): { key: string; label: string; jobs: JobDto[] }[] {
  if (groupBy === 'country') {
    const keys = [...new Set(jobs.map(j => j.country ?? 'Unknown'))].sort();
    return keys.map(k => ({ key: k, label: k, jobs: jobs.filter(j => (j.country ?? 'Unknown') === k) }));
  }
  if (groupBy === 'company') {
    const keys = [...new Set(jobs.map(j => j.companyName))].sort();
    return keys.map(k => ({ key: k, label: k, jobs: jobs.filter(j => j.companyName === k) }));
  }
  return ALL_STATUSES.map(s => ({
    key: s, label: s, jobs: jobs.filter(j => j.status === s),
  }));
}

export function JobsBoard({ jobs, groupBy, listParams, onJobClick }: Props) {
  const [hiddenStatuses, setHiddenStatuses] = useState<JobStatus[]>(loadHiddenStatuses);
  const [activeJob, setActiveJob] = useState<JobDto | null>(null);
  const qc = useQueryClient();
  const { transition } = useJobMutations();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

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

  const allGroups = groupJobs(jobs, groupBy);
  const visibleGroups = groupBy === 'status'
    ? allGroups.filter(g => !hiddenStatuses.includes(g.key as JobStatus))
    : allGroups;

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveJob(jobs.find(j => j.id === active.id) ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveJob(null);
    if (groupBy !== 'status' || !over) return;

    const job = jobs.find(j => j.id === active.id);
    const toStatus = over.id as JobStatus;
    if (!job || job.status === toStatus) return;

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

  const columns = (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {groupBy === 'status' && (
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
      )}
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
        {visibleGroups.length === 0 ? (
          <p className="m-auto text-sm text-muted-foreground">
            All status columns are hidden. Use the Columns menu to show some.
          </p>
        ) : (
          visibleGroups.map(group => (
            <BoardColumn
              key={group.key}
              label={group.label}
              jobs={group.jobs}
              onJobClick={onJobClick}
              isDragActive={isDragActive}
            />
          ))
        )}
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
      {columns}
      <DragOverlay>
        {activeJob && (
          <div className="pointer-events-none rotate-[0.5deg] scale-[1.01] rounded-lg shadow-xl ring-1 ring-ring/40 transform-gpu">
            <JobCardPreview job={activeJob} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  ) : columns;
}
