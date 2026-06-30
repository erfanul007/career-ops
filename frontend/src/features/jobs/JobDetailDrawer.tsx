import { useState } from 'react';
import { Link } from 'react-router';
import { ExternalLink, Link2, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useJob } from '@/lib/api/jobs/hooks';
import { JobStatusDropdown } from './JobStatusDropdown';
import { JobPriorityDropdown } from './JobPriorityDropdown';
import { JobDetailContent } from './JobDetailContent';
import { DeleteJobDialog } from './DeleteJobDialog';
import { isOverdue, formatRelativeDate, formatShortDate } from './jobPresentation';
import { cn } from '@/lib/utils';

interface Props {
  jobId: number | null;
  onClose: () => void;
}

export function JobDetailDrawer({ jobId, onClose }: Props) {
  const { data: job, isLoading } = useJob(jobId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Sheet open={jobId !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent
        className="flex w-[min(1100px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1100px,calc(100vw-2rem))]"
      >
        {isLoading || !job ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-40" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          </div>
        ) : (
          <>
            <SheetHeader className="shrink-0 gap-1.5 border-b p-5 pr-12">
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <Link
                  to={`/jobs/${job.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono hover:text-foreground hover:underline"
                >
                  JOB-{job.id}<ExternalLink aria-hidden className="size-3" />
                </Link>
                {job.sourceUrl && (
                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                  >
                    <Link2 aria-hidden className="size-3" />Source
                  </a>
                )}
              </div>

              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="text-lg leading-snug">{job.title}</SheetTitle>
                <div className="flex shrink-0 items-center gap-2">
                  <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} />
                  <JobPriorityDropdown jobId={job.id as number} currentPriority={job.priority} />
                  <Button variant="ghost" size="icon" aria-label="Delete job" onClick={() => setConfirmDelete(true)}>
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{job.companyName}</p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
                {job.fitScore != null && <span>Fit {job.fitScore}/10</span>}
                {job.nextActionAtUtc && (
                  <span className={cn(isOverdue(job.nextActionAtUtc) && 'text-destructive')}>
                    Next {formatRelativeDate(job.nextActionAtUtc)}
                  </span>
                )}
                {job.deadlineAtUtc && <span>Deadline {formatShortDate(job.deadlineAtUtc)}</span>}
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <JobDetailContent job={job} />
            </div>
            {job && (
              <DeleteJobDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                jobId={job.id as number}
                jobLabel={`JOB-${job.id} — ${job.companyName}`}
                onDeleted={onClose}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
