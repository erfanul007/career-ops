import type { JobDto, JobStatus } from '@/lib/api/model';
import { JobCard } from './JobCard';
import { useDroppable } from '@dnd-kit/core';
import { getStatusPresentation } from './jobPresentation';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  jobs: JobDto[];
  onJobClick: (id: number) => void;
  isDragActive?: boolean;
}

export function BoardColumn({ label, jobs, onJobClick, isDragActive }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: label });
  // Single source of column accent (status grouping); tolerant of non-status labels (country/company).
  const accentClassName = getStatusPresentation(label as JobStatus).accentClassName;

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className={cn(
        'sticky top-0 z-10 flex items-center justify-between rounded-t-md border-t-2 bg-muted/60 px-2.5 py-1.5 backdrop-blur',
        accentClassName,
      )}>
        <span className="text-sm font-medium">{label}</span>
        <span className="rounded-full bg-muted-foreground/10 px-1.5 text-[11px] tabular-nums text-muted-foreground">
          {jobs.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 overflow-y-auto rounded-b-md bg-muted/20 p-2 transition-colors duration-150 motion-reduce:transition-none',
          isOver && 'bg-muted/50 ring-1 ring-ring/40',
        )}
      >
        {jobs.length === 0 && (
          isDragActive ? (
            <div className="rounded-md border-2 border-dashed border-ring/40 py-6 text-center text-xs text-muted-foreground">
              Drop here
            </div>
          ) : (
            <p className="px-1 py-4 text-center text-xs text-muted-foreground/70">No jobs in {label}.</p>
          )
        )}
        {jobs.map(job => (
          <JobCard key={job.id as number} job={job} onClick={() => onJobClick(job.id as number)} />
        ))}
      </div>
    </div>
  );
}
