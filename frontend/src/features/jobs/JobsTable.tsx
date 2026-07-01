import { Fragment } from 'react';
import { Link } from 'react-router';
import { ChevronRight, TriangleAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { JobStatusDropdown } from './JobStatusDropdown';
import { JobPriorityDropdown } from './JobPriorityDropdown';
import { JobActionsMenu } from './JobActionsMenu';
import { buildLanes } from './jobGrouping';
import { useCollapsedLanes } from './useCollapsedLanes';
import { TABLE_COLUMNS, type TableColumnKey } from './jobTableColumns';
import { cn } from '@/lib/utils';
import { formatDate, formatSalary } from '@/lib/format';
import type { JobDto } from '@/lib/api/model';
import type { GroupBy } from './jobFilters';

interface Props {
  jobs: JobDto[];
  groupBy: GroupBy;
  hiddenColumns?: TableColumnKey[];
  onJobClick: (id: number) => void;
}

function Cell({ column, job }: { column: TableColumnKey; job: JobDto }) {
  switch (column) {
    case 'id':
      return (
        <TableCell onClick={e => e.stopPropagation()}>
          <Link to={`/jobs/${job.id}`} target="_blank" rel="noopener noreferrer"
            className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline">
            JOB-{job.id}
          </Link>
        </TableCell>
      );
    case 'company':
      return <TableCell className="font-medium">{job.companyName}</TableCell>;
    case 'title':
      return <TableCell>{job.title}</TableCell>;
    case 'status':
      return (
        <TableCell onClick={e => e.stopPropagation()}>
          <JobStatusDropdown jobId={job.id as number} currentStatus={job.status} />
        </TableCell>
      );
    case 'priority':
      return (
        <TableCell onClick={e => e.stopPropagation()}>
          <JobPriorityDropdown jobId={job.id as number} currentPriority={job.priority} />
        </TableCell>
      );
    case 'location':
      return (
        <TableCell className="text-sm text-muted-foreground">
          {[job.city, job.country].filter(Boolean).join(', ')}
          {job.remoteMode !== 'OnSite' && ` · ${job.remoteMode}`}
        </TableCell>
      );
    case 'salary':
      return (
        <TableCell className="text-right text-sm tabular-nums">
          {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) ?? '—'}
        </TableCell>
      );
    case 'applied':
      return <TableCell className="text-sm text-muted-foreground">{formatDate(job.appliedAtUtc) ?? '—'}</TableCell>;
    case 'nextAction': {
      const isOverdue = Boolean(job.nextActionAtUtc && new Date(job.nextActionAtUtc) < new Date());
      return (
        <TableCell
          data-overdue={isOverdue || undefined}
          className={cn('text-sm', isOverdue ? 'text-destructive' : 'text-muted-foreground')}
        >
          <span className="inline-flex items-center gap-1">
            {isOverdue && <TriangleAlert aria-hidden className="size-3.5 shrink-0" />}
            {formatDate(job.nextActionAtUtc) ?? '—'}
          </span>
        </TableCell>
      );
    }
  }
}

function JobRow({ columns, job, onJobClick }: { columns: TableColumnKey[]; job: JobDto; onJobClick: (id: number) => void }) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => onJobClick(job.id as number)}>
      {columns.map(c => <Cell key={c} column={c} job={job} />)}
      <TableCell onClick={e => e.stopPropagation()} className="w-8">
        <JobActionsMenu jobId={job.id as number} jobLabel={`JOB-${job.id} — ${job.companyName}`} />
      </TableCell>
    </TableRow>
  );
}

export function JobsTable({ jobs, groupBy, hiddenColumns = [], onJobClick }: Props) {
  const { isCollapsed, toggle } = useCollapsedLanes(groupBy);
  const lanes = buildLanes(jobs, groupBy);
  const grouped = groupBy !== 'status';
  const columns = TABLE_COLUMNS.filter(c => !hiddenColumns.includes(c.key));
  const colSpan = columns.length + 1;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map(c => (
            <TableHead key={c.key} className={c.key === 'salary' ? 'text-right' : undefined}>{c.label}</TableHead>
          ))}
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {lanes.map(lane => {
          const collapsed = grouped && isCollapsed(lane.key);
          return (
            <Fragment key={lane.key}>
              {grouped && (
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={colSpan} className="py-1.5">
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
              {!collapsed && lane.jobs.map(job => <JobRow key={job.id as number} columns={columns.map(c => c.key)} job={job} onJobClick={onJobClick} />)}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
