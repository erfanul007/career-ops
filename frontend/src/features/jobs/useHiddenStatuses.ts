import { useHiddenSet } from './useHiddenSet';
import type { JobStatus } from '@/lib/api/model';

const ACTIVE_STATUSES: JobStatus[] = ['Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered'];
const CLOSED_STATUSES: JobStatus[] = ['Rejected', 'Ghosted', 'Withdrawn', 'Archived'];
export const ALL_STATUSES: JobStatus[] = [...ACTIVE_STATUSES, ...CLOSED_STATUSES];
const STORAGE_KEY = 'careerops:jobs:hidden-status-columns';

export function useHiddenStatuses() {
  const { hidden, toggle, reset } = useHiddenSet(STORAGE_KEY, ALL_STATUSES, CLOSED_STATUSES);
  return { hiddenStatuses: hidden, toggleStatus: toggle, reset };
}
