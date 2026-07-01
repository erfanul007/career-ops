import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { JobsTable } from "./JobsTable";
import type { JobDto } from "@/lib/api/model";

const job = (over: Partial<JobDto> = {}): JobDto => ({
  id: 1, companyId: 1, companyName: "Northwind Synthetics", title: "Backend Engineer",
  status: "Applied", priority: "High", source: "CompanySite", sourceUrl: null,
  country: "Norway", city: "Oslo", locationText: null, remoteMode: "Remote", employmentType: "FullTime",
  salaryMin: 800000, salaryMax: 950000, salaryCurrency: "NOK", salaryPeriod: "Annual",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null,
  nextActionAtUtc: "2000-01-01T00:00:00Z", fitScore: null, notes: null,
  createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z", ...over,
});

describe("JobsTable", () => {
  it("renders a row and an overdue alert icon (no ⚠ glyph)", () => {
    const { container } = renderWithProviders(<JobsTable jobs={[job()]} groupBy="status" onJobClick={vi.fn()} />);
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(container.querySelector("[data-overdue]")).not.toBeNull();
    expect(container.textContent).not.toContain("⚠");
  });

  it("renders the priority with a token badge, not a raw palette class", () => {
    const { container } = renderWithProviders(<JobsTable jobs={[job({ priority: "High" })]} groupBy="status" onJobClick={vi.fn()} />);
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(container.querySelector(".bg-red-100,.bg-blue-100,.bg-slate-100")).toBeNull();
  });

  it("renders a banner row when grouped by country", () => {
    renderWithProviders(
      <JobsTable
        jobs={[
          job({ id: 1, country: "Norway" }),
          job({ id: 2, country: "Germany" }),
        ]}
        groupBy="country"
        onJobClick={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Norway/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Germany/ })).toBeInTheDocument();
  });

  it('renders every column header when nothing is hidden', () => {
    renderWithProviders(<JobsTable jobs={[job()]} groupBy="status" hiddenColumns={[]} onJobClick={vi.fn()} />);
    for (const header of ['ID', 'Company', 'Title', 'Status', 'Priority', 'Location', 'Salary', 'Applied', 'Next action']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
    expect(screen.getByText('JOB-1')).toBeInTheDocument();
  });

  it('omits hidden columns from header and body', () => {
    const { container } = renderWithProviders(
      <JobsTable jobs={[job()]} groupBy="status" hiddenColumns={['id', 'nextAction']} onJobClick={vi.fn()} />,
    );
    expect(screen.queryByRole('columnheader', { name: 'ID' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Next action' })).toBeNull();
    expect(screen.queryByText('JOB-1')).toBeNull();
    expect(container.querySelector('[data-overdue]')).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Company' })).toBeInTheDocument();
  });

  it('spans the grouped lane header across the visible columns plus actions', () => {
    renderWithProviders(
      <JobsTable jobs={[job({ country: 'Norway' })]} groupBy="country" hiddenColumns={['id', 'nextAction']} onJobClick={vi.fn()} />,
    );
    const banner = screen.getByRole('button', { name: /Norway/ }).closest('td');
    expect(banner).toHaveAttribute('colspan', '8');
  });
});
