import type { JobDto, JobStatus, Priority, RemoteMode, EmploymentType, JobSource } from '@/lib/api/model';
import { formatDate, formatNumber } from '@/lib/format';
import { DEFAULT_SORT, SORT_FIELDS, type SortField, type SortDir } from './jobSort';

export type GroupBy = 'status' | 'country' | 'company' | 'priority';

export interface JobFilters {
  search: string;
  statuses: JobStatus[];
  priorities: Priority[];
  remoteModes: RemoteMode[];
  employmentTypes: EmploymentType[];
  sources: JobSource[];
  countries: string[];
  companyIds: string[]; // String(job.companyId) — DTO id is number | string
  salaryMin?: number;
  salaryMax?: number;
  appliedFrom?: string; // YYYY-MM-DD
  appliedTo?: string;   // YYYY-MM-DD
  groupBy: GroupBy;
  sortField: SortField;
  sortDir: SortDir;
}

export const DEFAULT_FILTERS: JobFilters = {
  search: '',
  statuses: [], priorities: [], remoteModes: [], employmentTypes: [],
  sources: [], countries: [], companyIds: [],
  salaryMin: undefined, salaryMax: undefined, appliedFrom: undefined, appliedTo: undefined,
  groupBy: 'status',
  sortField: DEFAULT_SORT.field,
  sortDir: DEFAULT_SORT.dir,
};

export interface FacetOption { value: string; label: string; count: number; }
export interface Facets {
  statuses: FacetOption[];
  priorities: FacetOption[];
  remoteModes: FacetOption[];
  employmentTypes: FacetOption[];
  sources: FacetOption[];
  countries: FacetOption[];
  companies: FacetOption[];
}

export interface Chip { key: string; label: string; }

export function toNumberOrNull(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function countBy(jobs: JobDto[], pick: (j: JobDto) => { value: string; label: string } | null): FacetOption[] {
  const map = new Map<string, FacetOption>();
  for (const j of jobs) {
    const hit = pick(j);
    if (!hit) continue;
    const existing = map.get(hit.value);
    if (existing) existing.count += 1;
    else map.set(hit.value, { value: hit.value, label: hit.label, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function facets(jobs: JobDto[]): Facets {
  return {
    statuses: countBy(jobs, j => ({ value: j.status, label: j.status })),
    priorities: countBy(jobs, j => ({ value: j.priority, label: j.priority })),
    remoteModes: countBy(jobs, j => ({ value: j.remoteMode, label: j.remoteMode })),
    employmentTypes: countBy(jobs, j => ({ value: j.employmentType, label: j.employmentType })),
    sources: countBy(jobs, j => ({ value: j.source, label: j.source })),
    countries: countBy(jobs, j => (j.country ? { value: j.country, label: j.country } : null)),
    companies: countBy(jobs, j => ({ value: String(j.companyId), label: j.companyName })),
  };
}

function inArr<T extends string>(sel: T[], value: T): boolean {
  return sel.length === 0 || sel.includes(value);
}

export function applyFilters(jobs: JobDto[], f: JobFilters): JobDto[] {
  const search = f.search.trim().toLowerCase();
  return jobs.filter(j => {
    if (!inArr(f.statuses, j.status)) return false;
    if (!inArr(f.priorities, j.priority)) return false;
    if (!inArr(f.remoteModes, j.remoteMode)) return false;
    if (!inArr(f.employmentTypes, j.employmentType)) return false;
    if (!inArr(f.sources, j.source)) return false;
    if (f.countries.length > 0 && (j.country == null || !f.countries.includes(j.country))) return false;
    if (f.companyIds.length > 0 && !f.companyIds.includes(String(j.companyId))) return false;

    const sMin = toNumberOrNull(j.salaryMin);
    const sMax = toNumberOrNull(j.salaryMax);
    if (f.salaryMin != null) {
      const top = sMax ?? sMin;
      if (top == null || top < f.salaryMin) return false;
    }
    if (f.salaryMax != null) {
      const bottom = sMin ?? sMax;
      if (bottom == null || bottom > f.salaryMax) return false;
    }

    const applied = j.appliedAtUtc ? j.appliedAtUtc.slice(0, 10) : null;
    if (f.appliedFrom != null && (applied == null || applied < f.appliedFrom)) return false;
    if (f.appliedTo != null && (applied == null || applied > f.appliedTo)) return false;

    if (search) {
      const hay = [j.title, j.companyName, j.sourceUrl ?? '', j.notes ?? ''].join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

export function activeFilterCount(f: JobFilters): number {
  return (
    f.statuses.length + f.priorities.length + f.remoteModes.length +
    f.employmentTypes.length + f.sources.length + f.countries.length + f.companyIds.length +
    (f.salaryMin != null ? 1 : 0) + (f.salaryMax != null ? 1 : 0) +
    (f.appliedFrom != null ? 1 : 0) + (f.appliedTo != null ? 1 : 0)
  );
}

export function filtersToChips(f: JobFilters, fac: Facets): Chip[] {
  const chips: Chip[] = [];
  if (f.search.trim()) chips.push({ key: 'search', label: `"${f.search.trim()}"` });

  const labelFromFacet = (opts: FacetOption[], v: string, fallback: string) =>
    opts.find(o => o.value === v)?.label ?? fallback;
  const push = (cat: string, values: string[], prefix: string, labelFor: (v: string) => string) => {
    for (const v of values) chips.push({ key: `${cat}:${v}`, label: `${prefix}: ${labelFor(v)}` });
  };

  push('status', f.statuses, 'Status', v => v);
  push('priority', f.priorities, 'Priority', v => v);
  push('remote', f.remoteModes, 'Remote', v => v);
  push('employment', f.employmentTypes, 'Type', v => v);
  push('source', f.sources, 'Source', v => v);
  push('country', f.countries, 'Country', v => v);
  push('company', f.companyIds, 'Company', v => labelFromFacet(fac.companies, v, `Company #${v}`));

  if (f.salaryMin != null) chips.push({ key: 'salaryMin', label: `Salary ≥ ${formatNumber(f.salaryMin)}` });
  if (f.salaryMax != null) chips.push({ key: 'salaryMax', label: `Salary ≤ ${formatNumber(f.salaryMax)}` });
  if (f.appliedFrom != null) chips.push({ key: 'appliedFrom', label: `Applied ≥ ${formatDate(f.appliedFrom) ?? f.appliedFrom}` });
  if (f.appliedTo != null) chips.push({ key: 'appliedTo', label: `Applied ≤ ${formatDate(f.appliedTo) ?? f.appliedTo}` });

  return chips;
}

export function removeChip(f: JobFilters, key: string): JobFilters {
  switch (key) {
    case 'search': return { ...f, search: '' };
    case 'salaryMin': return { ...f, salaryMin: undefined };
    case 'salaryMax': return { ...f, salaryMax: undefined };
    case 'appliedFrom': return { ...f, appliedFrom: undefined };
    case 'appliedTo': return { ...f, appliedTo: undefined };
  }
  const idx = key.indexOf(':');
  if (idx < 0) return f;
  const cat = key.slice(0, idx);
  const val = key.slice(idx + 1);
  const drop = (arr: string[]) => arr.filter(x => x !== val);
  switch (cat) {
    case 'status': return { ...f, statuses: drop(f.statuses) as JobStatus[] };
    case 'priority': return { ...f, priorities: drop(f.priorities) as Priority[] };
    case 'remote': return { ...f, remoteModes: drop(f.remoteModes) as RemoteMode[] };
    case 'employment': return { ...f, employmentTypes: drop(f.employmentTypes) as EmploymentType[] };
    case 'source': return { ...f, sources: drop(f.sources) as JobSource[] };
    case 'country': return { ...f, countries: drop(f.countries) };
    case 'company': return { ...f, companyIds: drop(f.companyIds) };
    default: return f;
  }
}

const GROUP_VALUES: GroupBy[] = ['status', 'country', 'company', 'priority'];

export function filtersToUrl(f: JobFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.search.trim()) sp.set('q', f.search.trim());
  f.statuses.forEach(v => sp.append('status', v));
  f.priorities.forEach(v => sp.append('priority', v));
  f.remoteModes.forEach(v => sp.append('remote', v));
  f.employmentTypes.forEach(v => sp.append('employment', v));
  f.sources.forEach(v => sp.append('source', v));
  f.countries.forEach(v => sp.append('country', v));
  f.companyIds.forEach(v => sp.append('company', v));
  if (f.salaryMin != null) sp.set('salmin', String(f.salaryMin));
  if (f.salaryMax != null) sp.set('salmax', String(f.salaryMax));
  if (f.appliedFrom != null) sp.set('appliedfrom', f.appliedFrom);
  if (f.appliedTo != null) sp.set('appliedto', f.appliedTo);
  if (f.groupBy !== DEFAULT_FILTERS.groupBy) sp.set('group', f.groupBy);
  if (f.sortField !== DEFAULT_SORT.field) sp.set('sort', f.sortField);
  if (f.sortDir !== DEFAULT_SORT.dir) sp.set('dir', f.sortDir);
  return sp;
}

export function parseFiltersFromUrl(sp: URLSearchParams): JobFilters {
  const num = (k: string) => {
    const raw = sp.get(k);
    if (raw == null) return undefined;
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  };
  const date = (k: string) => {
    const raw = sp.get(k);
    return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
  };
  const groupRaw = sp.get('group');
  const groupBy = GROUP_VALUES.includes(groupRaw as GroupBy) ? (groupRaw as GroupBy) : 'status';
  const sortRaw = sp.get('sort');
  const sortField: SortField = SORT_FIELDS.some(o => o.value === sortRaw) ? (sortRaw as SortField) : DEFAULT_SORT.field;
  const dirRaw = sp.get('dir');
  const sortDir: SortDir = dirRaw === 'asc' || dirRaw === 'desc' ? dirRaw : DEFAULT_SORT.dir;
  return {
    search: sp.get('q') ?? '',
    statuses: sp.getAll('status') as JobStatus[],
    priorities: sp.getAll('priority') as Priority[],
    remoteModes: sp.getAll('remote') as RemoteMode[],
    employmentTypes: sp.getAll('employment') as EmploymentType[],
    sources: sp.getAll('source') as JobSource[],
    countries: sp.getAll('country'),
    companyIds: sp.getAll('company'),
    salaryMin: num('salmin'),
    salaryMax: num('salmax'),
    appliedFrom: date('appliedfrom'),
    appliedTo: date('appliedto'),
    groupBy,
    sortField,
    sortDir,
  };
}
