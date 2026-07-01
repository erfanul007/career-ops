import type { JobDto } from '@/lib/api/model';

export type SortField = 'updated' | 'applied' | 'company' | 'priority' | 'salary';
export type SortDir = 'asc' | 'desc';
export interface JobSort {
  field: SortField;
  dir: SortDir;
}

export const DEFAULT_SORT: JobSort = { field: 'updated', dir: 'desc' };

export const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: 'updated', label: 'Updated' },
  { value: 'applied', label: 'Applied' },
  { value: 'company', label: 'Company' },
  { value: 'priority', label: 'Priority' },
  { value: 'salary', label: 'Salary' },
];

const PRIORITY_RANK: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

function salaryOf(job: JobDto): number | null {
  const raw = job.salaryMax ?? job.salaryMin;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

// Nulls always sort last, regardless of direction: the null branches return a
// fixed sign; only the both-present comparison is flipped by `sign`.
function nullsLast<T>(a: T | null, b: T | null, base: (x: T, y: T) => number, sign: number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return sign * base(a, b);
}

export function compareJobs(sort: JobSort): (a: JobDto, b: JobDto) => number {
  const sign = sort.dir === 'asc' ? 1 : -1;
  return (a, b) => {
    switch (sort.field) {
      case 'updated':
        return sign * a.updatedAtUtc.localeCompare(b.updatedAtUtc);
      case 'company':
        return sign * a.companyName.localeCompare(b.companyName);
      case 'priority':
        return sign * ((PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0));
      case 'applied':
        return nullsLast(a.appliedAtUtc, b.appliedAtUtc, (x, y) => x.localeCompare(y), sign);
      case 'salary':
        return nullsLast(salaryOf(a), salaryOf(b), (x, y) => x - y, sign);
    }
  };
}
