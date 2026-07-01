import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { JobsBoard } from "./JobsBoard";
import type { JobDto, JobStatus } from "@/lib/api/model";

const CLOSED: JobStatus[] = ["Rejected", "Ghosted", "Withdrawn", "Archived"];

const job = (id: number, status: JobDto["status"], over: Partial<JobDto> = {}): JobDto => ({
  id, companyId: 1, companyName: "Northwind Synthetics", title: `Role ${id}`,
  status, priority: "Medium", source: "CompanySite", sourceUrl: null,
  country: "Norway", city: null, locationText: null, remoteMode: "Remote", employmentType: "FullTime",
  salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: "Annual",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: null, notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
  ...over,
});

describe("JobsBoard", () => {
  beforeEach(() => localStorage.clear());

  it("renders the status column header and a card", () => {
    renderWithProviders(
      <JobsBoard jobs={[job(1, "Applied")]} groupBy="status" hiddenStatuses={CLOSED} onJobClick={() => {}} />,
    );
    expect(screen.getAllByText("Applied").length).toBeGreaterThanOrEqual(2); // header + card chip
    expect(screen.getByText("Role 1")).toBeInTheDocument();
  });

  it("shows an empty board message when there are no jobs", () => {
    renderWithProviders(<JobsBoard jobs={[]} groupBy="status" hiddenStatuses={CLOSED} onJobClick={() => {}} />);
    expect(screen.getByText(/No jobs found/i)).toBeInTheDocument();
  });

  it("hides the status columns named in hiddenStatuses", () => {
    renderWithProviders(
      <JobsBoard jobs={[job(1, "Applied"), job(2, "Rejected")]} groupBy="status" hiddenStatuses={CLOSED} onJobClick={() => {}} />,
    );
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
    expect(screen.queryByText("Role 2")).not.toBeInTheDocument();
  });

  it("renders a lane banner when grouped by country", () => {
    renderWithProviders(
      <JobsBoard jobs={[job(1, "Applied", { country: "Norway" })]} groupBy="country" hiddenStatuses={CLOSED} onJobClick={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /Norway/ })).toBeInTheDocument();
    expect(screen.getByText("Role 1")).toBeInTheDocument();
  });

  it("orders cards within a status column by the given sort", () => {
    const { container } = renderWithProviders(
      <JobsBoard
        jobs={[
          job(1, "Applied", { updatedAtUtc: "2026-06-01T00:00:00Z" }),
          job(2, "Applied", { updatedAtUtc: "2026-06-05T00:00:00Z" }),
        ]}
        groupBy="status"
        hiddenStatuses={CLOSED}
        sort={{ field: "updated", dir: "asc" }}
        onJobClick={() => {}}
      />,
    );
    const text = container.textContent ?? "";
    expect(text.indexOf("Role 1")).toBeLessThan(text.indexOf("Role 2"));
  });
});
