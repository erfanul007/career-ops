import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { JobCard } from "./JobCard";
import type { JobDto } from "@/lib/api/model";

const baseJob: JobDto = {
  id: 12, companyId: 1, companyName: "Northwind Synthetics", title: "Senior Backend Engineer",
  status: "Applied", priority: "Medium", source: "CompanySite", sourceUrl: "https://example.test/job/12",
  country: "Norway", city: "Oslo", locationText: null, remoteMode: "Hybrid", employmentType: "FullTime",
  salaryMin: 800000, salaryMax: 950000, salaryCurrency: "NOK", salaryPeriod: "Annual",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: 8, notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
};

describe("JobCard", () => {
  it("shows company and title", () => {
    renderWithProviders(<JobCard job={baseJob} onClick={() => {}} />);
    expect(screen.getByText("Northwind Synthetics")).toBeInTheDocument();
    expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
  });

  it("does NOT show salary on the card", () => {
    renderWithProviders(<JobCard job={baseJob} onClick={() => {}} />);
    expect(screen.queryByText(/800,?000/)).not.toBeInTheDocument();
  });

  it("links JOB-{id} to the detail page", () => {
    renderWithProviders(<JobCard job={baseJob} onClick={() => {}} />);
    expect(screen.getByRole("link", { name: /JOB-12/ })).toHaveAttribute("href", "/jobs/12");
  });

  it("is a keyboard-operable button that opens on Enter", () => {
    const onClick = vi.fn();
    renderWithProviders(<JobCard job={baseJob} onClick={onClick} />);
    const card = screen.getByRole("button", { name: /Northwind Synthetics/ });
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("flags an overdue next action with an alert", () => {
    renderWithProviders(
      <JobCard job={{ ...baseJob, nextActionAtUtc: "2000-01-01T00:00:00Z" }} onClick={() => {}} />,
    );
    expect(screen.getByText(/Next/)).toBeInTheDocument();
  });
});
