import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { OverviewTab } from "./OverviewTab";
import type { JobDetailDto } from "@/lib/api/model";

const detail: JobDetailDto = {
  id: 12, companyId: 1, companyName: "Northwind Synthetics", title: "Senior Backend Engineer",
  status: "Applied", priority: "High", source: "CompanySite", sourceUrl: "https://example.test/job/12",
  jobDescription: "Build calm systems.", country: "Norway", city: "Oslo", locationText: null,
  remoteMode: "Hybrid", employmentType: "FullTime",
  salaryMin: 800000, salaryMax: 950000, salaryCurrency: "NOK", salaryPeriod: "Annual",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: 8, resumeLabel: null, resumeAngle: null, coverLetterNotes: null,
  offerSalary: null, offerCurrency: null, offerDeadlineAtUtc: null, offerNotes: null, rejectionReason: null,
  notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
  activities: [], properties: [], attachments: [], followUps: [],
};

describe("OverviewTab", () => {
  it("renders the source URL as a link", () => {
    renderWithProviders(<OverviewTab job={detail} />);
    expect(screen.getByRole("link", { name: /example\.test/ })).toHaveAttribute("href", "https://example.test/job/12");
  });

  it("shows the full job description (no truncation)", () => {
    renderWithProviders(<OverviewTab job={detail} />);
    expect(screen.getByText("Build calm systems.")).toBeInTheDocument();
  });
});
