import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { JobStatusDropdown } from "./JobStatusDropdown";

describe("JobStatusDropdown", () => {
  it("renders the current status label in chip variant", () => {
    renderWithProviders(<JobStatusDropdown jobId={1} currentStatus="Applied" variant="chip" />);
    expect(screen.getByText("Applied")).toBeInTheDocument();
  });

  it("renders a combobox trigger", () => {
    renderWithProviders(<JobStatusDropdown jobId={1} currentStatus="Applied" />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
