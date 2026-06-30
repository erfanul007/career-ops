import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditJobDialog } from './EditJobDialog';
import type { JobDetailDto } from '@/lib/api/model';

const detail: JobDetailDto = {
  id: 7, companyId: 3, companyName: 'Northwind Synthetics', title: 'Backend Engineer',
  status: 'Applied', priority: 'Medium', source: 'LinkedIn', sourceUrl: null,
  jobDescription: 'PRESERVE ME', country: 'Norway', city: 'Oslo', locationText: null,
  remoteMode: 'Remote', employmentType: 'FullTime', salaryMin: null, salaryMax: null,
  salaryCurrency: null, salaryPeriod: 'Annual', deadlineAtUtc: null, appliedAtUtc: null,
  lastContactedAtUtc: null, nextActionAtUtc: null, fitScore: null,
  resumeLabel: 'KEEP', resumeAngle: null, coverLetterNotes: null, offerSalary: null,
  offerCurrency: null, offerDeadlineAtUtc: null, offerNotes: null, rejectionReason: null,
  notes: null, createdAtUtc: '2026-06-01T00:00:00Z', updatedAtUtc: '2026-06-01T00:00:00Z',
  activities: [], properties: [], attachments: [], followUps: [],
};

const updateMutateAsync = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/api/jobs/hooks', () => ({ useJob: () => ({ data: detail, isLoading: false }) }));
vi.mock('./useJobMutations', () => ({
  useJobMutations: () => ({ update: { mutateAsync: updateMutateAsync, isPending: false } }),
}));

describe('EditJobDialog', () => {
  beforeEach(() => updateMutateAsync.mockClear());

  it('prefills from the loaded job', async () => {
    render(<EditJobDialog open onOpenChange={() => {}} jobId={7} />);
    expect(await screen.findByDisplayValue('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Northwind Synthetics')).toBeInTheDocument();
  });

  it('submits a complete payload preserving unedited fields', async () => {
    const user = userEvent.setup();
    render(<EditJobDialog open onOpenChange={() => {}} jobId={7} />);
    const title = await screen.findByDisplayValue('Backend Engineer');
    fireEvent.change(title, { target: { value: 'Senior Backend Engineer' } });
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    const arg = updateMutateAsync.mock.calls[0][0];
    expect(arg.id).toBe(7);
    expect(arg.data.title).toBe('Senior Backend Engineer');
    expect(arg.data.companyId).toBe(3);                  // preserved
    expect(arg.data.jobDescription).toBe('PRESERVE ME'); // preserved (not in form)
    expect(arg.data.resumeLabel).toBe('KEEP');           // preserved (not in form)
  });
});
