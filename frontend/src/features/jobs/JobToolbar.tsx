import { Input } from '@/components/ui/input';
import { FilterPopover } from './FilterPopover';
import { GroupPopover, type ColumnsSection } from './GroupPopover';
import { JobQuickAdd } from './JobQuickAdd';
import type { GroupBy, JobFilters, Facets } from './jobFilters';

interface Props {
  filters: JobFilters;
  facets: Facets;
  onChange: (f: JobFilters) => void;
  columns: ColumnsSection;
}

export function JobToolbar({ filters, facets, onChange, columns }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search jobs…"
        value={filters.search}
        onChange={e => onChange({ ...filters, search: e.target.value })}
        className="w-48"
      />
      <FilterPopover filters={filters} facets={facets} onChange={onChange} />
      <GroupPopover
        groupBy={filters.groupBy}
        onGroupChange={(g: GroupBy) => onChange({ ...filters, groupBy: g })}
        columns={columns}
      />
      <JobQuickAdd />
    </div>
  );
}
