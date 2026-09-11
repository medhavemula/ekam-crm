import { describe, it, expect } from "vitest";
import { idleStateAt, msUntilExpiry } from "./idleSession";

const TIMEOUT = 20 * 60 * 1000; // 20 minutes
const WARNING = 2 * 60 * 1000; //  2 minutes
const T0 = 1_700_000_000_000;
const at = (minutes: number) => T0 + minutes * 60 * 1000;

describe("idleStateAt", () => {
  it("is active immediately after interaction", () => {
    expect(idleStateAt(T0, T0, TIMEOUT, WARNING)).toBe("active");
    expect(idleStateAt(T0, at(1), TIMEOUT, WARNING)).toBe("active");
  });

  it("stays active right up to the warning point", () => {
    // 17:59 is still quiet; 18:00 is when the dialog is due.
    expect(idleStateAt(T0, at(18) - 1, TIMEOUT, WARNING)).toBe("active");
    expect(idleStateAt(T0, at(18), TIMEOUT, WARNING)).toBe("warning");
  });

  it("warns for the whole of the final two minutes", () => {
    expect(idleStateAt(T0, at(19), TIMEOUT, WARNING)).toBe("warning");
    expect(idleStateAt(T0, at(20) - 1, TIMEOUT, WARNING)).toBe("warning");
  });

  it("expires exactly on the timeout, not a tick later", () => {
    expect(idleStateAt(T0, at(20), TIMEOUT, WARNING)).toBe("expired");
    expect(idleStateAt(T0, at(21), TIMEOUT, WARNING)).toBe("expired");
  });

  it("expires a machine that slept past the window", () => {
    // The tab wakes hours later; the very next poll must sign the session out.
    expect(idleStateAt(T0, at(8 * 60), TIMEOUT, WARNING)).toBe("expired");
  });

  it("treats a clock that moved backwards as active", () => {
    // Otherwise a system time correction signs people out for no visible reason.
    expect(idleStateAt(at(5), T0, TIMEOUT, WARNING)).toBe("active");
  });
});

describe("msUntilExpiry", () => {
  it("counts down from the full window", () => {
    expect(msUntilExpiry(T0, T0, TIMEOUT)).toBe(TIMEOUT);
    expect(msUntilExpiry(T0, at(19), TIMEOUT)).toBe(60 * 1000);
  });

  it("never goes negative once expired", () => {
    // The countdown is rendered directly, so a negative would show as "-3:12".
    expect(msUntilExpiry(T0, at(25), TIMEOUT)).toBe(0);
  });
});
