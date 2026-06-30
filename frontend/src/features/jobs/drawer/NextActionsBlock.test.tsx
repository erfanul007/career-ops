import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { NextActionsBlock } from "./NextActionsBlock";
import type { JobDetailDto, FollowUpTaskDto } from "@/lib/api/model";

const followUp = (over: Partial<FollowUpTaskDto>): FollowUpTaskDto => ({
  id: 1, jobId: 12, jobTitle: null, jobActivityId: null, jobActivityLabel: null,
  title: "Send thank-you note", description: null, dueAtUtc: "2000-01-01T00:00:00Z",
  status: "Pending", priority: "Medium", createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
  ...over,
});

const job = (followUps: FollowUpTaskDto[]): JobDetailDto => ({
  id: 12, companyId: 1, companyName: "Northwind Synthetics", title: "Senior Backend Engineer",
  status: "Applied", priority: "High", source: "CompanySite", sourceUrl: null, jobDescription: null,
  country: "Norway", city: null, locationText: null, remoteMode: "Remote", employmentType: "FullTime",
  salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: "Annual",
  deadlineAtUtc: null, appliedAtUtc: null, lastContactedAtUtc: null, nextActionAtUtc: null,
  fitScore: null, resumeLabel: null, resumeAngle: null, coverLetterNotes: null,
  offerSalary: null, offerCurrency: null, offerDeadlineAtUtc: null, offerNotes: null, rejectionReason: null,
  notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
  activities: [], properties: [], attachments: [], followUps,
});

describe("NextActionsBlock", () => {
  it("renders a follow-up title and flags overdue ones", () => {
    renderWithProviders(<NextActionsBlock job={job([followUp({})])} />);
    expect(screen.getByText("Send thank-you note")).toBeInTheDocument();
    expect(screen.getByText(/Overdue/i)).toBeInTheDocument();
  });

  it("shows an empty hint when there are none", () => {
    renderWithProviders(<NextActionsBlock job={job([])} />);
    expect(screen.getByText(/No follow-ups/i)).toBeInTheDocument();
  });
});
