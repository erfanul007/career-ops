import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { JobActionsMenu } from './JobActionsMenu';

describe('JobActionsMenu', () => {
  it('opens a confirm dialog naming the job', async () => {
    const user = userEvent.setup();
    renderWithProviders(<JobActionsMenu jobId={12} jobLabel="JOB-12 — Acme Dev" />);
    await user.click(screen.getByRole('button', { name: /job actions/i }));
    await user.click(await screen.findByText('Delete'));
    expect(await screen.findByText(/Delete JOB-12 — Acme Dev\?/)).toBeInTheDocument();
  });
});
