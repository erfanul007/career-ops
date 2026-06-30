import type { KeyboardEvent, PointerEvent, MouseEvent } from 'react';
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

// Interactive controls inside the card (status chip, JOB link) carry
// data-card-interactive. The card guards its own open/drag/keyboard handlers
// on this marker so a click or key press on those controls never opens the
// drawer or starts a drag — robust regardless of event-propagation timing
// between dnd-kit's pointer sensor and Radix.
function fromInteractive(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest('[data-card-interactive]') !== null;
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

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (fromInteractive(e.target)) return;
    listeners?.onPointerDown?.(e);
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (fromInteractive(e.target)) return;
    onClick();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (fromInteractive(e.target)) return;
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
      onPointerDown={handlePointerDown}
      role="button"
      tabIndex={0}
      aria-label={`${job.companyName} — ${job.title}`}
      onClick={handleClick}
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
            data-card-interactive
            to={`/jobs/${job.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 font-mono text-[10px] text-muted-foreground hover:text-foreground hover:underline"
          >
            JOB-{job.id}
          </Link>
        </div>

        <div data-card-interactive>
          <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} variant="chip" />
        </div>
      </CardContent>
    </Card>
  );
}
