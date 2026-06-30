import { describe, it, expect } from "vitest";
import {
  isOverdue, formatRelativeDate, formatShortDate,
  formatMoneyRange, formatLocation, getPriorityPresentation, getStatusPresentation,
} from "./jobPresentation";

const now = new Date("2026-06-30T12:00:00Z");

describe("isOverdue", () => {
  it("is false for null", () => expect(isOverdue(null, now)).toBe(false));
  it("is true for a past date", () => expect(isOverdue("2026-06-29T12:00:00Z", now)).toBe(true));
  it("is false for a future date", () => expect(isOverdue("2026-07-01T12:00:00Z", now)).toBe(false));
});

describe("formatRelativeDate", () => {
  it("returns null for null", () => expect(formatRelativeDate(null, now)).toBeNull());
  it("describes a future date with a suffix", () => {
    expect(formatRelativeDate("2026-07-02T12:00:00Z", now)).toContain("in");
  });
});

describe("formatMoneyRange", () => {
  it("returns null when min is absent", () => expect(formatMoneyRange(null, null, "NOK", "Year")).toBeNull());
  it("formats a range", () => {
    expect(formatMoneyRange(800000, 950000, "NOK", "Year")).toContain("NOK");
  });
  it("uses + when max absent", () => expect(formatMoneyRange(800000, null, "NOK", "Year")).toContain("+"));
});

describe("formatLocation", () => {
  it("joins city and country", () =>
    expect(formatLocation({ city: "Oslo", country: "Norway", locationText: null })).toBe("Oslo, Norway"));
  it("falls back to locationText", () =>
    expect(formatLocation({ city: null, country: null, locationText: "Remote (EU)" })).toBe("Remote (EU)"));
  it("returns null when empty", () =>
    expect(formatLocation({ city: null, country: null, locationText: null })).toBeNull());
});

describe("getPriorityPresentation", () => {
  it("returns a label, a dot class, and a High flag", () => {
    const high = getPriorityPresentation("High");
    expect(high.label).toBe("High");
    expect(high.isHigh).toBe(true);
    expect(high.dotClassName.length).toBeGreaterThan(0);
    expect(getPriorityPresentation("Medium").isHigh).toBe(false);
    expect(getPriorityPresentation("Low").isHigh).toBe(false);
  });
});

describe("getStatusPresentation", () => {
  it("returns a label, a dot class, and an accent class", () => {
    const p = getStatusPresentation("Applied");
    expect(p.label).toBe("Applied");
    expect(p.dotClassName.length).toBeGreaterThan(0);
    expect(p.accentClassName.length).toBeGreaterThan(0);
  });
});

describe("formatShortDate", () => {
  it("returns null for null", () => expect(formatShortDate(null)).toBeNull());
  it("returns a string for a date", () => expect(typeof formatShortDate("2026-06-30T00:00:00Z")).toBe("string"));
});
