// Shared date utilities for building from/to ISO params and default dates

// Returns the first day of the current week (Monday) in YYYY-MM-DD format
export function getFirstDayOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  const monday = new Date(now.setDate(diff));
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Returns the last day of the current week (Sunday) in YYYY-MM-DD format
export function getLastDayOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? 0 : 7); // Adjust for Sunday end
  const sunday = new Date(now.setDate(diff));
  const yyyy = sunday.getFullYear();
  const mm = String(sunday.getMonth() + 1).padStart(2, '0');
  const dd = String(sunday.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Returns the first day of the current month in YYYY-MM-DD format
export function getFirstDayOfMonth(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

// Returns the last day of the current month in YYYY-MM-DDTHH:mm:ss format
export function getLastDayOfMonth(): string {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const yyyy = lastDay.getFullYear();
  const mm = String(lastDay.getMonth() + 1).padStart(2, '0');
  const dd = String(lastDay.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Returns the first day of the current year in YYYY-MM-DD format
export function getFirstDayOfYear(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  return `${yyyy}-01-01`;
}

// Returns the last day of the current year in YYYY-MM-DD format
export function getLastDayOfYear(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  return `${yyyy}-12-31`;
}

// Returns today's date in YYYY-MM-DD (suitable for <input type="date">)
export function todayInputDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Returns an input date string (YYYY-MM-DD) for N days ago from today
export function inputDateDaysAgo(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() - days);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Start date for the last two weeks window (inclusive of today makes 14 days)
export function lastTwoWeeksStartInputDate(): string {
  return inputDateDaysAgo(13);
}

// Convert an input date string (YYYY-MM-DD) to start-of-day ISO
export function toStartOfDayISO(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  return `${dateStr}T00:00:00.000Z`;
}

// Convert an input date string (YYYY-MM-DD) to end-of-day ISO
export function toEndOfDayISO(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  return `${dateStr}T23:59:59.999Z`;
}

// Splits a YYYY-MM-DD field value into its parts, or nothing if it is empty
// or malformed - a cleared filter field has to drop the bound, not send one.
function ymdParts(dateStr?: string): [number, number, number] | undefined {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return [y, m, d];
}

export function toStartOfLocalDayISO(dateStr?: string): string | undefined {
  const parts = ymdParts(dateStr);
  if (!parts) return undefined;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

export function toEndOfLocalDayISO(dateStr?: string): string | undefined {
  const parts = ymdParts(dateStr);
  if (!parts) return undefined;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}
