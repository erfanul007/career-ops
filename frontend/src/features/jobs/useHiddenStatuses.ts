import { useCallback, useState } from 'react';
import type { JobStatus } from '@/lib/api/model';

const ACTIVE_STATUSES: JobStatus[] = ['Discovered', 'Interested', 'Applied', 'Interviewing', 'Offered'];
const CLOSED_STATUSES: JobStatus[] = ['Rejected', 'Ghosted', 'Withdrawn', 'Archived'];
export const ALL_STATUSES: JobStatus[] = [...ACTIVE_STATUSES, ...CLOSED_STATUSES];
const STORAGE_KEY = 'careerops:jobs:hidden-status-columns';

function load(): JobStatus[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [...CLOSED_STATUSES];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...CLOSED_STATUSES];
    return parsed.filter((s): s is JobStatus => ALL_STATUSES.includes(s as JobStatus));
  } catch {
    return [...CLOSED_STATUSES];
  }
}

function persist(next: JobStatus[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
}

export function useHiddenStatuses() {
  const [hiddenStatuses, setHiddenStatuses] = useState<JobStatus[]>(load);

  const toggleStatus = useCallback((status: JobStatus) => {
    setHiddenStatuses(prev => {
      const next = prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status];
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = [...CLOSED_STATUSES];
    persist(next);
    setHiddenStatuses(next);
  }, []);

  return { hiddenStatuses, toggleStatus, reset };
}
