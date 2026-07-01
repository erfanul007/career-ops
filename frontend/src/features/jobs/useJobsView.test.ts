import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useJobsView } from './useJobsView';

const KEY = 'careerops:jobs:view';

describe('useJobsView', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to board', () => {
    const { result } = renderHook(() => useJobsView());
    expect(result.current.view).toBe('board');
  });

  it('sets and persists the view', () => {
    const { result } = renderHook(() => useJobsView());
    act(() => result.current.setView('table'));
    expect(result.current.view).toBe('table');
    expect(localStorage.getItem(KEY)).toBe('table');
  });

  it('falls back to board for an invalid stored value', () => {
    localStorage.setItem(KEY, 'kanban');
    const { result } = renderHook(() => useJobsView());
    expect(result.current.view).toBe('board');
  });
});
