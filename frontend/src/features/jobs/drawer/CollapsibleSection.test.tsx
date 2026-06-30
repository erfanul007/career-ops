import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CollapsibleSection } from "./CollapsibleSection";

describe("CollapsibleSection", () => {
  it("is collapsed by default and toggles open", () => {
    render(
      <CollapsibleSection title="Attachments" count={2}>
        <p>panel body</p>
      </CollapsibleSection>,
    );
    const trigger = screen.getByRole("button", { name: /Attachments/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("panel body")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("panel body")).toBeInTheDocument();
  });
});
