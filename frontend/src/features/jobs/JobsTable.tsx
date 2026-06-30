import { Link } from 'react-router';
import { TriangleAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { JobStatusDropdown } from './JobStatusDropdown';
import { cn } from '@/lib/utils';
import { formatDate, formatSalary } from '@/lib/format';
import type { JobDto, Priority } from '@/lib/api/model';

const PRIORITY_VARIANT: Record<Priority, 'secondary' | 'outline' | 'destructive'> = {
  Low: 'outline',
  Medium: 'secondary',
  High: 'destructive',
};

interface Props {
  jobs: JobDto[];
  onJobClick: (id: number) => void;
}

export function JobsTable({ jobs, onJobClick }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="text-right">Salary</TableHead>
          <TableHead>Applied</TableHead>
          <TableHead>Next action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map(job => {
          const isOverdue = job.nextActionAtUtc && new Date(job.nextActionAtUtc) < new Date();
          return (
            <TableRow
              key={job.id as number}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onJobClick(job.id as number)}
            >
              <TableCell onClick={e => e.stopPropagation()}>
                <Link
                  to={`/jobs/${job.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  JOB-{job.id}
                </Link>
              </TableCell>
              <TableCell className="font-medium">{job.companyName}</TableCell>
              <TableCell>{job.title}</TableCell>
              <TableCell onClick={e => e.stopPropagation()}>
                <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} />
              </TableCell>
              <TableCell>
                <Badge variant={PRIORITY_VARIANT[job.priority]}>{job.priority}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {[job.city, job.country].filter(Boolean).join(', ')}
                {job.remoteMode !== 'OnSite' && ` · ${job.remoteMode}`}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) ?? '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(job.appliedAtUtc) ?? '—'}
              </TableCell>
              <TableCell
                data-overdue={isOverdue || undefined}
                className={cn('text-sm', isOverdue ? 'text-destructive' : 'text-muted-foreground')}
              >
                <span className="inline-flex items-center gap-1">
                  {isOverdue && <TriangleAlert aria-hidden className="size-3.5 shrink-0" />}
                  {formatDate(job.nextActionAtUtc) ?? '—'}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
