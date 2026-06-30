import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobCardPreview } from "./JobCardPreview";
import type { JobDto } from "@/lib/api/model";

const baseJob: JobDto = {
  id: 12, companyId: 1, companyName: "Northwind Synthetics", title: "Senior Backend Engineer",
  status: "Applied", priority: "High", source: "CompanySite", sourceUrl: null,
  country: "Norway", city: "Oslo", locationText: null, remoteMode: "Hybrid", employmentType: "FullTime",
  salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: "Annual",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: null, notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
};

describe("JobCardPreview", () => {
  it("renders company, title, and a static JOB id — no link, no interactive control", () => {
    render(<JobCardPreview job={baseJob} />);
    expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("JOB-12")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
