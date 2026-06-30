import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUpsertJobProperty, useDeleteJobProperty, getGetJobQueryKey } from '@/lib/api/jobs/jobs';
import type { JobDetailDto } from '@/lib/api/model';

interface Props { job: JobDetailDto }

export function PropertiesTab({ job }: Props) {
  const qc = useQueryClient();
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const jobId = job.id as number;
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });

  const upsert = useUpsertJobProperty({ mutation: { onSuccess: () => { invalidate(); setNewKey(''); setNewVal(''); }, onError: () => toast.error('Failed') } });
  const remove = useDeleteJobProperty({ mutation: { onSuccess: invalidate, onError: () => toast.error('Failed') } });

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Agent notes and metadata.</p>
      <dl className="grid grid-cols-[8rem_1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
        {job.properties?.map(p => (
          <div key={p.id as number} className="contents">
            <dt className="truncate font-medium">{p.key}</dt>
            <dd className="truncate text-muted-foreground">{p.value}</dd>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={`Remove ${p.key}`}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => remove.mutate({ id: jobId, key: p.key })}
            >
              <X aria-hidden />
            </Button>
          </div>
        ))}
      </dl>
      <div className="flex gap-2 pt-1">
        <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Key" className="h-7 w-32" />
        <Input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="Value" className="h-7 flex-1" />
        <Button
          size="sm"
          className="h-7"
          disabled={!newKey}
          onClick={() => upsert.mutate({ id: jobId, key: newKey, data: { value: newVal, valueType: 'Text' } })}
        >
          Set
        </Button>
      </div>
    </div>
  );
}
