import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { parseFiltersFromUrl, filtersToUrl, type JobFilters } from './jobFilters';

export function useJobFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFiltersFromUrl(searchParams), [searchParams]);
  const setFilters = useCallback(
    (next: JobFilters) => setSearchParams(filtersToUrl(next), { replace: true }),
    [setSearchParams],
  );
  return { filters, setFilters };
}
