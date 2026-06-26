import { useParams, Link } from 'react-router';
import { useGetJob } from '@/lib/api/jobs/jobs';
import { JobDetailContent } from '@/features/jobs/JobDetailContent';
import { JobStatusDropdown } from '@/features/jobs/JobStatusDropdown';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import type { JobDetailDto } from '@/lib/api/model';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const { data: response, isLoading, isError } = useGetJob(jobId);
  const job = response?.data as unknown as JobDetailDto | undefined;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !job) {
    return <div className="p-6 text-sm text-destructive">Job not found.</div>;
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto">
      <Link
        to="/jobs"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </Link>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground font-mono mb-1">JOB-{job.id}</p>
          <h1 className="text-xl font-semibold">{job.title}</h1>
          <p className="text-sm text-muted-foreground">{job.companyName}</p>
        </div>
        <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} />
      </div>
      <JobDetailContent job={job} />
    </div>
  );
}
