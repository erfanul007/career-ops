import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCreateJobFollowUp, getGetJobQueryKey } from '@/lib/api/jobs/jobs';
import { useCompleteFollowUpTask, useSkipFollowUpTask } from '@/lib/api/follow-up-tasks/follow-up-tasks';
import type { JobDetailDto, FollowUpTaskDto } from '@/lib/api/model';
import { FollowUpForm } from './FollowUpForm';
import { isOverdue, formatRelativeDate } from '../jobPresentation';
import { cn } from '@/lib/utils';

interface Props { job: JobDetailDto }

function rowTone(f: FollowUpTaskDto): string {
  if (f.status !== 'Pending') return 'opacity-60';
  return isOverdue(f.dueAtUtc) ? 'text-destructive' : '';
}

export function NextActionsBlock({ job }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const jobId = job.id as number;
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });

  const add = useCreateJobFollowUp({ mutation: { onSuccess: () => { invalidate(); setAdding(false); }, onError: () => toast.error('Failed') } });
  const complete = useCompleteFollowUpTask({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });
  const skip = useSkipFollowUpTask({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });

  const followUps = job.followUps ?? [];

  return (
    <section className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">Next actions</h4>

      {followUps.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground/70">No follow-ups yet.</p>
      )}

      {followUps.map(f => {
        const overdue = f.status === 'Pending' && isOverdue(f.dueAtUtc);
        return (
          <div key={f.id as number} className="flex items-start justify-between gap-2 rounded-md border p-2.5">
            <div className={cn('min-w-0', rowTone(f))}>
              <p className="truncate text-sm font-medium">{f.title}</p>
              <p className="flex items-center gap-1 text-xs">
                {overdue && <TriangleAlert aria-hidden className="size-3 shrink-0" />}
                {overdue ? `Overdue · ${formatRelativeDate(f.dueAtUtc)}` : `Due ${formatRelativeDate(f.dueAtUtc)}`}
                {f.status !== 'Pending' && ` · ${f.status}`}
              </p>
            </div>
            {f.status === 'Pending' && (
              <div className="flex shrink-0 items-center gap-1">
                <Button size="xs" variant="ghost" onClick={() => complete.mutate({ id: f.id as number })}>Done</Button>
                <Button size="xs" variant="ghost" onClick={() => skip.mutate({ id: f.id as number })}>Skip</Button>
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="rounded-md border p-3">
          <FollowUpForm
            onSave={async vals => add.mutate({ id: jobId, data: { title: vals.title, dueAtUtc: vals.dueAtUtc, priority: vals.priority, description: vals.description ?? null, jobId, jobActivityId: null } })}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ Add follow-up</Button>
      )}
    </section>
  );
}
