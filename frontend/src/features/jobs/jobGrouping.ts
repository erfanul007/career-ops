import type { JobDto, Priority } from '@/lib/api/model';
import type { GroupBy } from './jobFilters';

export const LANE_STATUS_KEY = '__all__';
const UNKNOWN = 'Unknown';
const PRIORITY_ORDER: Priority[] = ['High', 'Medium', 'Low'];

export interface Lane {
  key: string;
  label: string;
  jobs: JobDto[];
}

export function laneKeyOf(job: JobDto, groupBy: GroupBy): string {
  switch (groupBy) {
    case 'status': return LANE_STATUS_KEY;
    case 'country': return job.country ?? UNKNOWN;
    case 'company': return job.companyName;
    case 'priority': return job.priority;
  }
}

export function buildLanes(jobs: JobDto[], groupBy: GroupBy): Lane[] {
  const sorted = [...jobs].sort((a, b) => b.updatedAtUtc.localeCompare(a.updatedAtUtc));

  if (groupBy === 'status') {
    return [{ key: LANE_STATUS_KEY, label: '', jobs: sorted }];
  }

  if (groupBy === 'priority') {
    return PRIORITY_ORDER
      .map(p => ({ key: p, label: p, jobs: sorted.filter(j => j.priority === p) }))
      .filter(lane => lane.jobs.length > 0);
  }

  const keys = [...new Set(sorted.map(j => laneKeyOf(j, groupBy)))].sort((a, b) => {
    if (a === UNKNOWN) return 1;
    if (b === UNKNOWN) return -1;
    return a.localeCompare(b);
  });

  return keys
    .map(key => ({ key, label: key, jobs: sorted.filter(j => laneKeyOf(j, groupBy) === key) }))
    .filter(lane => lane.jobs.length > 0);
}
