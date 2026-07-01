import { ArrowDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SORT_FIELDS, DEFAULT_SORT, type JobSort, type SortField, type SortDir } from './jobSort';

const DIRECTIONS: { value: SortDir; label: string }[] = [
  { value: 'desc', label: 'Descending' },
  { value: 'asc', label: 'Ascending' },
];

interface Props {
  sort: JobSort;
  onChange: (sort: JobSort) => void;
}

export function SortPopover({ sort, onChange }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ArrowDownUp aria-hidden className="size-4" /> Sort
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Sort by</p>
            <RadioGroup value={sort.field} onValueChange={v => onChange({ ...sort, field: v as SortField })}>
              {SORT_FIELDS.map(f => (
                <div key={f.value} className="flex items-center gap-2">
                  <RadioGroupItem id={`sort-field-${f.value}`} value={f.value} />
                  <Label htmlFor={`sort-field-${f.value}`} className="cursor-pointer text-sm font-normal">{f.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Direction</p>
              <Button variant="ghost" size="sm" className="h-6 px-1 text-xs" onClick={() => onChange(DEFAULT_SORT)}>Reset</Button>
            </div>
            <RadioGroup value={sort.dir} onValueChange={v => onChange({ ...sort, dir: v as SortDir })}>
              {DIRECTIONS.map(d => (
                <div key={d.value} className="flex items-center gap-2">
                  <RadioGroupItem id={`sort-dir-${d.value}`} value={d.value} />
                  <Label htmlFor={`sort-dir-${d.value}`} className="cursor-pointer text-sm font-normal">{d.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
