import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { GroupPopover, type ColumnsSection } from './GroupPopover';

function setup(over: Partial<Parameters<typeof GroupPopover>[0]> = {}) {
  const columns: ColumnsSection = {
    title: 'Board columns',
    options: [{ value: 'Applied', label: 'Applied' }, { value: 'Rejected', label: 'Rejected' }],
    hidden: ['Rejected'],
    onToggle: vi.fn(),
    onReset: vi.fn(),
  };
  const props = { groupBy: 'status' as const, onGroupChange: vi.fn(), columns, ...over };
  renderWithProviders(<GroupPopover {...props} />);
  return props;
}

describe('GroupPopover', () => {
  it('changes grouping, toggles a column and resets via the descriptor', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: /group/i }));
    expect(await screen.findByText('Board columns')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Country'));
    expect(props.onGroupChange).toHaveBeenCalledWith('country');
    await userEvent.click(screen.getByLabelText('Applied'));
    expect(props.columns.onToggle).toHaveBeenCalledWith('Applied');
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(props.columns.onReset).toHaveBeenCalled();
  });

  it('renders a table-columns descriptor title and options', async () => {
    setup({
      columns: {
        title: 'Table columns',
        options: [{ value: 'salary', label: 'Salary' }, { value: 'nextAction', label: 'Next action' }],
        hidden: ['nextAction'],
        onToggle: vi.fn(),
        onReset: vi.fn(),
      },
    });
    await userEvent.click(screen.getByRole('button', { name: /group/i }));
    expect(await screen.findByText('Table columns')).toBeInTheDocument();
    expect(screen.getByLabelText('Next action')).toBeInTheDocument();
  });
});
