import { useParams, Link } from 'react-router';
import { useJob } from '@/lib/api/jobs/hooks';
import { JobDetailContent } from '@/features/jobs/JobDetailContent';
import { JobStatusDropdown } from '@/features/jobs/JobStatusDropdown';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const { data: job, isLoading, isError } = useJob(jobId);

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    );
  }

  if (isError || !job) {
    return <PageShell><div className="text-sm text-destructive">Job not found.</div></PageShell>;
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-4">
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
    </PageShell>
  );
}
