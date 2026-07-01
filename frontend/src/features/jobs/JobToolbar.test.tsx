import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { JobToolbar } from './JobToolbar';
import { DEFAULT_FILTERS, facets } from './jobFilters';

describe('JobToolbar', () => {
  it('renders the search field, Filter, Group and Add controls', () => {
    renderWithProviders(
      <JobToolbar filters={DEFAULT_FILTERS} facets={facets([])} onChange={() => {}}
        hiddenStatuses={[]} onToggleStatus={() => {}} onResetColumns={() => {}} />,
    );
    expect(screen.getByPlaceholderText(/search jobs/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /group/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add job/i })).toBeInTheDocument();
  });

  it('reports typed search text', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <JobToolbar filters={DEFAULT_FILTERS} facets={facets([])} onChange={onChange}
        hiddenStatuses={[]} onToggleStatus={() => {}} onResetColumns={() => {}} />,
    );
    await userEvent.type(screen.getByPlaceholderText(/search jobs/i), 'a');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'a' }));
  });
});
