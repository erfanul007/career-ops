import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from './theme-provider';
import { ModeToggle } from './ModeToggle';

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('dark', 'light');
  localStorage.clear();
});

function renderToggle() {
  return render(
    <ThemeProvider>
      <ModeToggle />
    </ThemeProvider>,
  );
}

describe('ModeToggle', () => {
  it('offers Light, Dark, and System', async () => {
    renderToggle();
    await userEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    expect(await screen.findByRole('menuitem', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'System' })).toBeInTheDocument();
  });

  it('switches to dark, then back to light', async () => {
    renderToggle();
    await userEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Dark' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    await userEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Light' }));
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'));
  });
});
