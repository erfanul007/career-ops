import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { PropertiesTab } from "./PropertiesTab";
import type { JobDetailDto, JobPropertyDto } from "@/lib/api/model";

const prop: JobPropertyDto = {
  id: 1, jobId: 12, key: "ats_score", value: "82", valueType: "Text",
  createdAtUtc: "2026-06-01T00:00:00Z", updatedAtUtc: "2026-06-01T00:00:00Z",
} as unknown as JobPropertyDto;

const detail = { id: 12, properties: [prop], activities: [], attachments: [], followUps: [] } as unknown as JobDetailDto;

describe("PropertiesTab", () => {
  it("renders a property key and value", () => {
    renderWithProviders(<PropertiesTab job={detail} />);
    expect(screen.getByText("ats_score")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("uses an accessible label for the remove control", () => {
    renderWithProviders(<PropertiesTab job={detail} />);
    expect(screen.getByRole("button", { name: /remove ats_score/i })).toBeInTheDocument();
  });
});
