import { describe, it, expect } from 'vitest';
import { buildLanes, laneKeyOf, LANE_STATUS_KEY } from './jobGrouping';
import type { JobDto } from '@/lib/api/model';

const job = (over: Partial<JobDto>): JobDto => ({
  id: 1, companyId: 1, companyName: 'Acme', title: 'Dev', status: 'Applied', priority: 'Medium',
  source: 'CompanySite', sourceUrl: null, country: 'Norway', city: null, locationText: null,
  remoteMode: 'Remote', employmentType: 'FullTime', salaryMin: null, salaryMax: null,
  salaryCurrency: null, salaryPeriod: 'Annual', deadlineAtUtc: null, appliedAtUtc: null,
  lastContactedAtUtc: null, nextActionAtUtc: null, fitScore: null, notes: null,
  createdAtUtc: '2026-06-01T00:00:00Z', updatedAtUtc: '2026-06-01T00:00:00Z', ...over,
});

describe('buildLanes', () => {
  it('status grouping is a single unbannered lane', () => {
    const lanes = buildLanes([job({ id: 1 }), job({ id: 2 })], 'status');
    expect(lanes).toHaveLength(1);
    expect(lanes[0].key).toBe(LANE_STATUS_KEY);
    expect(lanes[0].label).toBe('');
    expect(lanes[0].jobs).toHaveLength(2);
  });

  it('country grouping is alphabetical with Unknown last', () => {
    const lanes = buildLanes([
      job({ id: 1, country: 'Norway' }),
      job({ id: 2, country: null }),
      job({ id: 3, country: 'Germany' }),
    ], 'country');
    expect(lanes.map(l => l.label)).toEqual(['Germany', 'Norway', 'Unknown']);
  });

  it('drops empty lanes', () => {
    const lanes = buildLanes([job({ id: 1, country: 'Norway' })], 'country');
    expect(lanes.map(l => l.label)).toEqual(['Norway']);
  });

  it('priority grouping orders High, Medium, Low and drops empties', () => {
    const lanes = buildLanes([
      job({ id: 1, priority: 'Low' }),
      job({ id: 2, priority: 'High' }),
    ], 'priority');
    expect(lanes.map(l => l.label)).toEqual(['High', 'Low']);
  });
});

describe('laneKeyOf', () => {
  it('keys by the grouping dimension', () => {
    expect(laneKeyOf(job({ country: 'Norway' }), 'country')).toBe('Norway');
    expect(laneKeyOf(job({ country: null }), 'country')).toBe('Unknown');
    expect(laneKeyOf(job({ companyName: 'Acme' }), 'company')).toBe('Acme');
    expect(laneKeyOf(job({ priority: 'High' }), 'priority')).toBe('High');
    expect(laneKeyOf(job({}), 'status')).toBe(LANE_STATUS_KEY);
  });
});
