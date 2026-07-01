import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { useJobFilters } from './useJobFilters';

const wrapper = (entry: string) =>
  ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;

describe('useJobFilters', () => {
  it('parses repeated params from the URL', () => {
    const { result } = renderHook(() => useJobFilters(), {
      wrapper: wrapper('/jobs?status=Applied&status=Offered&group=country'),
    });
    expect(result.current.filters.statuses).toEqual(['Applied', 'Offered']);
    expect(result.current.filters.groupBy).toBe('country');
  });
});
