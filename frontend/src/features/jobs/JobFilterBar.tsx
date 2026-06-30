import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { JobStatus } from '@/lib/api/model';
import type { GroupBy } from './JobsBoard';
import type { JobFilters } from './jobFilters';

interface Props {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
}

const STATUSES: JobStatus[] = [
  'Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered',
  'Rejected', 'Ghosted', 'Withdrawn', 'Archived',
];

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'status',   label: 'By Status' },
  { value: 'country',  label: 'By Country' },
  { value: 'company',  label: 'By Company' },
  { value: 'priority', label: 'By Priority' },
];

export function JobFilterBar({ filters, onChange }: Props) {
  const [countryInput, setCountryInput] = useState('');

  const addCountry = (raw: string) => {
    const c = raw.trim();
    if (!c || filters.countries.includes(c)) { setCountryInput(''); return; }
    onChange({ ...filters, countries: [...filters.countries, c] });
    setCountryInput('');
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search jobs..."
        value={filters.search}
        onChange={e => onChange({ ...filters, search: e.target.value })}
        className="w-52"
      />

      <Select
        value={filters.status ?? ''}
        onValueChange={value => onChange({ ...filters, status: value ? value as JobStatus : undefined })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All statuses</SelectItem>
          {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap items-center gap-2">
        {filters.countries.map(c => (
          <Badge key={c} variant="secondary" className="h-7 gap-1 pr-1">
            {c}
            <Button
              variant="ghost" size="icon-xs"
              aria-label={`Remove ${c}`}
              onClick={() => onChange({ ...filters, countries: filters.countries.filter(x => x !== c) })}
            >
              <X aria-hidden />
            </Button>
          </Badge>
        ))}
        <Input
          placeholder="Add country…"
          value={countryInput}
          onChange={e => setCountryInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCountry(countryInput); } }}
          onBlur={() => addCountry(countryInput)}
          className="w-32"
        />
      </div>

      <Input
        placeholder="Company…"
        value={filters.companySearch}
        onChange={e => onChange({ ...filters, companySearch: e.target.value })}
        className="w-36"
      />

      <Select
        value={filters.groupBy}
        onValueChange={value => onChange({ ...filters, groupBy: value as GroupBy })}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GROUP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
