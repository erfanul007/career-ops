import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollapsedLanes } from './useCollapsedLanes';

describe('useCollapsedLanes', () => {
  beforeEach(() => localStorage.clear());

  it('starts expanded and toggles', () => {
    const { result } = renderHook(() => useCollapsedLanes('country'));
    expect(result.current.isCollapsed('Norway')).toBe(false);
    act(() => result.current.toggle('Norway'));
    expect(result.current.isCollapsed('Norway')).toBe(true);
    act(() => result.current.toggle('Norway'));
    expect(result.current.isCollapsed('Norway')).toBe(false);
  });

  it('persists collapsed lanes to localStorage keyed by groupBy', () => {
    const { result } = renderHook(() => useCollapsedLanes('country'));
    act(() => result.current.toggle('Norway'));
    const raw = JSON.parse(localStorage.getItem('careerops:jobs:collapsed-lanes')!);
    expect(raw).toContain('country:Norway');
  });

  it('isolates keys per grouping dimension', () => {
    const { result } = renderHook(() => useCollapsedLanes('company'));
    act(() => result.current.toggle('Acme'));
    expect(result.current.isCollapsed('Acme')).toBe(true);
  });
});
