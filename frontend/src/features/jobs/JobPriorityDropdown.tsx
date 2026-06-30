import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobMutations } from './useJobMutations';
import { getPriorityPresentation } from './jobPresentation';
import { cn } from '@/lib/utils';
import type { Priority } from '@/lib/api/model';

const ALL_PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];

interface Props {
  jobId: number;
  currentPriority: Priority;
  variant?: 'default' | 'chip';
}

export function JobPriorityDropdown({ jobId, currentPriority, variant = 'default' }: Props) {
  const { setPriority } = useJobMutations();

  const handleChange = (value: string) => {
    const toPriority = value as Priority;
    if (toPriority === currentPriority) return;
    setPriority.mutate({ id: jobId, data: { toPriority } });
  };

  const current = getPriorityPresentation(currentPriority);

  return (
    <Select value={currentPriority} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className={cn(
          'text-xs transition-colors motion-reduce:transition-none',
          variant === 'chip'
            ? 'h-6 w-fit gap-1 border-transparent bg-transparent px-1.5 text-muted-foreground hover:bg-muted'
            : 'w-32',
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
        {ALL_PRIORITIES.map(p => {
          const pp = getPriorityPresentation(p);
          return (
            <SelectItem key={p} value={p}>
              <span className="flex items-center gap-2">
                <span aria-hidden className={cn('size-2 rounded-full', pp.dotClassName)} />
                {p}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
