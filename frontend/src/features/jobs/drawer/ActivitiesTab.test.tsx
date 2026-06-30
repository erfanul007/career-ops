import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { ActivitiesTab } from "./ActivitiesTab";
import type { JobDetailDto, JobActivityDto } from "@/lib/api/model";

const activity: JobActivityDto = {
  id: 1, jobId: 12, label: "Technical Round 1", type: "Technical", status: "Planned", outcome: "Unknown",
  scheduledAtUtc: null, durationMinutes: null, contactName: null, contactRole: null, meetingUrl: null,
  prepNotes: null, feedback: null, notes: null, createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
};

const detail = { id: 12, activities: [activity], properties: [], attachments: [], followUps: [] } as unknown as JobDetailDto;

describe("ActivitiesTab", () => {
  it("renders the activity label", () => {
    renderWithProviders(<ActivitiesTab job={detail} />);
    expect(screen.getByText("Technical Round 1")).toBeInTheDocument();
  });

  it("keeps Delete out of view until the overflow menu is opened", () => {
    renderWithProviders(<ActivitiesTab job={detail} />);
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /actions/i })).toBeInTheDocument();
  });
});
