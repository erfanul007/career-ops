import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobMutations } from './useJobMutations';
import { getStatusPresentation } from './jobPresentation';
import { cn } from '@/lib/utils';
import type { JobStatus } from '@/lib/api/model';

const ALL_STATUSES: JobStatus[] = [
  'Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered',
  'Rejected', 'Ghosted', 'Withdrawn', 'Archived',
];

interface Props {
  jobId: number;
  currentStatus: JobStatus;
  variant?: 'default' | 'chip';
}

export function JobStatusDropdown({ jobId, currentStatus, variant = 'default' }: Props) {
  const { transition } = useJobMutations();

  const handleChange = (value: string) => {
    const toStatus = value as JobStatus;
    if (toStatus === currentStatus) return;
    transition.mutate({ id: jobId, data: { toStatus, notes: null } });
  };

  const current = getStatusPresentation(currentStatus);

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className={cn(
          'text-xs transition-colors motion-reduce:transition-none',
          variant === 'chip'
            ? 'h-6 w-fit gap-1 border-transparent bg-transparent px-1.5 text-muted-foreground hover:bg-muted'
            : 'w-40',
        )}
      >
        {variant === 'chip' ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={cn('size-2 rounded-full', current.dotClassName)} />
            {current.label}
          </span>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent position="popper">
        {ALL_STATUSES.map(s => {
          const p = getStatusPresentation(s);
          return (
            <SelectItem key={s} value={s}>
              <span className="flex items-center gap-2">
                <span aria-hidden className={cn('size-2 rounded-full', p.dotClassName)} />
                {s}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
