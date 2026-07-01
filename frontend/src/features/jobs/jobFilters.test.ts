import { describe, it, expect } from 'vitest';
import { facets, toNumberOrNull } from './jobFilters';
import type { JobDto } from '@/lib/api/model';

const job = (over: Partial<JobDto> = {}): JobDto => ({
  id: 1, companyId: 1, companyName: 'Northwind Synthetics', title: 'Role', status: 'Applied',
  priority: 'Medium', source: 'CompanySite', sourceUrl: null, country: 'Norway', city: null,
  locationText: null, remoteMode: 'Remote', employmentType: 'FullTime', salaryMin: null, salaryMax: null,
  salaryCurrency: null, salaryPeriod: 'Annual', deadlineAtUtc: null, appliedAtUtc: null,
  lastContactedAtUtc: null, nextActionAtUtc: null, fitScore: null, notes: null,
  createdAtUtc: '2026-06-01T00:00:00Z', updatedAtUtc: '2026-06-01T00:00:00Z', ...over,
});

describe('toNumberOrNull', () => {
  it('handles number, numeric string, null, empty', () => {
    expect(toNumberOrNull(50000)).toBe(50000);
    expect(toNumberOrNull('50000')).toBe(50000);
    expect(toNumberOrNull(null)).toBeNull();
    expect(toNumberOrNull(undefined)).toBeNull();
    expect(toNumberOrNull('')).toBeNull();
    expect(toNumberOrNull('nope')).toBeNull();
  });
});

describe('facets', () => {
  it('counts distinct values, sorts by count desc, derives country/company from data', () => {
    const jobs = [
      job({ status: 'Applied', country: 'Norway', companyId: 1, companyName: 'Acme' }),
      job({ status: 'Applied', country: 'Germany', companyId: 2, companyName: 'Globex' }),
      job({ status: 'Offered', country: 'Norway', companyId: 1, companyName: 'Acme' }),
    ];
    const f = facets(jobs);
    expect(f.statuses).toEqual([
      { value: 'Applied', label: 'Applied', count: 2 },
      { value: 'Offered', label: 'Offered', count: 1 },
    ]);
    expect(f.countries.map(o => o.value)).toEqual(['Norway', 'Germany']);
    expect(f.companies).toEqual([
      { value: '1', label: 'Acme', count: 2 },
      { value: '2', label: 'Globex', count: 1 },
    ]);
  });

  it('excludes null country and returns no options for empty input', () => {
    expect(facets([]).statuses).toEqual([]);
    expect(facets([job({ country: null })]).countries).toEqual([]);
  });
});
