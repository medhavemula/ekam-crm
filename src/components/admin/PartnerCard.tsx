import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MoreVertical } from "lucide-react";

export interface PartnerCardProps {
  name: string;
  role: string;
  location: string;
  registrationDate: string;
  renewalDate: string;
  expiryDate: string;
  expiryStatus?: "upcoming" | "expired" | "active";
  daysLeft: number | null;
  noOfChapters: number;
  avatarColor: string;
  avatarInitial: string;
  onEdit?: () => void;
  onRenew?: () => void;
  onBlock?: () => void;
  blockLabel?: string;
  onOpen?: () => void;
  /** Outcome of the last invite email; undefined for partners created before this was tracked. */
  inviteStatus?: "SENT" | "FAILED";
  /** Why the last invite failed, shown on the warning row. */
  inviteError?: string | null;
  /** Omitted once the partner has set their own password — resending would lock them out. */
  onResendInvite?: () => void;
  resendingInvite?: boolean;
  /** Irreversible: removes the partner and deletes the account behind it. */
  onDelete?: () => void;
  /** Entrance delay, in seconds, so a grid staggers rather than snapping in. */
  delay?: number;
}

/** "2025-01-12" -> "12 Jan 25"; empty for anything unparseable. */
function formatDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

type Health = { tone: "ok" | "warn" | "bad" | "muted"; label: string };

/**
 * Reduces the expiry fields to the one sentence a reader actually wants.
 *
 * The previous card printed three dates in a label-colon-value table and left
 * the reader to subtract today from the expiry themselves; the days-left badge
 * that answered it was buried mid-table. Here the answer is the headline and
 * the dates are demoted to a supporting line.
 */
function healthOf(daysLeft: number | null, status: PartnerCardProps["expiryStatus"], blocked: boolean): Health {
  if (blocked) return { tone: "muted", label: "Blocked" };
  if (daysLeft != null && Number.isFinite(daysLeft)) {
    if (daysLeft <= 0) return { tone: "bad", label: "Expired" };
    if (daysLeft <= 30) return { tone: "warn", label: `Expires in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}` };
    return { tone: "ok", label: `Active · ${daysLeft} days left` };
  }
  if (status === "expired") return { tone: "bad", label: "Expired" };
  if (status === "upcoming") return { tone: "warn", label: "Expires within 30 days" };
  return { tone: "ok", label: "Active" };
}

const TONE: Record<Health["tone"], { dot: string; text: string }> = {
  ok: { dot: "bg-[var(--ov-s3)]", text: "text-[var(--ov-ink-2)]" },
  warn: { dot: "bg-[var(--ov-ember)]", text: "text-[var(--ov-ember)]" },
  bad: { dot: "bg-[var(--ov-danger)]", text: "text-[var(--ov-danger)]" },
  muted: { dot: "bg-[var(--ov-ink-5)]", text: "text-[var(--ov-ink-4)]" },
};

export const PartnerCard: React.FC<PartnerCardProps> = ({
  name,
  role,
  location,
  registrationDate,
  renewalDate,
  expiryDate,
  expiryStatus = "active",
  daysLeft,
  noOfChapters,
  avatarColor,
  avatarInitial,
  onEdit,
  onRenew,
  onBlock,
  blockLabel = "Block",
  onOpen,
  inviteStatus,
  inviteError,
  onResendInvite,
  resendingInvite = false,
  onDelete,
  delay = 0,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const blocked = blockLabel === "Unblock";
  const health = healthOf(daysLeft, expiryStatus, blocked);
  const tone = TONE[health.tone];

  const isUrgentRenewal =
    !blocked &&
    ((daysLeft != null && daysLeft <= 30) ||
      expiryStatus === "expired" ||
      expiryStatus === "upcoming");

  useEffect(() => {
    if (!showMenu) return;
    const onDocClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowMenu(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showMenu]);

  const entrance = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <motion.div
      {...entrance}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] transition-colors duration-200 hover:ring-[color:var(--ov-line-strong)] ${
        blocked ? "opacity-75" : ""
      }`}
    >
      {/* The whole card opens the partner */}
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${name}`}
          className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        />
      )}

      <div className="pointer-events-none relative z-10 p-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="ekam-figure grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[16px] font-bold text-[var(--ov-on-ember)]"
            style={{ backgroundColor: avatarColor }}
          >
            {avatarInitial}
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold leading-tight text-[var(--ov-ink)]">
              {name}
            </h3>
            <p className="ekam-eyebrow mt-1 truncate text-[9.5px] font-semibold text-[var(--ov-ink-4)]">
              {role ? role.replace(/_/g, " ") : "—"}
            </p>
            {location && (
              <p className="mt-1 truncate text-[12px] text-[var(--ov-ink-3)]">{location}</p>
            )}
          </div>

          {(onBlock || onResendInvite || onDelete || (onRenew && !isUrgentRenewal)) && (
            <div className="pointer-events-auto relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu((v) => !v);
                }}
                aria-haspopup="menu"
                aria-expanded={showMenu}
                aria-label={`More options for ${name}`}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </button>

              {showMenu && (
                <div
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-9 z-20 w-44 rounded-xl bg-[var(--ov-raised)] p-1 shadow-[var(--ov-shadow-pop)] ring-1 ring-[color:var(--ov-line-strong)]"
                >
                  {onRenew && !isUrgentRenewal && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowMenu(false);
                        onRenew();
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[var(--ov-ink-2)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                    >
                      Renew membership
                    </button>
                  )}
                  {onResendInvite && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={resendingInvite}
                      onClick={() => {
                        setShowMenu(false);
                        onResendInvite();
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[var(--ov-ink-2)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                    >
                      {resendingInvite ? "Sending…" : "Resend invite"}
                    </button>
                  )}
                  {onBlock && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowMenu(false);
                        onBlock?.();
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[var(--ov-ink-2)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                    >
                      {blockLabel}
                    </button>
                  )}
                  {onDelete && (
                    <>
                      <div
                        role="separator"
                        className="my-1 h-px bg-[color:var(--ov-line-faint)]"
                      />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowMenu(false);
                          onDelete();
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[color:var(--ov-danger,#dc2626)] transition-colors hover:bg-[color:var(--ov-danger-fill,rgba(220,38,38,0.12))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status leads. It is the one thing that decides whether this partner
            needs attention today. */}
        <div className="mt-4 flex items-center gap-2">
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
          <span className={`truncate text-[12.5px] font-medium ${tone.text}`}>{health.label}</span>
        </div>

        {/* An undelivered invite means this partner never received their
            temporary password and cannot sign in. Surface it here rather than
            leaving the admin to discover it from a complaint. */}
        {inviteStatus === "FAILED" && (
          <div
            className="mt-2 rounded-lg bg-[color:var(--ov-danger-fill,rgba(220,38,38,0.12))] px-2.5 py-1.5"
            title={inviteError || undefined}
          >
            <p className="truncate text-[12px] font-medium text-[color:var(--ov-danger,#dc2626)]">
              Invite email failed — not delivered
            </p>
          </div>
        )}

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-[color:var(--ov-line-faint)] pt-4">
          <div>
            <p className="ekam-figure text-[26px] font-semibold leading-none text-[var(--ov-ink)]">
              {noOfChapters}
            </p>
            <p className="ekam-eyebrow mt-1.5 text-[9.5px] font-semibold text-[var(--ov-ink-4)]">
              {noOfChapters === 1 ? "Chapter" : "Chapters"}
            </p>
          </div>

          {/* Dates are reference, not headline — one quiet stack, right-aligned. */}
          <dl className="min-w-0 text-right text-[11px] leading-5 text-[var(--ov-ink-4)]">
            <div className="flex justify-end gap-1.5">
              <dt>Registered</dt>
              <dd className="ekam-figure text-[var(--ov-ink-3)]">{formatDate(registrationDate)}</dd>
            </div>
            <div className="flex justify-end gap-1.5">
              <dt>Renewed</dt>
              <dd className="ekam-figure text-[var(--ov-ink-3)]">{formatDate(renewalDate)}</dd>
            </div>
            <div className="flex justify-end gap-1.5">
              <dt>Expires</dt>
              <dd className="ekam-figure text-[var(--ov-ink-3)]">{formatDate(expiryDate)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="pointer-events-auto relative z-10 mt-auto flex gap-2 border-t border-[color:var(--ov-line-faint)] p-3">
        {blocked ? (
          <span className="grid h-9 flex-1 place-items-center rounded-lg bg-[var(--ov-fill-subtle)] text-[13px] font-medium text-[var(--ov-ink-4)]">
            Blocked
          </span>
        ) : isUrgentRenewal ? (
          <>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-9 flex-1 rounded-lg text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                Edit
              </button>
            )}
            {onRenew && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRenew();
                }}
                className="h-9 flex-1 rounded-lg bg-[#E85A14] text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-[#D44E0E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85A14] focus-visible:ring-offset-2"
              >
                Renew Now
              </button>
            )}
          </>
        ) : (
          <>
            {onOpen && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen();
                }}
                className="h-9 flex-1 rounded-lg bg-[#0B2130] text-[13px] font-medium text-white transition-colors hover:bg-[#132D40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2130]"
              >
                View Profile
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className={`h-9 flex-1 rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85A14] ${
                  onOpen
                    ? "text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]"
                    : "bg-[#0B2130] text-white hover:bg-[#132D40]"
                }`}
              >
                Edit
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default PartnerCard;
