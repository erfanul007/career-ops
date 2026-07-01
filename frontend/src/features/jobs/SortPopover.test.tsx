import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { SortPopover } from './SortPopover';
import { DEFAULT_SORT } from './jobSort';

function setup(over: Partial<Parameters<typeof SortPopover>[0]> = {}) {
  const props = { sort: DEFAULT_SORT, onChange: vi.fn(), ...over };
  renderWithProviders(<SortPopover {...props} />);
  return props;
}

describe('SortPopover', () => {
  it('renders the sort fields and directions', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /sort/i }));
    expect(await screen.findByText('Sort by')).toBeInTheDocument();
    expect(screen.getByText('Direction')).toBeInTheDocument();
    for (const label of ['Updated', 'Applied', 'Company', 'Priority', 'Salary']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Descending')).toBeInTheDocument();
    expect(screen.getByLabelText('Ascending')).toBeInTheDocument();
  });

  it('reports a field change', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: /sort/i }));
    await userEvent.click(screen.getByLabelText('Company'));
    expect(props.onChange).toHaveBeenCalledWith({ field: 'company', dir: 'desc' });
  });

  it('reports a direction change', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: /sort/i }));
    await userEvent.click(screen.getByLabelText('Ascending'));
    expect(props.onChange).toHaveBeenCalledWith({ field: 'updated', dir: 'asc' });
  });

  it('resets to the default sort', async () => {
    const props = setup({ sort: { field: 'salary', dir: 'asc' } });
    await userEvent.click(screen.getByRole('button', { name: /sort/i }));
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(props.onChange).toHaveBeenCalledWith(DEFAULT_SORT);
  });
});
