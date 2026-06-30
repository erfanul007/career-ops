import { useState } from 'react';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { BoardColumn } from './BoardColumn';
import { JobCardPreview } from './JobCardPreview';
import { useJobMutations } from './useJobMutations';
import { getListJobsQueryKey } from '@/lib/api/jobs/jobs';
import type { JobDto, JobStatus, ListJobsParams } from '@/lib/api/model';

export type GroupBy = 'status' | 'country' | 'company';

const ACTIVE_STATUSES: JobStatus[] = ['Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered'];
const CLOSED_STATUSES: JobStatus[] = ['Rejected', 'Ghosted', 'Withdrawn', 'Archived'];

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
  return [...ACTIVE_STATUSES, ...CLOSED_STATUSES].map(s => ({
    key: s, label: s, jobs: jobs.filter(j => j.status === s),
  }));
}

export function JobsBoard({ jobs, groupBy, listParams, onJobClick }: Props) {
  const [showClosed, setShowClosed] = useState(false);
  const [activeJob, setActiveJob] = useState<JobDto | null>(null);
  const qc = useQueryClient();
  const { transition } = useJobMutations();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <p className="text-sm">No jobs found.</p>
        <p className="text-xs">Add a job to get started.</p>
      </div>
    );
  }

  const allGroups = groupJobs(jobs, groupBy);
  const visibleGroups = groupBy === 'status' && !showClosed
    ? allGroups.filter(g => ACTIVE_STATUSES.includes(g.key as JobStatus))
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
          <Button variant="ghost" size="sm" onClick={() => setShowClosed(v => !v)} className="text-xs">
            {showClosed ? 'Hide closed' : 'Show closed'}
          </Button>
        </div>
      )}
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
        {visibleGroups.map(group => (
          <BoardColumn
            key={group.key}
            label={group.label}
            jobs={group.jobs}
            onJobClick={onJobClick}
            isDragActive={isDragActive}
          />
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
