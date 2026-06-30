import type { KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MapPin, CalendarClock, TriangleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { JobStatusDropdown } from './JobStatusDropdown';
import { isOverdue, formatRelativeDate, formatLocation, getPriorityPresentation } from './jobPresentation';
import type { JobDto } from '@/lib/api/model';
import { cn } from '@/lib/utils';

interface Props {
  job: JobDto;
  onClick: () => void;
  isDragging?: boolean;
}

export function JobCard({ job, onClick, isDragging }: Props) {
  const overdue = isOverdue(job.nextActionAtUtc);
  const nextRelative = formatRelativeDate(job.nextActionAtUtc);
  const location = formatLocation(job);
  const priority = getPriorityPresentation(job.priority);
  const showMeta = Boolean(location) || job.remoteMode !== 'OnSite';

  const {
    attributes, listeners, setNodeRef, transform, isDragging: isBeingDragged,
  } = useDraggable({ id: job.id });

  const style = { transform: transform ? CSS.Translate.toString(transform) : undefined };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`${job.companyName} — ${job.title}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative cursor-pointer select-none rounded-lg py-0 shadow-sm transition-[box-shadow,background-color] duration-150 ease-out motion-reduce:transition-none',
        'hover:bg-muted/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        (isDragging || isBeingDragged) && 'opacity-40',
      )}
    >
      {priority.show && (
        <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-destructive" />
      )}
      <CardContent className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{job.companyName}</p>
          {priority.show && (
            <span className="shrink-0 text-[10px] font-medium text-destructive">{priority.label}</span>
          )}
        </div>

        <p className="line-clamp-2 text-sm font-medium leading-snug">{job.title}</p>

        {showMeta && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin aria-hidden className="size-3 shrink-0" />
            {location && <span className="truncate">{location}</span>}
            {location && job.remoteMode !== 'OnSite' && <span aria-hidden>·</span>}
            {job.remoteMode !== 'OnSite' && <span>{job.remoteMode}</span>}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {nextRelative ? (
            <span className={cn('flex items-center gap-1 text-[11px]', overdue ? 'text-destructive' : 'text-muted-foreground')}>
              {overdue
                ? <TriangleAlert aria-hidden className="size-3 shrink-0" />
                : <CalendarClock aria-hidden className="size-3 shrink-0" />}
              Next {nextRelative}
            </span>
          ) : (
            <span />
          )}
          <Link
            to={`/jobs/${job.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            className="shrink-0 font-mono text-[10px] text-muted-foreground hover:text-foreground hover:underline"
          >
            JOB-{job.id}
          </Link>
        </div>

        <div onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
          <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} variant="chip" />
        </div>
      </CardContent>
    </Card>
  );
}
