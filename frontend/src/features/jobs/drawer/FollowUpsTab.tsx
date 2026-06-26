import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useCreateJobFollowUp,
  getGetJobQueryKey,
} from '@/lib/api/jobs/jobs';
import {
  useCompleteFollowUpTask,
  useSkipFollowUpTask,
} from '@/lib/api/follow-up-tasks/follow-up-tasks';
import type { JobDetailDto, FollowUpStatus } from '@/lib/api/model';
import { FollowUpForm } from './FollowUpForm';

interface Props { job: JobDetailDto }

const STATUS_COLOR: Record<FollowUpStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Completed: 'bg-green-100 text-green-800',
  Skipped: 'bg-slate-100',
};

export function FollowUpsTab({ job }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const jobId = job.id as number;
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });

  const add = useCreateJobFollowUp({ mutation: { onSuccess: () => { invalidate(); setAdding(false); }, onError: () => toast.error('Failed') } });
  const complete = useCompleteFollowUpTask({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });
  const skip = useSkipFollowUpTask({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });

  return (
    <div className="space-y-2 py-2">
      {job.followUps?.map(f => (
        <div key={f.id as number} className="border rounded-md p-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{f.title}</p>
            <p className="text-xs text-muted-foreground">{new Date(f.dueAtUtc).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-1">
            <Badge className={STATUS_COLOR[f.status]}>{f.status}</Badge>
            {f.status === 'Pending' && (
              <>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => complete.mutate({ id: f.id as number })}>Done</Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => skip.mutate({ id: f.id as number })}>Skip</Button>
              </>
            )}
          </div>
        </div>
      ))}

      {adding ? (
        <div className="border rounded-md p-3">
          <FollowUpForm
            onSave={async vals => add.mutate({ id: jobId, data: { title: vals.title, dueAtUtc: vals.dueAtUtc, priority: vals.priority, description: vals.description ?? null, jobId, jobActivityId: null } })}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ Add follow-up</Button>
      )}
    </div>
  );
}
