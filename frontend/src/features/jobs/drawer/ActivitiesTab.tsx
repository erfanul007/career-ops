import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useAddJobActivity,
  useUpdateJobActivity,
  useDeleteJobActivity,
  useCompleteJobActivity,
  getGetJobQueryKey,
} from '@/lib/api/jobs/jobs';
import type { JobDetailDto, JobActivityOutcome } from '@/lib/api/model';
import { ActivityForm } from './ActivityForm';

const OUTCOME_COLOR: Record<JobActivityOutcome, string> = {
  Unknown: 'bg-slate-100',
  Waiting: 'bg-yellow-100 text-yellow-800',
  Passed: 'bg-green-100 text-green-800',
  Failed: 'bg-red-100 text-red-800',
};

interface Props { job: JobDetailDto }

export function ActivitiesTab({ job }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const jobId = job.id as number;
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });

  const add = useAddJobActivity({ mutation: { onSuccess: () => { invalidate(); setAdding(false); }, onError: () => toast.error('Failed') } });
  const update = useUpdateJobActivity({ mutation: { onSuccess: () => { invalidate(); setEditing(null); }, onError: () => toast.error('Failed') } });
  const remove = useDeleteJobActivity({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });
  const complete = useCompleteJobActivity({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });

  return (
    <div className="space-y-3 py-2">
      {job.activities?.map(a => (
        <div key={a.id as number} className="border rounded-md p-3 space-y-1">
          {editing === (a.id as number) ? (
            <ActivityForm
              jobId={jobId}
              activity={a}
              onSave={async vals => update.mutate({ id: jobId, activityId: a.id as number, data: {
                label: vals.label,
                type: vals.type,
                status: vals.status,
                scheduledAtUtc: vals.scheduledAtUtc || null,
                durationMinutes: null,
                contactName: vals.contactName || null,
                contactRole: null,
                meetingUrl: vals.meetingUrl || null,
                prepNotes: vals.prepNotes || null,
                notes: null,
              }})}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-medium text-sm">{a.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{a.type}</span>
                </div>
                <Badge className={OUTCOME_COLOR[a.outcome]}>{a.outcome}</Badge>
              </div>
              {a.scheduledAtUtc && (
                <p className="text-xs text-muted-foreground">{new Date(a.scheduledAtUtc).toLocaleString()}</p>
              )}
              {a.feedback && <p className="text-sm text-muted-foreground">{a.feedback}</p>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditing(a.id as number)}>Edit</Button>
                {a.status !== 'Completed' && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs"
                    onClick={() => complete.mutate({ id: jobId, activityId: a.id as number, data: { outcome: 'Passed', feedback: null, notes: null, createFollowUp: false } })}>
                    Complete
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 text-xs text-red-500"
                  onClick={() => remove.mutate({ id: jobId, activityId: a.id as number })}>
                  Delete
                </Button>
              </div>
            </>
          )}
        </div>
      ))}

      {adding ? (
        <div className="border rounded-md p-3">
          <ActivityForm
            jobId={jobId}
            onSave={async vals => add.mutate({ id: jobId, data: {
              label: vals.label,
              type: vals.type,
              status: vals.status,
              scheduledAtUtc: vals.scheduledAtUtc || null,
              durationMinutes: null,
              contactName: vals.contactName || null,
              contactRole: null,
              meetingUrl: vals.meetingUrl || null,
              prepNotes: vals.prepNotes || null,
              notes: null,
            }})}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ Add activity</Button>
      )}
    </div>
  );
}
