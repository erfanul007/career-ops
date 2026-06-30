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
import { buildLanes, laneKeyOf } from './jobGrouping';
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
