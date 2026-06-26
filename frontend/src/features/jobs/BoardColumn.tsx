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
  label: string;
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
          <JobCard key={job.id as number} job={job} onClick={() => onJobClick(job.id as number)} />
        ))}
      </div>
    </div>
  );
}
