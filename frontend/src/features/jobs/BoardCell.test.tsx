import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { BoardCell } from './BoardCell';

describe('BoardCell', () => {
  it('shows the drop target only while dragging', () => {
    renderWithProviders(<BoardCell laneKey="__all__" status="Applied" jobs={[]} onJobClick={() => {}} isDragActive />);
    expect(screen.getByText(/Drop here/i)).toBeInTheDocument();
  });

  it('renders nothing extra when idle and empty', () => {
    renderWithProviders(<BoardCell laneKey="__all__" status="Applied" jobs={[]} onJobClick={() => {}} />);
    expect(screen.queryByText(/Drop here/i)).not.toBeInTheDocument();
  });
});
