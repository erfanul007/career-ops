import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useJob } from '@/lib/api/jobs/hooks';
import { JobStatusDropdown } from './JobStatusDropdown';
import { JobDetailContent } from './JobDetailContent';

interface Props {
  jobId: number | null;
  onClose: () => void;
}

export function JobDetailDrawer({ jobId, onClose }: Props) {
  const { data: job, isLoading } = useJob(jobId);

  return (
    <Sheet open={jobId !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto">
        {isLoading || !job ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="pb-2">
              <SheetTitle className="text-lg">{job.title}</SheetTitle>
              <p className="text-sm text-muted-foreground">{job.companyName}</p>
              <div className="pt-1">
                <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} />
              </div>
            </SheetHeader>
            <JobDetailContent job={job} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
