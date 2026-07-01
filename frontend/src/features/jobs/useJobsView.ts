import { useCallback, useState } from 'react';

export type JobsView = 'board' | 'table';

const STORAGE_KEY = 'careerops:jobs:view';
const DEFAULT_VIEW: JobsView = 'board';

function isView(v: unknown): v is JobsView {
  return v === 'board' || v === 'table';
}

export function useJobsView() {
  const [view, setView] = useState<JobsView>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return isView(raw) ? raw : DEFAULT_VIEW;
    } catch {
      return DEFAULT_VIEW;
    }
  });

  const set = useCallback((next: JobsView) => {
    setView(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable */ }
  }, []);

  return { view, setView: set };
}
