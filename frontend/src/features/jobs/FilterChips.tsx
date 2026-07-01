import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { filtersToChips, removeChip, DEFAULT_FILTERS, type JobFilters, type Facets } from './jobFilters';

interface Props {
  filters: JobFilters;
  facets: Facets;
  onChange: (f: JobFilters) => void;
}

export function FilterChips({ filters, facets, onChange }: Props) {
  const chips = filtersToChips(filters, facets);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-2">
      {chips.map(chip => (
        <Badge key={chip.key} variant="secondary" className="h-7 gap-1 pr-1 font-normal">
          {chip.label}
          <Button
            variant="ghost" size="icon-xs" aria-label={`Remove ${chip.label}`}
            onClick={() => onChange(removeChip(filters, chip.key))}
          >
            <X aria-hidden />
          </Button>
        </Badge>
      ))}
      <Button
        variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
        onClick={() => onChange({ ...DEFAULT_FILTERS, groupBy: filters.groupBy })}
      >
        Clear all
      </Button>
    </div>
  );
}
