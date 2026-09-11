/**
 * Who may act on PALMS, mirrored from the server so the UI offers exactly what the
 * API will accept. These lists are the frontend half of the check — the server
 * enforces the same rules independently in
 * `ekam-backend/src/modules/business/meetings/palms.guard.ts`. Keep them in step:
 * showing a control the server refuses leaves the member pressing a dead button.
 */

/** Editing PALMS attendance — ED / RD / ARD only (WEB-BUS-15). */
export const PALMS_EDIT_ROLES = [
  "EXECUTIVE_DIRECTOR",
  "REGIONAL_DIRECTOR",
  "ASSISTANT_REGIONAL_DIRECTOR",
  "SUPER_ADMIN",
] as const;

/**
 * Reopening a submitted meeting is a different power with a wider set than PALMS
 * editing, so it is gated separately rather than folded into the list above.
 */
export const PALMS_UNLOCK_ROLES = [
  "EXECUTIVE_DIRECTOR",
  "REGIONAL_DIRECTOR",
  "ASSISTANT_REGIONAL_DIRECTOR",
  "LAUNCH_DIRECTOR",
  "COUNTRY_ADMIN",
  "SUPER_ADMIN",
] as const;

const holdsAny = (allowed: readonly string[], roles?: (string | null | undefined)[]) =>
  (roles || []).some((r) => !!r && allowed.includes(r));

/** True when this user's roles allow editing PALMS attendance. */
export function canEditPalms(roles?: (string | null | undefined)[]): boolean {
  return holdsAny(PALMS_EDIT_ROLES, roles);
}

/** True when this user's roles allow reopening a submitted meeting. */
export function canUnlockMeeting(roles?: (string | null | undefined)[]): boolean {
  return holdsAny(PALMS_UNLOCK_ROLES, roles);
}
