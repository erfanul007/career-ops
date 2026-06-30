import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { BoardColumnHeader } from './BoardColumnHeader';

describe('BoardColumnHeader', () => {
  it('renders one header per status', () => {
    renderWithProviders(<BoardColumnHeader statuses={['Applied', 'Interviewing']} />);
    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('Interviewing')).toBeInTheDocument();
  });
});
