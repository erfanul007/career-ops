import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { JobActionsMenu } from './JobActionsMenu';

const removeMutate = vi.fn();
vi.mock('./useJobMutations', () => ({
  useJobMutations: () => ({ remove: { mutate: removeMutate } }),
}));

describe('JobActionsMenu', () => {
  beforeEach(() => {
    removeMutate.mockClear();
  });

  it('opens a confirm dialog naming the job', async () => {
    const user = userEvent.setup();
    renderWithProviders(<JobActionsMenu jobId={12} jobLabel="JOB-12 — Acme Dev" />);
    await user.click(screen.getByRole('button', { name: /job actions/i }));
    await user.click(await screen.findByText('Delete'));
    expect(await screen.findByText(/Delete JOB-12 — Acme Dev\?/)).toBeInTheDocument();
  });

  it('invokes remove mutation when confirming delete', async () => {
    const user = userEvent.setup();
    renderWithProviders(<JobActionsMenu jobId={12} jobLabel="JOB-12 — Acme Dev" />);
    await user.click(screen.getByRole('button', { name: /job actions/i }));
    await user.click(await screen.findByText('Delete'));
    await user.click(screen.getByRole('button', { name: /^Delete$/ }));
    expect(removeMutate.mock.calls[0][0]).toEqual({ id: 12 });
  });
});
