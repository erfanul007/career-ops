import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router';
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
        'cursor-pointer hover:shadow-md transition-shadow select-none',
        (isDragging || isBeingDragged) && 'opacity-40',
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <Link
            to={`/jobs/${job.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
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
            {job.salaryCurrency ?? ''} {(job.salaryMin as number).toLocaleString()}
            {job.salaryMax ? `–${(job.salaryMax as number).toLocaleString()}` : '+'}
          </p>
        )}

        {job.nextActionAtUtc && (
          <p className={cn('text-[11px]', isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
            Next: {new Date(job.nextActionAtUtc).toLocaleDateString()}
            {isOverdue && ' ⚠'}
          </p>
        )}

        <div onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
          <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} />
        </div>
      </CardContent>
    </Card>
  );
}
