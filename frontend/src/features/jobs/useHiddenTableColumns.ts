import { useHiddenSet } from './useHiddenSet';
import { TABLE_COLUMNS, DEFAULT_HIDDEN_TABLE_COLUMNS, type TableColumnKey } from './jobTableColumns';

const ALL_TABLE_COLUMNS: TableColumnKey[] = TABLE_COLUMNS.map(c => c.key);
const STORAGE_KEY = 'careerops:jobs:hidden-table-columns';

export function useHiddenTableColumns() {
  const { hidden, toggle, reset } = useHiddenSet(STORAGE_KEY, ALL_TABLE_COLUMNS, DEFAULT_HIDDEN_TABLE_COLUMNS);
  return { hiddenColumns: hidden, toggleColumn: toggle, reset };
}
