import { MapPin, CalendarClock, TriangleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { isOverdue, formatRelativeDate, formatLocation, getPriorityPresentation, getStatusPresentation } from './jobPresentation';
import type { JobDto } from '@/lib/api/model';
import { cn } from '@/lib/utils';

export function JobCardPreview({ job }: { job: JobDto }) {
  const overdue = isOverdue(job.nextActionAtUtc);
  const nextRelative = formatRelativeDate(job.nextActionAtUtc);
  const location = formatLocation(job);
  const priority = getPriorityPresentation(job.priority);
  const status = getStatusPresentation(job.status);
  const showMeta = Boolean(location) || job.remoteMode !== 'OnSite';

  return (
    <Card className="relative select-none rounded-lg py-0 shadow-sm">
      {priority.isHigh && (
        <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-destructive" />
      )}
      <CardContent className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{job.companyName}</p>
          {priority.isHigh && <span className="shrink-0 text-[10px] font-medium text-destructive">{priority.label}</span>}
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
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">JOB-{job.id}</span>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className={cn('size-2 rounded-full', status.dotClassName)} />
          {status.label}
        </p>
      </CardContent>
    </Card>
  );
}
