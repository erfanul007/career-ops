import { describe, it, expect } from 'vitest';
import { TABLE_COLUMNS, DEFAULT_HIDDEN_TABLE_COLUMNS } from './jobTableColumns';

describe('jobTableColumns', () => {
  it('lists the 9 data columns in header order', () => {
    expect(TABLE_COLUMNS.map(c => c.key)).toEqual([
      'id', 'company', 'title', 'status', 'priority', 'location', 'salary', 'applied', 'nextAction',
    ]);
  });

  it('has unique keys and non-empty labels', () => {
    const keys = TABLE_COLUMNS.map(c => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(TABLE_COLUMNS.every(c => c.label.length > 0)).toBe(true);
  });

  it('defaults to hiding id and nextAction', () => {
    expect(DEFAULT_HIDDEN_TABLE_COLUMNS).toEqual(['id', 'nextAction']);
  });
});
