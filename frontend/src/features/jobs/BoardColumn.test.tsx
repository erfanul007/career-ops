import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import { BoardColumn } from "./BoardColumn";

describe("BoardColumn", () => {
  it("renders label and a count", () => {
    renderWithProviders(<BoardColumn label="Applied" jobs={[]} onJobClick={() => {}} />);
    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows a calm empty message when not dragging", () => {
    renderWithProviders(<BoardColumn label="Applied" jobs={[]} onJobClick={() => {}} />);
    expect(screen.getByText(/No jobs/i)).toBeInTheDocument();
    expect(screen.queryByText(/Drop here/i)).not.toBeInTheDocument();
  });

  it("shows the drop target only while dragging", () => {
    renderWithProviders(<BoardColumn label="Applied" jobs={[]} onJobClick={() => {}} isDragActive />);
    expect(screen.getByText(/Drop here/i)).toBeInTheDocument();
    expect(screen.queryByText(/No jobs/i)).not.toBeInTheDocument();
  });
});
