import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { BoardLane } from './BoardLane';
import type { Lane } from './jobGrouping';

const lane: Lane = { key: 'Norway', label: 'Norway', jobs: [] };

describe('BoardLane', () => {
  it('renders a banner with the label and count and toggles', () => {
    const onToggle = vi.fn();
    renderWithProviders(
      <BoardLane lane={lane} statuses={['Applied']} showBanner collapsed={false} onToggle={onToggle} onJobClick={() => {}} />,
    );
    const banner = screen.getByRole('button', { name: /Norway/ });
    expect(banner).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(banner);
    expect(onToggle).toHaveBeenCalledWith('Norway');
  });

  it('hides the cell grid when collapsed', () => {
    renderWithProviders(
      <BoardLane lane={lane} statuses={['Applied']} showBanner collapsed onToggle={() => {}} onJobClick={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /Norway/ })).toHaveAttribute('aria-expanded', 'false');
  });
});
