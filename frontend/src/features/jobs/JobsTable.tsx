import { Fragment } from 'react';
import { Link } from 'react-router';
import { ChevronRight, TriangleAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { JobStatusDropdown } from './JobStatusDropdown';
import { JobPriorityDropdown } from './JobPriorityDropdown';
import { buildLanes } from './jobGrouping';
import { useCollapsedLanes } from './useCollapsedLanes';
import { cn } from '@/lib/utils';
import { formatDate, formatSalary } from '@/lib/format';
import type { JobDto } from '@/lib/api/model';
import type { GroupBy } from './JobsBoard';

interface Props {
  jobs: JobDto[];
  groupBy: GroupBy;
  onJobClick: (id: number) => void;
}

function JobRow({ job, onJobClick }: { job: JobDto; onJobClick: (id: number) => void }) {
  const isOverdue = Boolean(job.nextActionAtUtc && new Date(job.nextActionAtUtc) < new Date());
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onJobClick(job.id as number)}
    >
      <TableCell onClick={e => e.stopPropagation()}>
        <Link to={`/jobs/${job.id}`} target="_blank" rel="noopener noreferrer"
          className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline">
          JOB-{job.id}
        </Link>
      </TableCell>
      <TableCell className="font-medium">{job.companyName}</TableCell>
      <TableCell>{job.title}</TableCell>
      <TableCell onClick={e => e.stopPropagation()}>
        <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} />
      </TableCell>
      <TableCell onClick={e => e.stopPropagation()}>
        <JobPriorityDropdown jobId={job.id as number} currentPriority={job.priority} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {[job.city, job.country].filter(Boolean).join(', ')}
        {job.remoteMode !== 'OnSite' && ` · ${job.remoteMode}`}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums">
        {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) ?? '—'}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatDate(job.appliedAtUtc) ?? '—'}</TableCell>
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
}

export function JobsTable({ jobs, groupBy, onJobClick }: Props) {
  const { isCollapsed, toggle } = useCollapsedLanes(groupBy);
  const lanes = buildLanes(jobs, groupBy);
  const grouped = groupBy !== 'status';
  const COLS = 9;

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
        {lanes.map(lane => {
          const collapsed = grouped && isCollapsed(lane.key);
          return (
            <Fragment key={lane.key}>
              {grouped && (
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={COLS} className="py-1.5">
                    <button
                      type="button"
                      onClick={() => toggle(lane.key)}
                      aria-expanded={!collapsed}
                      className="flex items-center gap-2 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ChevronRight aria-hidden className={cn('size-4 transition-transform motion-reduce:transition-none', !collapsed && 'rotate-90')} />
                      {lane.label}
                      <span className="rounded-full bg-muted-foreground/10 px-1.5 text-[11px] tabular-nums text-muted-foreground">
                        {lane.jobs.length}
                      </span>
                    </button>
                  </TableCell>
                </TableRow>
              )}
              {!collapsed && lane.jobs.map(job => <JobRow key={job.id as number} job={job} onJobClick={onJobClick} />)}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
