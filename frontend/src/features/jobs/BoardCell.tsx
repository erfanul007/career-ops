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
