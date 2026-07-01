import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHiddenSet } from './useHiddenSet';

const KEY = 'test:hidden-set';

describe('useHiddenSet', () => {
  beforeEach(() => localStorage.clear());

  it('starts from the default hidden set', () => {
    const { result } = renderHook(() => useHiddenSet<'a' | 'b' | 'c'>(KEY, ['a', 'b', 'c'], ['b']));
    expect(result.current.hidden).toEqual(['b']);
  });

  it('toggles values off and on, then resets to default', () => {
    const { result } = renderHook(() => useHiddenSet<'a' | 'b' | 'c'>(KEY, ['a', 'b', 'c'], ['b']));
    act(() => result.current.toggle('b'));
    expect(result.current.hidden).not.toContain('b');
    act(() => result.current.toggle('a'));
    expect(result.current.hidden).toContain('a');
    act(() => result.current.reset());
    expect(result.current.hidden).toEqual(['b']);
  });

  it('persists toggles to localStorage', () => {
    const { result } = renderHook(() => useHiddenSet<'a' | 'b' | 'c'>(KEY, ['a', 'b', 'c'], ['b']));
    act(() => result.current.toggle('a'));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(['b', 'a']);
  });

  it('falls back to default on unparseable storage', () => {
    localStorage.setItem(KEY, 'not-json');
    const { result } = renderHook(() => useHiddenSet<'a' | 'b' | 'c'>(KEY, ['a', 'b', 'c'], ['b']));
    expect(result.current.hidden).toEqual(['b']);
  });

  it('drops values outside the known universe', () => {
    localStorage.setItem(KEY, JSON.stringify(['a', 'zzz']));
    const { result } = renderHook(() => useHiddenSet<'a' | 'b' | 'c'>(KEY, ['a', 'b', 'c'], ['b']));
    expect(result.current.hidden).toEqual(['a']);
  });
});
