import { describe, it, expect, afterEach } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { AppLayout } from './AppLayout';

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('dark', 'light');
  localStorage.clear();
});

describe('AppLayout', () => {
  it('renders the theme toggle in the header', async () => {
    renderWithProviders(
      <ThemeProvider>
        <AppLayout />
      </ThemeProvider>,
    );
    expect(await screen.findByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
  });
});
