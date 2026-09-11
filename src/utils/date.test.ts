import { describe, it, expect } from "vitest";
import {
  toStartOfDayISO,
  toEndOfDayISO,
  toStartOfLocalDayISO,
  toEndOfLocalDayISO,
} from "./date";

// These assertions are timezone-independent on purpose: they check that the
// instant sent to the API lands on the boundary of the day the person actually
// picked in their own timezone, whatever that timezone happens to be.
describe("local day boundaries", () => {
  it("anchors the start of the selected day to the viewer's own midnight", () => {
    const iso = toStartOfLocalDayISO("2026-08-01")!;
    const d = new Date(iso);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // August
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("anchors the end of the selected day to the viewer's own last millisecond", () => {
    const d = new Date(toEndOfLocalDayISO("2026-08-31")!);
    expect(d.getDate()).toBe(31);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
    expect(d.getMilliseconds()).toBe(999);
  });

  it("covers a single selected day end to end with no gap", () => {
    const start = new Date(toStartOfLocalDayISO("2026-09-02")!).getTime();
    const end = new Date(toEndOfLocalDayISO("2026-09-02")!).getTime();
    expect(end - start).toBe(86_400_000 - 1);
  });

  it("hands back nothing for a cleared field, so the bound is simply dropped", () => {
    expect(toStartOfLocalDayISO("")).toBeUndefined();
    expect(toEndOfLocalDayISO(undefined)).toBeUndefined();
  });

  it("keeps the original UTC helpers unchanged for their existing callers", () => {
    expect(toStartOfDayISO("2026-08-01")).toBe("2026-08-01T00:00:00.000Z");
    expect(toEndOfDayISO("2026-08-31")).toBe("2026-08-31T23:59:59.999Z");
  });

  // The API keeps a bound exactly as sent only when it carries a time; a bare
  // YYYY-MM-DD is still floored to a UTC day on arrival, which would undo the
  // timezone anchoring. Both halves have to agree on that, so pin it here.
  it("always carries a time component, so the API treats it as an instant", () => {
    expect(toStartOfLocalDayISO("2026-08-01")).toMatch(/\d{2}:\d{2}/);
    expect(toEndOfLocalDayISO("2026-08-31")).toMatch(/\d{2}:\d{2}/);
  });
});
