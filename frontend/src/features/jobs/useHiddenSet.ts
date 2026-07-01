import { useCallback, useState } from 'react';

export function useHiddenSet<T extends string>(
  storageKey: string,
  all: readonly T[],
  defaultHidden: readonly T[],
) {
  const [hidden, setHidden] = useState<T[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) return [...defaultHidden];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [...defaultHidden];
      return parsed.filter((v): v is T => all.includes(v as T));
    } catch {
      return [...defaultHidden];
    }
  });

  const persist = useCallback((next: T[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }, [storageKey]);

  const toggle = useCallback((value: T) => {
    setHidden(prev => {
      const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value];
      persist(next);
      return next;
    });
  }, [persist]);

  const reset = useCallback(() => {
    const next = [...defaultHidden];
    persist(next);
    setHidden(next);
  }, [persist, defaultHidden]);

  return { hidden, toggle, reset };
}
