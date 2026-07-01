import { Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ALL_STATUSES } from './useHiddenStatuses';
import type { GroupBy } from './jobFilters';
import type { JobStatus } from '@/lib/api/model';

const GROUPS: { value: GroupBy; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'country', label: 'Country' },
  { value: 'company', label: 'Company' },
  { value: 'priority', label: 'Priority' },
];

interface Props {
  groupBy: GroupBy;
  onGroupChange: (g: GroupBy) => void;
  hiddenStatuses: JobStatus[];
  onToggleStatus: (s: JobStatus) => void;
  onResetColumns: () => void;
}

export function GroupPopover({ groupBy, onGroupChange, hiddenStatuses, onToggleStatus, onResetColumns }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Rows3 aria-hidden className="size-4" /> Group
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Group by</p>
            <RadioGroup value={groupBy} onValueChange={v => onGroupChange(v as GroupBy)}>
              {GROUPS.map(g => (
                <div key={g.value} className="flex items-center gap-2">
                  <RadioGroupItem id={`group-${g.value}`} value={g.value} />
                  <Label htmlFor={`group-${g.value}`} className="cursor-pointer text-sm font-normal">{g.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Board columns</p>
              <Button variant="ghost" size="sm" className="h-6 px-1 text-xs" onClick={onResetColumns}>Reset</Button>
            </div>
            <div className="space-y-1">
              {ALL_STATUSES.map(s => {
                const id = `col-${s}`;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <Checkbox id={id} checked={!hiddenStatuses.includes(s)} onCheckedChange={() => onToggleStatus(s)} />
                    <Label htmlFor={id} className="cursor-pointer text-sm font-normal">{s}</Label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
