import { useState, useCallback } from 'react';
import type { GroupBy } from './JobsBoard';

const STORAGE_KEY = 'careerops:jobs:collapsed-lanes';

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((x): x is string => typeof x === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

export function useCollapsedLanes(groupBy: GroupBy) {
  const [collapsed, setCollapsed] = useState<Set<string>>(load);

  const isCollapsed = useCallback(
    (laneKey: string) => collapsed.has(`${groupBy}:${laneKey}`),
    [collapsed, groupBy],
  );

  const toggle = useCallback((laneKey: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      const k = `${groupBy}:${laneKey}`;
      if (next.has(k)) next.delete(k); else next.add(k);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* storage unavailable */ }
      return next;
    });
  }, [groupBy]);

  return { isCollapsed, toggle };
}
