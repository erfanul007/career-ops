import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useAddJobAttachment,
  useUpdateJobAttachment,
  useDeleteJobAttachment,
  getGetJobQueryKey,
} from '@/lib/api/jobs/jobs';
import type { JobDetailDto } from '@/lib/api/model';
import { AttachmentForm } from './AttachmentForm';

interface Props { job: JobDetailDto }

export function AttachmentsTab({ job }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const jobId = job.id as number;
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });

  const add = useAddJobAttachment({ mutation: { onSuccess: () => { invalidate(); setAdding(false); }, onError: () => toast.error('Failed') } });
  const update = useUpdateJobAttachment({ mutation: { onSuccess: () => { invalidate(); setEditing(null); }, onError: () => toast.error('Failed') } });
  const remove = useDeleteJobAttachment({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });

  return (
    <div className="space-y-2 py-2">
      {job.attachments?.map(a => (
        <div key={a.id as number} className="border rounded-md p-3">
          {editing === (a.id as number) ? (
            <AttachmentForm
              attachment={a}
              onSave={async vals => update.mutate({ id: jobId, attachmentId: a.id as number, data: {
                type: vals.type,
                title: vals.title,
                fileName: vals.fileName || null,
                url: vals.url || null,
                notes: vals.notes || null,
              } })}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.type}
                  {a.url && <> · <a href={a.url} target="_blank" rel="noopener" className="underline">Link</a></>}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="xs" variant="ghost" onClick={() => setEditing(a.id as number)}>Edit</Button>
                <Button
                  size="xs"
                  variant="ghost"
                  aria-label={`Delete ${a.title}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate({ id: jobId, attachmentId: a.id as number })}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
      {adding ? (
        <div className="border rounded-md p-3">
          <AttachmentForm onSave={async vals => add.mutate({ id: jobId, data: {
            type: vals.type,
            title: vals.title,
            fileName: vals.fileName || null,
            url: vals.url || null,
            notes: vals.notes || null,
          } })} onCancel={() => setAdding(false)} />
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>+ Add attachment</Button>
      )}
    </div>
  );
}
