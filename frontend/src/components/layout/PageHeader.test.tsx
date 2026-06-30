import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the title as a level-1 heading", () => {
    render(<PageHeader title="Jobs" />);
    expect(screen.getByRole("heading", { level: 1, name: "Jobs" })).toBeInTheDocument();
  });

  it("renders description and actions when provided", () => {
    render(<PageHeader title="Jobs" description="All roles" actions={<button>Add</button>} />);
    expect(screen.getByText("All roles")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});
