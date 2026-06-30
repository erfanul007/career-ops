import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetadataSection } from "./MetadataSection";

describe("MetadataSection", () => {
  it("renders only non-empty rows", () => {
    render(<MetadataSection title="Location" rows={[["Country", "Norway"], ["City", null]]} />);
    expect(screen.getByText("Country")).toBeInTheDocument();
    expect(screen.getByText("Norway")).toBeInTheDocument();
    expect(screen.queryByText("City")).not.toBeInTheDocument();
  });

  it("renders nothing when all rows are empty", () => {
    const { container } = render(<MetadataSection title="Location" rows={[["City", null], ["Country", ""]]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
