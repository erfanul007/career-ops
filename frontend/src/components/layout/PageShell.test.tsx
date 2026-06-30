import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageShell } from "./PageShell";

describe("PageShell", () => {
  it("renders children", () => {
    render(<PageShell><p>content</p></PageShell>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("uses the narrow width when requested", () => {
    const { container } = render(<PageShell width="narrow"><p>x</p></PageShell>);
    expect(container.querySelector(".max-w-2xl")).not.toBeNull();
  });

  it("uses a full-height flex column for the board variant", () => {
    const { container } = render(<PageShell variant="full"><p>x</p></PageShell>);
    expect(container.querySelector(".h-full.min-h-0")).not.toBeNull();
  });

  it("uses the default max width for the contained variant", () => {
    const { container } = render(<PageShell><p>x</p></PageShell>);
    expect(container.querySelector(".max-w-5xl")).not.toBeNull();
  });

  it("uses a full-height flex column with gap for the board variant", () => {
    const { container } = render(<PageShell variant="full"><p>x</p></PageShell>);
    expect(container.querySelector(".flex.flex-col.gap-4")).not.toBeNull();
  });
});
