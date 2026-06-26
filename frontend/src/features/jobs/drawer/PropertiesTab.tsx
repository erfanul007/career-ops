import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useUpsertJobProperty,
  useDeleteJobProperty,
  getGetJobQueryKey,
} from '@/lib/api/jobs/jobs';
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
    <div className="space-y-2 py-2">
      <p className="text-xs text-muted-foreground">Agent notes and metadata.</p>
      {job.properties?.map(p => (
        <div key={p.id as number} className="flex items-center gap-2 text-sm">
          <span className="font-medium w-32 truncate">{p.key}</span>
          <span className="flex-1 text-muted-foreground truncate">{p.value}</span>
          <Button size="sm" variant="ghost" className="h-6 text-xs text-red-500"
            onClick={() => remove.mutate({ id: jobId, key: p.key })}>×</Button>
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Key" className="h-7 w-32" />
        <Input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="Value" className="h-7 flex-1" />
        <Button size="sm" className="h-7"
          disabled={!newKey}
          onClick={() => upsert.mutate({ id: jobId, key: newKey, data: { value: newVal, valueType: 'Text' } })}>
          Set
        </Button>
      </div>
    </div>
  );
}
