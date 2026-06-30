import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ListRow } from "./ListRow";

describe("ListRow", () => {
  it("links the title and shows subtitle + meta", () => {
    render(
      <MemoryRouter>
        <ListRow to="/jobs/1" title="Backend Engineer" subtitle="Northwind Synthetics" meta={<span>2026</span>} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Backend Engineer" })).toHaveAttribute("href", "/jobs/1");
    expect(screen.getByText(/Northwind Synthetics/)).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
  });
});
