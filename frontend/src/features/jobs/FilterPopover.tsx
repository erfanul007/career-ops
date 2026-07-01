import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { FacetSection } from './FacetSection';
import { activeFilterCount, DEFAULT_FILTERS, type JobFilters, type Facets } from './jobFilters';
import type { JobStatus, Priority, RemoteMode, EmploymentType, JobSource } from '@/lib/api/model';

interface Props {
  filters: JobFilters;
  facets: Facets;
  onChange: (f: JobFilters) => void;
}

function toggle<T extends string>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

export function FilterPopover({ filters, facets, onChange }: Props) {
  const count = activeFilterCount(filters);
  const numValue = (v: number | undefined) => (v == null ? '' : String(v));
  const parseNum = (raw: string) => {
    const n = Number(raw);
    return raw.trim() === '' || Number.isNaN(n) ? undefined : n;
  };
  const clearAll = () => onChange({ ...DEFAULT_FILTERS, search: filters.search, groupBy: filters.groupBy });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal aria-hidden className="size-4" />
          Filter
          {count > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[11px] font-medium tabular-nums text-primary-foreground">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-80 overflow-y-auto">
        <div className="space-y-3">
          <FacetSection title="Status" options={facets.statuses} selected={filters.statuses}
            onToggle={v => onChange({ ...filters, statuses: toggle(filters.statuses, v as JobStatus) })} />
          <FacetSection title="Priority" options={facets.priorities} selected={filters.priorities}
            onToggle={v => onChange({ ...filters, priorities: toggle(filters.priorities, v as Priority) })} />
          <FacetSection title="Remote" options={facets.remoteModes} selected={filters.remoteModes}
            onToggle={v => onChange({ ...filters, remoteModes: toggle(filters.remoteModes, v as RemoteMode) })} />
          <FacetSection title="Employment type" options={facets.employmentTypes} selected={filters.employmentTypes}
            onToggle={v => onChange({ ...filters, employmentTypes: toggle(filters.employmentTypes, v as EmploymentType) })} />
          <FacetSection title="Source" options={facets.sources} selected={filters.sources}
            onToggle={v => onChange({ ...filters, sources: toggle(filters.sources, v as JobSource) })} />
          <FacetSection title="Country" options={facets.countries} selected={filters.countries}
            onToggle={v => onChange({ ...filters, countries: toggle(filters.countries, v) })} />
          <FacetSection title="Company" options={facets.companies} selected={filters.companyIds}
            onToggle={v => onChange({ ...filters, companyIds: toggle(filters.companyIds, v) })} />

          <Separator />
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Salary</p>
            <div className="flex items-center gap-2">
              <Input type="number" inputMode="numeric" placeholder="Min" className="h-8"
                value={numValue(filters.salaryMin)} onChange={e => onChange({ ...filters, salaryMin: parseNum(e.target.value) })} />
              <span className="text-muted-foreground">–</span>
              <Input type="number" inputMode="numeric" placeholder="Max" className="h-8"
                value={numValue(filters.salaryMax)} onChange={e => onChange({ ...filters, salaryMax: parseNum(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Applied date</p>
            <div className="flex items-center gap-2">
              <Input type="date" className="h-8" value={filters.appliedFrom ?? ''}
                onChange={e => onChange({ ...filters, appliedFrom: e.target.value || undefined })} />
              <span className="text-muted-foreground">–</span>
              <Input type="date" className="h-8" value={filters.appliedTo ?? ''}
                onChange={e => onChange({ ...filters, appliedTo: e.target.value || undefined })} />
            </div>
          </div>

          <Separator />
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={count === 0}>Clear all</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
