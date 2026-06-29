import type { JobStatus } from '@/lib/api/model';
import type { GroupBy } from './JobsBoard';

export type { GroupBy };

export interface JobFilters {
  search: string;
  status?: JobStatus;
  countries: string[];
  companySearch: string;
  groupBy: GroupBy;
}

export const DEFAULT_FILTERS: JobFilters = {
  search: '',
  status: undefined,
  countries: [],
  companySearch: '',
  groupBy: 'status',
};
