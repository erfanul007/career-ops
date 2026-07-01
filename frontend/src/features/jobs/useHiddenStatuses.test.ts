import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHiddenStatuses } from './useHiddenStatuses';

describe('useHiddenStatuses', () => {
  beforeEach(() => localStorage.clear());

  it('hides closed statuses by default', () => {
    const { result } = renderHook(() => useHiddenStatuses());
    expect(result.current.hiddenStatuses).toEqual(['Rejected', 'Ghosted', 'Withdrawn', 'Archived']);
  });

  it('toggles a status and resets to default', () => {
    const { result } = renderHook(() => useHiddenStatuses());
    act(() => result.current.toggleStatus('Rejected'));
    expect(result.current.hiddenStatuses).not.toContain('Rejected');
    act(() => result.current.toggleStatus('Applied'));
    expect(result.current.hiddenStatuses).toContain('Applied');
    act(() => result.current.reset());
    expect(result.current.hiddenStatuses).toEqual(['Rejected', 'Ghosted', 'Withdrawn', 'Archived']);
  });
});
