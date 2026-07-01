import { describe, it, expect } from 'vitest';
import { facets, toNumberOrNull, applyFilters, activeFilterCount, DEFAULT_FILTERS, filtersToChips, removeChip, filtersToUrl, parseFiltersFromUrl, type JobFilters } from './jobFilters';
import type { JobDto } from '@/lib/api/model';
import { formatNumber } from '@/lib/format';

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

describe('applyFilters', () => {
  const jobs = [
    job({ id: 1, status: 'Applied', priority: 'High', remoteMode: 'Remote', country: 'Norway', companyId: 1 }),
    job({ id: 2, status: 'Offered', priority: 'Low', remoteMode: 'OnSite', country: 'Germany', companyId: 2 }),
  ];

  it('returns all when filters are empty', () => {
    expect(applyFilters(jobs, DEFAULT_FILTERS)).toHaveLength(2);
  });

  it('ORs within a category and ANDs across categories', () => {
    expect(applyFilters(jobs, { ...DEFAULT_FILTERS, statuses: ['Applied', 'Offered'] })).toHaveLength(2);
    expect(applyFilters(jobs, { ...DEFAULT_FILTERS, statuses: ['Applied'], priorities: ['High'] }).map(j => j.id)).toEqual([1]);
    expect(applyFilters(jobs, { ...DEFAULT_FILTERS, statuses: ['Applied'], priorities: ['Low'] })).toHaveLength(0);
  });

  it('filters by company id as string and by country', () => {
    expect(applyFilters(jobs, { ...DEFAULT_FILTERS, companyIds: ['2'] }).map(j => j.id)).toEqual([2]);
    expect(applyFilters(jobs, { ...DEFAULT_FILTERS, countries: ['Norway'] }).map(j => j.id)).toEqual([1]);
  });

  it('salary uses range overlap; both-null salary fails an active bound', () => {
    const band = [job({ id: 3, salaryMin: 80000, salaryMax: 120000 })];
    expect(applyFilters(band, { ...DEFAULT_FILTERS, salaryMin: 100000 })).toHaveLength(1); // 120k >= 100k
    expect(applyFilters(band, { ...DEFAULT_FILTERS, salaryMax: 150000 })).toHaveLength(1); // 80k <= 150k
    expect(applyFilters(band, { ...DEFAULT_FILTERS, salaryMin: 130000 })).toHaveLength(0); // 120k < 130k
    expect(applyFilters([job({ id: 4, salaryMin: null, salaryMax: null })], { ...DEFAULT_FILTERS, salaryMin: 1 })).toHaveLength(0);
  });

  it('applied-date bounds are inclusive; null appliedAt fails an active bound', () => {
    const dated = [job({ id: 5, appliedAtUtc: '2026-06-15T09:00:00Z' })];
    expect(applyFilters(dated, { ...DEFAULT_FILTERS, appliedFrom: '2026-06-15' })).toHaveLength(1);
    expect(applyFilters(dated, { ...DEFAULT_FILTERS, appliedTo: '2026-06-15' })).toHaveLength(1);
    expect(applyFilters(dated, { ...DEFAULT_FILTERS, appliedFrom: '2026-06-16' })).toHaveLength(0);
    expect(applyFilters([job({ id: 6, appliedAtUtc: null })], { ...DEFAULT_FILTERS, appliedFrom: '2026-01-01' })).toHaveLength(0);
  });

  it('search matches title/company/url/notes, case-insensitive', () => {
    const searchable = [job({ id: 7, title: 'Senior .NET Engineer', notes: 'great match' })];
    expect(applyFilters(searchable, { ...DEFAULT_FILTERS, search: 'senior' })).toHaveLength(1);
    expect(applyFilters(searchable, { ...DEFAULT_FILTERS, search: 'GREAT' })).toHaveLength(1);
    expect(applyFilters(searchable, { ...DEFAULT_FILTERS, search: 'python' })).toHaveLength(0);
  });
});

describe('activeFilterCount', () => {
  it('counts categorical selections + range bounds, excludes search and groupBy', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, search: 'x', groupBy: 'country' })).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, statuses: ['Applied', 'Offered'], salaryMin: 1 })).toBe(3);
  });
});

describe('filtersToChips', () => {
  const fac = facets([job({ companyId: 1, companyName: 'Acme' })]);

  it('builds chips from selected values incl. search and ranges', () => {
    const chips = filtersToChips(
      { ...DEFAULT_FILTERS, search: 'react', statuses: ['Applied'], salaryMin: 50000 }, fac,
    );
    expect(chips.map(c => c.key)).toEqual(['search', 'status:Applied', 'salaryMin']);
    expect(chips.find(c => c.key === 'salaryMin')!.label).toBe(`Salary ≥ ${formatNumber(50000)}`);
  });

  it('renders a removable chip for a company id absent from facets', () => {
    const chips = filtersToChips({ ...DEFAULT_FILTERS, companyIds: ['99'] }, fac);
    expect(chips).toHaveLength(1);
    expect(chips[0]).toEqual({ key: 'company:99', label: 'Company: Company #99' });
  });
});

describe('removeChip', () => {
  it('removes a single categorical value and clears scalars', () => {
    expect(removeChip({ ...DEFAULT_FILTERS, statuses: ['Applied', 'Offered'] }, 'status:Applied').statuses).toEqual(['Offered']);
    expect(removeChip({ ...DEFAULT_FILTERS, search: 'x' }, 'search').search).toBe('');
    expect(removeChip({ ...DEFAULT_FILTERS, salaryMin: 1 }, 'salaryMin').salaryMin).toBeUndefined();
  });
});

describe('URL round-trip', () => {
  it('round-trips filters via repeated params and omits defaults', () => {
    const f: JobFilters = {
      ...DEFAULT_FILTERS, search: 'react', statuses: ['Applied', 'Offered'],
      countries: ['Norway'], companyIds: ['2'], salaryMin: 50000, appliedFrom: '2026-06-01', groupBy: 'country',
    };
    const sp = filtersToUrl(f);
    expect(sp.getAll('status')).toEqual(['Applied', 'Offered']);
    expect(parseFiltersFromUrl(sp)).toEqual(f);
    expect(filtersToUrl(DEFAULT_FILTERS).toString()).toBe('');
  });

  it('validates appliedfrom as YYYY-MM-DD; invalid values become undefined', () => {
    expect(parseFiltersFromUrl(new URLSearchParams('appliedfrom=garbage')).appliedFrom).toBeUndefined();
  });

  it('accepts valid appliedfrom in YYYY-MM-DD format', () => {
    expect(parseFiltersFromUrl(new URLSearchParams('appliedfrom=2026-06-01')).appliedFrom).toBe('2026-06-01');
  });

  it('validates appliedto as YYYY-MM-DD; invalid values become undefined', () => {
    expect(parseFiltersFromUrl(new URLSearchParams('appliedto=nope')).appliedTo).toBeUndefined();
  });
});
