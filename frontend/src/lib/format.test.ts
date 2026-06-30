import { describe, it, expect } from "vitest";
import { formatDate, formatNumber, formatSalary } from "./format";

describe("format", () => {
  it("returns null for empty/invalid input", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate("")).toBeNull();
    expect(formatDate("not-a-date")).toBeNull();
    expect(formatNumber(null)).toBeNull();
    expect(formatSalary(null)).toBeNull();
    expect(formatSalary("")).toBeNull();
  });

  it("formats an ISO date to a locale date string", () => {
    const out = formatDate("2026-06-30T00:00:00Z");
    expect(out).toBeTypeOf("string");
    expect(out).toMatch(/2026/);
  });

  it("groups large numbers via the runtime locale", () => {
    expect(formatNumber(1500)).toBe((1500).toLocaleString());
  });

  it("formats a salary range matching the legacy money format", () => {
    expect(formatSalary(800000, 950000, "NOK", "Annual"))
      .toBe(`NOK ${(800000).toLocaleString()}–${(950000).toLocaleString()} / Annual`);
    expect(formatSalary(800000, null, "NOK", null))
      .toBe(`NOK ${(800000).toLocaleString()}+`);
  });
});
