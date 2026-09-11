import { describe, it, expect } from "vitest";
import { reconcileRange } from "./filterRange";

const range = { start: "2026-09-01", end: "2026-09-30" };

describe("reconcileRange", () => {
  it("carries the start back when the end is moved to an earlier period", () => {
    // The trap this replaces: from a September range, picking 31 August as the
    // end was snapped forward to 1 September, so the search never left September.
    expect(reconcileRange("end", "2026-08-31", range)).toEqual({
      start: "2026-08-31",
      end: "2026-08-31",
    });
  });

  it("carries the end forward when the start is moved past it", () => {
    expect(reconcileRange("start", "2026-10-15", range)).toEqual({
      start: "2026-10-15",
      end: "2026-10-15",
    });
  });

  it("leaves the other bound alone for a pick inside the range", () => {
    expect(reconcileRange("start", "2026-09-10", range)).toEqual({
      start: "2026-09-10",
      end: "2026-09-30",
    });
    expect(reconcileRange("end", "2026-09-10", range)).toEqual({
      start: "2026-09-01",
      end: "2026-09-10",
    });
  });

  it("treats an equal bound as no movement", () => {
    expect(reconcileRange("end", "2026-09-01", range)).toEqual({
      start: "2026-09-01",
      end: "2026-09-01",
    });
  });

  it("keeps the other bound when a field is cleared", () => {
    expect(reconcileRange("start", "", range)).toEqual({ start: "", end: "2026-09-30" });
    expect(reconcileRange("end", "", range)).toEqual({ start: "2026-09-01", end: "" });
  });

  it("accepts a half-open range without inventing the missing bound", () => {
    expect(reconcileRange("end", "2026-08-31", { start: "", end: "" })).toEqual({
      start: "",
      end: "2026-08-31",
    });
  });

  it("spans multiple years without reconciling", () => {
    expect(reconcileRange("start", "2020-01-01", { start: "2026-01-01", end: "2026-12-31" })).toEqual({
      start: "2020-01-01",
      end: "2026-12-31",
    });
  });
});
