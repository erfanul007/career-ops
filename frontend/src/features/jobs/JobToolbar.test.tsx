import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { JobToolbar } from './JobToolbar';
import { DEFAULT_FILTERS, facets } from './jobFilters';
import { DEFAULT_SORT } from './jobSort';
import type { ColumnsSection } from './GroupPopover';

const columns: ColumnsSection = {
  title: 'Board columns', options: [], hidden: [], onToggle: () => {}, onReset: () => {},
};

function renderToolbar(over: Partial<Parameters<typeof JobToolbar>[0]> = {}) {
  const props = {
    filters: DEFAULT_FILTERS, facets: facets([]), onChange: vi.fn(),
    columns, sort: DEFAULT_SORT, onSortChange: vi.fn(), ...over,
  };
  renderWithProviders(<JobToolbar {...props} />);
  return props;
}

describe('JobToolbar', () => {
  it('renders the search field, Filter, Group, Sort and Add controls', () => {
    renderToolbar();
    expect(screen.getByPlaceholderText(/search jobs/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /group/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sort/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add job/i })).toBeInTheDocument();
  });

  it('reports typed search text', async () => {
    const props = renderToolbar();
    await userEvent.type(screen.getByPlaceholderText(/search jobs/i), 'a');
    expect(props.onChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'a' }));
  });

  it('reports a sort change from the Sort popover', async () => {
    const props = renderToolbar();
    await userEvent.click(screen.getByRole('button', { name: /sort/i }));
    await userEvent.click(await screen.findByLabelText('Company'));
    expect(props.onSortChange).toHaveBeenCalledWith({ field: 'company', dir: 'desc' });
  });
});
