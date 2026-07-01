import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { GroupPopover } from './GroupPopover';

function setup(over: Partial<Parameters<typeof GroupPopover>[0]> = {}) {
  const props = {
    groupBy: 'status' as const, onGroupChange: vi.fn(), hiddenStatuses: ['Rejected'] as never,
    onToggleStatus: vi.fn(), onResetColumns: vi.fn(), ...over,
  };
  renderWithProviders(<GroupPopover {...props} />);
  return props;
}

describe('GroupPopover', () => {
  it('changes grouping, toggles a column, and resets', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: /group/i }));
    await userEvent.click(await screen.findByLabelText('Country'));
    expect(props.onGroupChange).toHaveBeenCalledWith('country');
    await userEvent.click(screen.getByLabelText('Applied'));
    expect(props.onToggleStatus).toHaveBeenCalledWith('Applied');
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(props.onResetColumns).toHaveBeenCalled();
  });
});
