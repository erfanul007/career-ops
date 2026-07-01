import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { FilterPopover } from './FilterPopover';
import { DEFAULT_FILTERS, facets } from './jobFilters';
import type { JobDto } from '@/lib/api/model';

const jobs = [{ status: 'Applied', priority: 'High', remoteMode: 'Remote', employmentType: 'FullTime',
  source: 'LinkedIn', country: 'Norway', companyId: 1, companyName: 'Acme' } as unknown as JobDto];

describe('FilterPopover', () => {
  it('toggles a status option and reports it', async () => {
    const onChange = vi.fn();
    renderWithProviders(<FilterPopover filters={DEFAULT_FILTERS} facets={facets(jobs)} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /filter/i }));
    await userEvent.click(await screen.findByLabelText('Applied'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ statuses: ['Applied'] }));
  });

  it('shows the active-filter count badge', () => {
    renderWithProviders(
      <FilterPopover filters={{ ...DEFAULT_FILTERS, statuses: ['Applied'], salaryMin: 1 }} facets={facets(jobs)} onChange={() => {}} />,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
