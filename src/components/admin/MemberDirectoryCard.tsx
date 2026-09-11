/**
 * One member in a chapter's directory.
 *
 * Two things drove the redesign. The status used to be a full-width green slab
 * sitting in the action row next to "View Profile" — it looked like the primary
 * button on the card but was a `div` that did nothing, so the one real action
 * was the quieter of the two. Status is a state, not an action: it reads as a
 * dot and a word beside the name now, and the action row holds only things that
 * can be pressed. The chapter chip joins it on that line rather than taking a
 * solid ember block of its own on every card in a single-chapter list.
 *
 * It also lives at module scope. It used to be declared inside MembersPage, so
 * every parent render produced a new component type and React unmounted and
 * remounted the whole grid — losing the open overflow menu each time.
 */

import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MoreVertical } from "lucide-react";
import {
  useUnblockUserMutation,
  useResendMemberCredentialsMutation,
} from "../../services/approvalsApi";

export interface MemberDirectoryRecord {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  status: "Joined" | "Blocked" | "Deleted" | "Pending";
  isRequest?: boolean;
  /** WEB-BUS-06: when a pending request was submitted, for the approval-queue card. */
  requestedAt?: string;
  chapterName?: string;
  requestType?: string;
  requestedModule?: "business" | "professional" | "social";
  /** True while the member still holds an unused temporary password. */
  mustChangePassword?: boolean;
  credentialDelivery?: { status?: "SENT" | "FAILED"; lastSentAt?: string; error?: string };
}

export type MemberDirectoryTab = "all" | "requests" | "module-requests" | "eligible";

export interface MemberDirectoryCardProps {
  rec: MemberDirectoryRecord;
  /** Approval queues show Accept/Reject instead of the member actions. */
  requestMode?: boolean;
  /** ED/RD/ARD — the roles that may block, move or delete. */
  isEdRole: boolean;
  /** Those roles plus chapter and launch directors: who sees the menu at all. */
  canOpenMenu: boolean;
  activeTab: MemberDirectoryTab;
  moduleType: "business" | "professional" | "social";
  grantActionLabel: string;
  /** The chapter this list belongs to, shown when the record carries no other. */
  chapterLabel: string;
  openMenuFor: string | null;
  setOpenMenuFor: (id: string | null) => void;
  onNavigate: (path: string, options?: { state?: unknown }) => void;
  onToast: (opts: { title: string; description?: string; kind?: "success" | "error" }) => void;
  onRefetch?: () => void;
  /** Opens the page's confirmation dialog; the card never mutates directly. */
  onConfirm: (kind: "block" | "moved" | "delete", rec: MemberDirectoryRecord) => void;
  onApprove: (rec: MemberDirectoryRecord) => void;
  onReject: (rec: MemberDirectoryRecord) => void;
  onOpenRejectionModal: (rec: MemberDirectoryRecord) => void;
  /** Entrance delay, in seconds, so a grid staggers rather than snapping in. */
  delay?: number;
}

type Tone = "ok" | "warn" | "bad" | "muted";

/** "Expired" was the old label for a pending record, which it never was. */
const STATUS: Record<MemberDirectoryRecord["status"], { label: string; tone: Tone }> = {
  Joined: { label: "Active", tone: "ok" },
  Blocked: { label: "Blocked", tone: "warn" },
  Deleted: { label: "Deleted", tone: "bad" },
  Pending: { label: "Awaiting approval", tone: "muted" },
};

const TONE: Record<Tone, { dot: string; text: string; chip?: string }> = {
  ok: { dot: "bg-[var(--ov-s3)]", text: "text-[var(--ov-ink-2)]" },
  warn: { dot: "bg-[var(--ov-ember)]", text: "text-[var(--ov-ember)]" },
  bad: { dot: "bg-[var(--ov-danger)]", text: "text-[var(--ov-danger)]" },
  muted: {
    dot: "bg-[var(--ov-pending)]",
    text: "text-[var(--ov-pending)]",
    chip:
      "rounded-md bg-[var(--ov-pending-wash)] px-2 py-0.5 ring-1 ring-[color:var(--ov-pending-wash)]",
  },
};

/**
 * "Applied <date>" on a pending request card. Mirrors the profile timeline's own
 * fix for this: a stored 1970 epoch or an unparseable value must never render as
 * a date - it means the date genuinely is not known, so the line is left off.
 */
const formatRequestedAt = (value: string): string | null => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getTime() === 0) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const initialsOf = (name: string) =>
  name
    ?.trim()
    ?.split(/\s+/)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join("") || "U";

const GHOST =
  "h-9 flex-1 rounded-lg text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:pointer-events-none disabled:opacity-50";

const PRIMARY =
  "h-9 flex-1 rounded-lg bg-[var(--ov-ember-fill)] text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)]";

export const MemberDirectoryCard: React.FC<MemberDirectoryCardProps> = ({
  rec,
  requestMode,
  isEdRole,
  canOpenMenu,
  activeTab,
  moduleType,
  grantActionLabel,
  chapterLabel,
  openMenuFor,
  setOpenMenuFor,
  onNavigate,
  onToast,
  onRefetch,
  onConfirm,
  onApprove,
  onReject,
  onOpenRejectionModal,
  delay = 0,
}) => {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [unblockUser] = useUnblockUserMutation();
  const [resendMemberCredentials] = useResendMemberCredentialsMutation();

  const isRequest = rec.isRequest === true;
  const isModuleRequest = rec.requestType === "MODULE_ACCESS";
  const isDeleted = rec.status === "Deleted";
  const status = STATUS[rec.status] ?? STATUS.Joined;
  const tone = TONE[status.tone];
  const menuOpen = openMenuFor === rec.id;

  const baseActions: { key: string; label: string }[] = isRequest
    ? [{ key: "view", label: "View profile" }]
    : activeTab === "eligible"
      ? [
          { key: "view", label: "View profile" },
          { key: "grantAccess", label: grantActionLabel },
        ]
      : rec.status === "Blocked"
        ? [
            { key: "unblock", label: "Unblock" },
            { key: "moved", label: "Move" },
          ]
        : [
            { key: "block", label: "Block" },
            { key: "moved", label: "Move" },
          ];

  // Restrict sensitive actions to ED roles only.
  const actions = baseActions.filter((a) =>
    ["block", "unblock", "moved"].includes(a.key) ? isEdRole : true,
  );

  // Deletion is irreversible and ED-only. Not offered on pending requests —
  // those are rejected, not deleted.
  if (isEdRole && !isRequest && activeTab !== "eligible") {
    actions.push({ key: "delete", label: "Delete member" });
  }

  // A member who still holds an unused temporary password may simply never have
  // received it. Offer a resend — but only until they set their own password,
  // after which reissuing would lock them out of their account.
  if (isEdRole && !isRequest && rec.mustChangePassword === true) {
    actions.push({
      key: "resendCredentials",
      label:
        rec.credentialDelivery?.status === "FAILED"
          ? "Resend credentials (last send failed)"
          : "Resend credentials",
    });
  }

  const viewProfile = (userId: string) => {
    if (isRequest && rec.id !== rec.userId) {
      onNavigate(`/admin/regional-board/members/${userId}/view`, { state: { requestId: rec.id } });
    } else if (activeTab === "eligible") {
      onNavigate(`/admin/regional-board/members/${userId}/view`, {
        state: { mode: "grant-ed-modules", sourceTab: "eligible", targetModule: moduleType },
      });
    } else {
      onNavigate(`/admin/regional-board/members/${userId}/view`);
    }
  };

  const onAction = async (key: string) => {
    try {
      const userId = rec.userId || rec.id;
      if (key === "approve") {
        await onApprove(rec);
      } else if (key === "view") {
        viewProfile(userId);
      } else if (key === "grantAccess") {
        onNavigate(`/admin/regional-board/members/${userId}/view`, {
          state: { mode: "grant-ed-modules", sourceTab: "eligible", targetModule: moduleType },
        });
      } else if (key === "unblock") {
        await unblockUser(userId as string).unwrap();
        onToast({ title: "Unblocked", description: "Member has been unblocked", kind: "success" });
        setTimeout(() => onRefetch?.(), 500);
      } else if (key === "block" || key === "moved" || key === "delete") {
        onConfirm(key, rec);
      } else if (key === "resendCredentials") {
        // Reports real delivery: the API returns success only when the mail
        // actually left, so a broken mail server surfaces here.
        const res = await resendMemberCredentials(userId as string).unwrap();
        onToast({
          title: "Credentials sent",
          description: res?.message || `A new temporary password was emailed to ${rec.name}.`,
          kind: "success",
        });
        setTimeout(() => onRefetch?.(), 500);
      }
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || "Action failed";
      onToast({ title: "Error", description: String(msg), kind: "error" });
    } finally {
      setOpenMenuFor(null);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) setOpenMenuFor(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuFor(null);
    };
    document.addEventListener("mousedown", onDocMouseDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, setOpenMenuFor]);

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
      ref={containerRef}
      className={`group relative flex h-full flex-col overflow-visible rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] transition-colors duration-200 hover:ring-[color:var(--ov-line-strong)] ${
        isDeleted ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-1 items-stretch gap-3.5 p-5">
        <span
          aria-hidden="true"
          className="ekam-figure grid h-12 w-12 shrink-0 self-start place-items-center rounded-2xl bg-[var(--ov-fill-subtle)] text-[15px] font-semibold text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)]"
        >
          {initialsOf(rec.name)}
        </span>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-[var(--ov-ink)]">
            {rec.name || "Unknown"}
          </h3>
          {rec.email && (
            <p className="mt-1 truncate text-[12.5px] text-[var(--ov-ink-3)]" title={rec.email}>
              {rec.email}
            </p>
          )}
          {rec.phone && (
            <p className="ekam-figure mt-0.5 truncate text-[12px] text-[var(--ov-ink-4)]">
              {rec.phone}
            </p>
          )}
          {isRequest && rec.requestedAt && formatRequestedAt(rec.requestedAt) && (
            <p className="mt-0.5 truncate text-[12px] text-[var(--ov-ink-4)]">
              Applied {formatRequestedAt(rec.requestedAt)}
            </p>
          )}

          {/* State and scope on one quiet line, in place of the green slab in
              the action row and the solid ember chip above it. */}
          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-[12px]">
            <span className={`flex items-center gap-1.5 ${tone.chip ?? ""}`}>
              <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
              <span className={`font-medium ${tone.text}`}>{status.label}</span>
            </span>
            {isModuleRequest ? (
              <span className="ekam-eyebrow rounded-md bg-[var(--ov-ember-wash)] px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--ov-ember)]">
                {rec.requestedModule?.toUpperCase()} module
              </span>
            ) : (
              activeTab !== "eligible" && (
                <>
                  <span aria-hidden="true" className="text-[var(--ov-ink-5)]">
                    ·
                  </span>
                  <span className="truncate text-[var(--ov-ink-4)]">
                    {rec.chapterName || chapterLabel}
                  </span>
                </>
              )
            )}
          </div>
        </div>

        {canOpenMenu && actions.length > 0 && (
          <div className="relative shrink-0 self-start">
            <button
              type="button"
              onClick={() => setOpenMenuFor(menuOpen ? null : rec.id)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`More options for ${rec.name}`}
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-9 z-30 w-52 rounded-xl bg-[var(--ov-raised)] p-1 shadow-[var(--ov-shadow-pop)] ring-1 ring-[color:var(--ov-line-strong)]"
              >
                {actions.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    role="menuitem"
                    onClick={() => onAction(a.key)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${
                      a.key === "delete"
                        ? "text-[var(--ov-danger)] hover:bg-[var(--ov-danger-wash)]"
                        : "text-[var(--ov-ink-2)] hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto flex gap-2 border-t border-[color:var(--ov-line-faint)] p-3">
        {requestMode ? (
          isEdRole ? (
            <>
              <button
                type="button"
                className={GHOST}
                onClick={() => (isModuleRequest ? onOpenRejectionModal(rec) : onReject(rec))}
              >
                Reject
              </button>
              <button type="button" className={PRIMARY} onClick={() => onApprove(rec)}>
                Accept
              </button>
            </>
          ) : (
            <button
              type="button"
              className={GHOST}
              onClick={() => viewProfile(rec.userId || rec.id)}
            >
              View profile
            </button>
          )
        ) : activeTab === "eligible" ? (
          <>
            <button type="button" className={GHOST} onClick={() => viewProfile(rec.id)}>
              View profile
            </button>
            <button
              type="button"
              className={PRIMARY}
              onClick={() =>
                onNavigate(`/admin/regional-board/members/${rec.id}/view`, {
                  state: {
                    mode: "grant-ed-modules",
                    sourceTab: "eligible",
                    targetModule: moduleType,
                  },
                })
              }
            >
              {grantActionLabel}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={GHOST}
            disabled={isDeleted}
            onClick={() => !isDeleted && onNavigate(`/admin/regional-board/members/${rec.id}/view`)}
          >
            View profile
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default MemberDirectoryCard;
