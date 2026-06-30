import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useAddJobActivity, useUpdateJobActivity, useDeleteJobActivity, useCompleteJobActivity, getGetJobQueryKey,
} from '@/lib/api/jobs/jobs';
import type { JobDetailDto, JobActivityOutcome } from '@/lib/api/model';
import { ActivityForm } from './ActivityForm';
import { formatShortDate } from '../jobPresentation';

const OUTCOME_COLOR: Record<JobActivityOutcome, string> = {
  Unknown: 'bg-muted text-muted-foreground',
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
    <div className="space-y-2 py-2">
      {job.activities?.map(a => (
        <div key={a.id as number} className="rounded-md border p-3">
          {editing === (a.id as number) ? (
            <ActivityForm
              activity={a}
              onSave={async vals => update.mutate({ id: jobId, activityId: a.id as number, data: {
                label: vals.label, type: vals.type, status: vals.status,
                scheduledAtUtc: vals.scheduledAtUtc || null, durationMinutes: null,
                contactName: vals.contactName || null, contactRole: null,
                meetingUrl: vals.meetingUrl || null, prepNotes: vals.prepNotes || null, notes: null,
              } })}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-sm font-medium">{a.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{a.type}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant="secondary" className={OUTCOME_COLOR[a.outcome]}>{a.outcome}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon-xs" variant="ghost" aria-label="Activity actions">
                        <MoreVertical aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(a.id as number)}>Edit</DropdownMenuItem>
                      {a.status !== 'Completed' && (
                        <DropdownMenuItem
                          onClick={() => complete.mutate({ id: jobId, activityId: a.id as number, data: { outcome: 'Passed', feedback: null, notes: null, createFollowUp: false } })}
                        >
                          Mark complete
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => remove.mutate({ id: jobId, activityId: a.id as number })}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {a.scheduledAtUtc && (
                <p className="text-xs text-muted-foreground">{formatShortDate(a.scheduledAtUtc)}</p>
              )}
              {a.feedback && <p className="text-sm text-muted-foreground">{a.feedback}</p>}
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <div className="rounded-md border p-3">
          <ActivityForm
            onSave={async vals => add.mutate({ id: jobId, data: {
              label: vals.label, type: vals.type, status: vals.status,
              scheduledAtUtc: vals.scheduledAtUtc || null, durationMinutes: null,
              contactName: vals.contactName || null, contactRole: null,
              meetingUrl: vals.meetingUrl || null, prepNotes: vals.prepNotes || null, notes: null,
            } })}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ Add activity</Button>
      )}
    </div>
  );
}
