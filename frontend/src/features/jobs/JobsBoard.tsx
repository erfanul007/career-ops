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
