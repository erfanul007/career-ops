import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";

// Inline the detail object INSIDE the factory. `vi.mock` is hoisted above all
// imports/consts, so referencing an outer `const detail` would throw
// "Cannot access 'detail' before initialization".
vi.mock("@/lib/api/jobs/hooks", () => ({
  useJob: () => ({
    data: {
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
    },
    isLoading: false,
  }),
}));

import { JobDetailDrawer } from "./JobDetailDrawer";

describe("JobDetailDrawer", () => {
  it("renders the work-item header identity", () => {
    renderWithProviders(<JobDetailDrawer jobId={12} onClose={() => {}} />);
    expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Northwind Synthetics")).toBeInTheDocument();
    expect(screen.getByText(/JOB-12/)).toBeInTheDocument();
  });
});
