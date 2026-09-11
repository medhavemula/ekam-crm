export type DateRange = { start: string; end: string };

export function reconcileRange(field: "start" | "end", next: string, current: DateRange): DateRange {
  if (field === "start") {
    const end = current.end && next && next > current.end ? next : current.end;
    return { start: next, end };
  }
  const start = current.start && next && next < current.start ? next : current.start;
  return { start, end: next };
}
