import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobMutations } from './useJobMutations';
import type { JobStatus } from '@/lib/api/model';

const ALL_STATUSES: JobStatus[] = [
  'Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered',
  'Rejected', 'Ghosted', 'Withdrawn', 'Archived',
];

const STATUS_COLORS: Record<JobStatus, string> = {
  Discovered: 'text-slate-500',
  Interested: 'text-blue-500',
  Applied: 'text-indigo-500',
  Interviewing: 'text-violet-500',
  Offered: 'text-green-600',
  Rejected: 'text-red-500',
  Ghosted: 'text-orange-400',
  Withdrawn: 'text-yellow-600',
  Archived: 'text-gray-400',
};

interface Props {
  jobId: number;
  currentStatus: JobStatus;
}

export function JobStatusDropdown({ jobId, currentStatus }: Props) {
  const { transition } = useJobMutations();

  const handleChange = (value: string) => {
    const toStatus = value as JobStatus;
    if (toStatus === currentStatus) return;
    transition.mutate({ id: jobId, data: { toStatus, notes: null } });
  };

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger className="w-36 h-7 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_STATUSES.map(s => (
          <SelectItem key={s} value={s}>
            <span className={STATUS_COLORS[s]}>{s}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
