import { Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { GroupBy } from './jobFilters';

const GROUPS: { value: GroupBy; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'country', label: 'Country' },
  { value: 'company', label: 'Company' },
  { value: 'priority', label: 'Priority' },
];

export interface ColumnsSection {
  title: string;
  options: { value: string; label: string }[];
  hidden: string[];
  onToggle: (value: string) => void;
  onReset: () => void;
}

interface Props {
  groupBy: GroupBy;
  onGroupChange: (g: GroupBy) => void;
  columns: ColumnsSection;
}

export function GroupPopover({ groupBy, onGroupChange, columns }: Props) {
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
              <p className="text-xs font-medium text-muted-foreground">{columns.title}</p>
              <Button variant="ghost" size="sm" className="h-6 px-1 text-xs" onClick={columns.onReset}>Reset</Button>
            </div>
            <div className="space-y-1">
              {columns.options.map(o => {
                const id = `col-${o.value}`;
                return (
                  <div key={o.value} className="flex items-center gap-2">
                    <Checkbox id={id} checked={!columns.hidden.includes(o.value)} onCheckedChange={() => columns.onToggle(o.value)} />
                    <Label htmlFor={id} className="cursor-pointer text-sm font-normal">{o.label}</Label>
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
