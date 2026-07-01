import { describe, it, expect } from 'vitest';
import { compareJobs, DEFAULT_SORT, SORT_FIELDS, type JobSort } from './jobSort';
import type { JobDto } from '@/lib/api/model';

const job = (over: Partial<JobDto> = {}): JobDto => ({
  id: 1, companyId: 1, companyName: 'Northwind Synthetics', title: 'Role', status: 'Applied',
  priority: 'Medium', source: 'CompanySite', sourceUrl: null, country: 'Norway', city: null,
  locationText: null, remoteMode: 'Remote', employmentType: 'FullTime', salaryMin: null, salaryMax: null,
  salaryCurrency: null, salaryPeriod: 'Annual', deadlineAtUtc: null, appliedAtUtc: null,
  lastContactedAtUtc: null, nextActionAtUtc: null, fitScore: null, notes: null,
  createdAtUtc: '2026-06-01T00:00:00Z', updatedAtUtc: '2026-06-01T00:00:00Z', ...over,
});

const ids = (jobs: JobDto[], sort: JobSort) => [...jobs].sort(compareJobs(sort)).map(j => j.id);

describe('jobSort', () => {
  it('DEFAULT_SORT is updated descending', () => {
    expect(DEFAULT_SORT).toEqual({ field: 'updated', dir: 'desc' });
  });

  it('SORT_FIELDS lists the five sortable fields with labels', () => {
    expect(SORT_FIELDS.map(f => f.value)).toEqual(['updated', 'applied', 'company', 'priority', 'salary']);
    expect(SORT_FIELDS.map(f => f.label)).toEqual(['Updated', 'Applied', 'Company', 'Priority', 'Salary']);
  });

  it('sorts by updated in both directions', () => {
    const jobs = [
      job({ id: 1, updatedAtUtc: '2026-06-01T00:00:00Z' }),
      job({ id: 3, updatedAtUtc: '2026-06-03T00:00:00Z' }),
      job({ id: 2, updatedAtUtc: '2026-06-02T00:00:00Z' }),
    ];
    expect(ids(jobs, { field: 'updated', dir: 'desc' })).toEqual([3, 2, 1]);
    expect(ids(jobs, { field: 'updated', dir: 'asc' })).toEqual([1, 2, 3]);
  });

  it('sorts by company name with locale compare', () => {
    const jobs = [job({ id: 1, companyName: 'Zeta' }), job({ id: 2, companyName: 'Alpha' })];
    expect(ids(jobs, { field: 'company', dir: 'asc' })).toEqual([2, 1]);
    expect(ids(jobs, { field: 'company', dir: 'desc' })).toEqual([1, 2]);
  });

  it('sorts by priority rank High > Medium > Low', () => {
    const jobs = [
      job({ id: 1, priority: 'Low' }),
      job({ id: 2, priority: 'High' }),
      job({ id: 3, priority: 'Medium' }),
    ];
    expect(ids(jobs, { field: 'priority', dir: 'desc' })).toEqual([2, 3, 1]);
    expect(ids(jobs, { field: 'priority', dir: 'asc' })).toEqual([1, 3, 2]);
  });

  it('sorts applied dates with nulls last in both directions', () => {
    const jobs = [
      job({ id: 1, appliedAtUtc: null }),
      job({ id: 2, appliedAtUtc: '2026-05-01T00:00:00Z' }),
      job({ id: 3, appliedAtUtc: '2026-05-03T00:00:00Z' }),
    ];
    expect(ids(jobs, { field: 'applied', dir: 'asc' })).toEqual([2, 3, 1]);
    expect(ids(jobs, { field: 'applied', dir: 'desc' })).toEqual([3, 2, 1]);
  });

  it('sorts salary by max-then-min, coercing strings, nulls last', () => {
    const jobs = [
      job({ id: 1, salaryMin: null, salaryMax: null }),
      job({ id: 2, salaryMin: '500000', salaryMax: null }),
      job({ id: 3, salaryMin: 400000, salaryMax: 900000 }),
    ];
    expect(ids(jobs, { field: 'salary', dir: 'desc' })).toEqual([3, 2, 1]);
    expect(ids(jobs, { field: 'salary', dir: 'asc' })).toEqual([2, 3, 1]);
  });
});
