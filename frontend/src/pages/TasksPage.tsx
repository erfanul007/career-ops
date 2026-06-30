import { useState } from 'react';
import { Link } from 'react-router';
import {
  useListFollowUpTasks,
  getListFollowUpTasksQueryKey,
  useCompleteFollowUpTask,
  useSkipFollowUpTask,
} from '@/lib/api/follow-up-tasks/follow-up-tasks';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FollowUpStatus } from '@/lib/api/model';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate } from '@/lib/format';

type DueFilter = 'all' | 'today' | 'overdue';

const STATUS_VARIANT: Record<FollowUpStatus, 'secondary' | 'outline'> = {
  Pending: 'secondary',
  Completed: 'outline',
  Skipped: 'outline',
};

export default function TasksPage() {
  const [due, setDue] = useState<DueFilter>('all');
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | undefined>(undefined);
  const qc = useQueryClient();

  const params = {
    due: due === 'all' ? undefined : due,
    status: statusFilter,
  };

  const { data: response, isLoading, isError } = useListFollowUpTasks(params);
  const tasks = response?.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: getListFollowUpTasksQueryKey() });

  const complete = useCompleteFollowUpTask({
    mutation: { onSuccess: invalidate, onError: () => toast.error('Failed to complete task') },
  });

  const skip = useSkipFollowUpTask({
    mutation: { onSuccess: invalidate, onError: () => toast.error('Failed to skip task') },
  });

  return (
    <PageShell>
      <PageHeader
        title="Tasks"
        actions={
          <>
            <Select value={due} onValueChange={v => setDue(v as DueFilter)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="today">Due today</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter ?? "all"} onValueChange={v => setStatusFilter(v === "all" ? undefined : v as FollowUpStatus)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {isError && <p className="text-sm text-destructive">Failed to load tasks.</p>}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No tasks found.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const isPending = task.status === 'Pending';
            const isOverdue = isPending && task.dueAtUtc && new Date(task.dueAtUtc) < new Date();
            return (
              <div key={task.id as number} className="flex items-start justify-between p-3 rounded-md border gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{task.title}</p>
                  {task.jobId && (
                    <Link
                      to={`/jobs/${task.jobId}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {task.jobTitle ?? `JOB-${task.jobId}`}
                    </Link>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={STATUS_VARIANT[task.status]} className="text-[10px]">
                      {task.status}
                    </Badge>
                    {task.dueAtUtc && (
                      <span className={`text-[11px] ${isOverdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                        {formatDate(task.dueAtUtc)}{isOverdue ? ' · overdue' : ''}
                      </span>
                    )}
                  </div>
                </div>
                {isPending && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => complete.mutate({ id: task.id as number })}
                      disabled={complete.isPending}
                    >
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => skip.mutate({ id: task.id as number })}
                      disabled={skip.isPending}
                    >
                      Skip
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
