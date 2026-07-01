import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { FacetOption } from './jobFilters';

const TOP_N = 6;
const NARROW_THRESHOLD = 15;

interface Props {
  title: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function FacetSection({ title, options, selected, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [narrow, setNarrow] = useState('');

  const selectedSet = new Set(selected);
  const present = new Set(options.map(o => o.value));
  const pinnedMissing: FacetOption[] = selected
    .filter(v => !present.has(v))
    .map(v => ({ value: v, label: v, count: 0 }));

  if (options.length === 0 && pinnedMissing.length === 0) return null;

  const ordered: FacetOption[] = [
    ...options.filter(o => selectedSet.has(o.value)),
    ...pinnedMissing,
    ...options.filter(o => !selectedSet.has(o.value)),
  ];
  const q = narrow.trim().toLowerCase();
  const filtered = q ? ordered.filter(o => o.label.toLowerCase().includes(q)) : ordered;
  const visible = expanded ? filtered : filtered.slice(0, TOP_N);
  const hiddenCount = filtered.length - visible.length;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {expanded && ordered.length > NARROW_THRESHOLD && (
        <Input
          value={narrow}
          onChange={e => setNarrow(e.target.value)}
          placeholder={`Filter ${title.toLowerCase()}…`}
          className="h-7 text-xs"
        />
      )}
      <div className="space-y-1">
        {visible.map(o => {
          const id = `facet-${title}-${o.value}`;
          return (
            <div key={o.value} className="flex items-center gap-2">
              <Checkbox id={id} checked={selectedSet.has(o.value)} onCheckedChange={() => onToggle(o.value)} />
              <Label htmlFor={id} className="flex-1 cursor-pointer text-sm font-normal">{o.label}</Label>
              {o.count > 0 && <span className="text-xs tabular-nums text-muted-foreground">{o.count}</span>}
            </div>
          );
        })}
      </div>
      {!expanded && hiddenCount > 0 && (
        <Button variant="ghost" size="sm" className="h-6 px-1 text-xs" onClick={() => setExpanded(true)}>
          + {hiddenCount} more
        </Button>
      )}
    </div>
  );
}
