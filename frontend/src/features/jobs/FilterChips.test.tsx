import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChips } from './FilterChips';
import { DEFAULT_FILTERS, facets } from './jobFilters';

describe('FilterChips', () => {
  it('renders nothing when no filters are active', () => {
    const { container } = render(<FilterChips filters={DEFAULT_FILTERS} facets={facets([])} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('removes a single value and clears all', async () => {
    const onChange = vi.fn();
    render(
      <FilterChips
        filters={{ ...DEFAULT_FILTERS, statuses: ['Applied'], search: 'react' }}
        facets={facets([])} onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /remove status: applied/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ statuses: [] }));
    await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ statuses: [], search: '' }));
  });

  it('renders a removable chip for a stale company id', () => {
    render(<FilterChips filters={{ ...DEFAULT_FILTERS, companyIds: ['99'] }} facets={facets([])} onChange={() => {}} />);
    expect(screen.getByText('Company: Company #99')).toBeInTheDocument();
  });
});
