import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { FacetSection } from './FacetSection';
import type { FacetOption } from './jobFilters';

const opts = (n: number): FacetOption[] =>
  Array.from({ length: n }, (_, i) => ({ value: `v${i}`, label: `Label ${i}`, count: n - i }));

describe('FacetSection', () => {
  it('shows the top 6 and reveals the rest via "+ N more"', async () => {
    renderWithProviders(<FacetSection title="Source" options={opts(8)} selected={[]} onToggle={() => {}} />);
    expect(screen.queryByText('Label 7')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /2 more/i }));
    expect(screen.getByText('Label 7')).toBeInTheDocument();
  });

  it('calls onToggle with the clicked value', async () => {
    const onToggle = vi.fn();
    renderWithProviders(<FacetSection title="Status" options={opts(2)} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByLabelText('Label 0'));
    expect(onToggle).toHaveBeenCalledWith('v0');
  });

  it('pins a selected value that is absent from options', () => {
    renderWithProviders(<FacetSection title="Company" options={[]} selected={['99']} onToggle={() => {}} />);
    const box = screen.getByLabelText('99');
    expect(box).toBeInTheDocument();
    expect(box).toBeChecked();
  });
});
