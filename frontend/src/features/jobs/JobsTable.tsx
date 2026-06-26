import { Link } from 'react-router';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { JobStatusDropdown } from './JobStatusDropdown';
import type { JobDto } from '@/lib/api/model';

const PRIORITY_COLOR = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-red-100 text-red-700',
} as const;

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
          <TableHead>Salary</TableHead>
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
                <Badge className={PRIORITY_COLOR[job.priority]}>{job.priority}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {[job.city, job.country].filter(Boolean).join(', ')}
                {job.remoteMode !== 'OnSite' && ` · ${job.remoteMode}`}
              </TableCell>
              <TableCell className="text-sm">
                {job.salaryMin
                  ? `${job.salaryCurrency ?? ''} ${(job.salaryMin as number).toLocaleString()}${job.salaryMax ? `–${(job.salaryMax as number).toLocaleString()}` : '+'}`
                  : '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {job.appliedAtUtc ? new Date(job.appliedAtUtc).toLocaleDateString() : '—'}
              </TableCell>
              <TableCell className={`text-sm ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                {job.nextActionAtUtc ? new Date(job.nextActionAtUtc).toLocaleDateString() : '—'}
                {isOverdue && ' ⚠'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
