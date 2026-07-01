import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { ThemeProvider } from './theme-provider';

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('dark', 'light');
  localStorage.clear();
});

describe('ThemeProvider', () => {
  it('applies the theme as a class on the document element (attribute="class")', async () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <span>content</span>
      </ThemeProvider>,
    );
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  });
});
