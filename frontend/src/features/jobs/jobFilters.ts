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
