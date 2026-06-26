import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetJob } from '@/lib/api/jobs/jobs';
import { JobStatusDropdown } from './JobStatusDropdown';
import { JobDetailContent } from './JobDetailContent';
import type { JobDetailDto } from '@/lib/api/model';

interface Props {
  jobId: number | null;
  onClose: () => void;
}

export function JobDetailDrawer({ jobId, onClose }: Props) {
  const { data: response, isLoading } = useGetJob(jobId ?? 0, {
    query: { enabled: jobId !== null },
  });
  const job = response?.data as unknown as JobDetailDto | undefined;

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
