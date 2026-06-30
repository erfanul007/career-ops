import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { JobsBoard } from "./JobsBoard";
import type { JobDto } from "@/lib/api/model";

const job = (id: number, status: JobDto["status"]): JobDto => ({
  id, companyId: 1, companyName: "Northwind Synthetics", title: `Role ${id}`,
  status, priority: "Medium", source: "CompanySite", sourceUrl: null,
  country: "Norway", city: null, locationText: null, remoteMode: "Remote", employmentType: "FullTime",
  salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: "Annual",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: null, notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
});

describe("JobsBoard", () => {
  beforeEach(() => localStorage.clear());

  it("renders active status columns with their cards", () => {
    renderWithProviders(
      <JobsBoard jobs={[job(1, "Applied")]} groupBy="status" listParams={{}} onJobClick={() => {}} />,
    );
    expect(screen.getAllByText("Applied").length).toBeGreaterThanOrEqual(2); // column header + card status chip
    expect(screen.getByText("Role 1")).toBeInTheDocument();
  });

  it("shows an empty board message when there are no jobs", () => {
    renderWithProviders(<JobsBoard jobs={[]} groupBy="status" listParams={{}} onJobClick={() => {}} />);
    expect(screen.getByText(/No jobs found/i)).toBeInTheDocument();
  });

  it("hides closed-status columns by default", () => {
    renderWithProviders(
      <JobsBoard jobs={[job(1, "Applied"), job(2, "Rejected")]} groupBy="status" listParams={{}} onJobClick={() => {}} />,
    );
    expect(screen.getAllByText("Applied").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Rejected")).not.toBeInTheDocument();
    expect(screen.queryByText("Role 2")).not.toBeInTheDocument();
  });

  it("offers a Columns menu to toggle status-column visibility", () => {
    renderWithProviders(
      <JobsBoard jobs={[job(1, "Applied")]} groupBy="status" listParams={{}} onJobClick={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /columns/i })).toBeInTheDocument();
  });
});
