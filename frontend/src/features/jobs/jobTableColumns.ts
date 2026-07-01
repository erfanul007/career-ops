export type TableColumnKey =
  | 'id' | 'company' | 'title' | 'status' | 'priority'
  | 'location' | 'salary' | 'applied' | 'nextAction';

export const TABLE_COLUMNS: { key: TableColumnKey; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'company', label: 'Company' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'location', label: 'Location' },
  { key: 'salary', label: 'Salary' },
  { key: 'applied', label: 'Applied' },
  { key: 'nextAction', label: 'Next action' },
];

export const DEFAULT_HIDDEN_TABLE_COLUMNS: TableColumnKey[] = ['id', 'nextAction'];
