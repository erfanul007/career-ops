import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { JobPriorityDropdown } from './JobPriorityDropdown';

describe('JobPriorityDropdown', () => {
  it('renders the current priority as a chip', () => {
    renderWithProviders(<JobPriorityDropdown jobId={1} currentPriority="High" variant="chip" />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });
});
