import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Building2 } from "lucide-react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders title and hint", () => {
    render(<EmptyState icon={Building2} title="No companies yet" hint="Add one to start" />);
    expect(screen.getByText("No companies yet")).toBeInTheDocument();
    expect(screen.getByText("Add one to start")).toBeInTheDocument();
  });
});
