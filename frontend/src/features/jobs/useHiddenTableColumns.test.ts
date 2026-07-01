import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHiddenTableColumns } from './useHiddenTableColumns';

describe('useHiddenTableColumns', () => {
  beforeEach(() => localStorage.clear());

  it('hides id and nextAction by default', () => {
    const { result } = renderHook(() => useHiddenTableColumns());
    expect(result.current.hiddenColumns).toEqual(['id', 'nextAction']);
  });

  it('toggles a column and resets to default', () => {
    const { result } = renderHook(() => useHiddenTableColumns());
    act(() => result.current.toggleColumn('id'));
    expect(result.current.hiddenColumns).not.toContain('id');
    act(() => result.current.toggleColumn('salary'));
    expect(result.current.hiddenColumns).toContain('salary');
    act(() => result.current.reset());
    expect(result.current.hiddenColumns).toEqual(['id', 'nextAction']);
  });
});
