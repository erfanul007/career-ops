import type { JobDto, JobStatus, Priority, RemoteMode, EmploymentType, JobSource } from '@/lib/api/model';

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
}

export const DEFAULT_FILTERS: JobFilters = {
  search: '',
  statuses: [], priorities: [], remoteModes: [], employmentTypes: [],
  sources: [], countries: [], companyIds: [],
  salaryMin: undefined, salaryMax: undefined, appliedFrom: undefined, appliedTo: undefined,
  groupBy: 'status',
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
