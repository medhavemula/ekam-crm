import React, { useMemo, useState } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, MapPin } from "lucide-react";
import Navbar from "../../../components/navigation/Navbar";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { useToast } from "../../../components/toast/ToastProvider";
import {
  useGetSuperAdminPendingApprovalsQuery,
  useApproveMemberMutation,
  useRejectMemberMutation,
} from "../../../services/approvalsApi";

/**
 * Registrations that reached the Super Admin because their chapter has no ED, RD or
 * ARD to review them (WEB-AUTH-06).
 *
 * The server returns only fallback-routed applications, so nothing listed here is
 * also sitting in a reviewer's own queue.
 */
type Applicant = {
  _id: string;
  user?: {
    name?: string;
    email?: string;
    basicInfo?: { phone?: string };
  };
  scope?: { chapter?: { name?: string }; region?: { name?: string } };
};

const getErrMsg = (e: any) =>
  e?.data?.message || e?.error || e?.message || "Something went wrong";

export const SuperAdminApprovalsPage: React.FC = () => {
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useGetSuperAdminPendingApprovalsQuery();
  const [approveMember, { isLoading: isApproving }] = useApproveMemberMutation();
  const [rejectMember, { isLoading: isRejecting }] = useRejectMemberMutation();

  const [selected, setSelected] = useState<Applicant | null>(null);
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [remark, setRemark] = useState("");
  const reduceMotion = useReducedMotion();

  const applicants: Applicant[] = useMemo(() => {
    const d: any = (data as any)?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.items)) return d.items;
    return [];
  }, [data]);

  const close = () => {
    setMode(null);
    setSelected(null);
    setRemark("");
  };

  const confirm = async () => {
    if (!selected || !mode) return;
    const name = selected.user?.name || selected.user?.email || "This applicant";
    try {
      if (mode === "approve") {
        await approveMember({ approvalId: selected._id }).unwrap();
        showToast({
          title: "Approved",
          description: `${name} was approved and sent their login credentials.`,
          kind: "success",
        });
      } else {
        await rejectMember({ approvalId: selected._id, data: { remark: remark.trim() } }).unwrap();
        showToast({
          title: "Rejected",
          description: `${name}'s application was rejected.`,
          kind: "success",
        });
      }
      close();
      refetch();
    } catch (e: any) {
      showToast({
        title: mode === "approve" ? "Could not approve" : "Could not reject",
        description: getErrMsg(e),
        kind: "error",
      });
      // Somebody else already decided this one — drop the stale card rather than
      // leaving a button that will keep failing.
      if (e?.data?.code === "ALREADY_PROCESSED") {
        close();
        refetch();
      }
    }
  };

  const locationOf = (a: Applicant) =>
    [a.scope?.chapter?.name, a.scope?.region?.name].filter(Boolean).join(" · ");

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <motion.header
          initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <div className="mb-2">
            <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                Registration Queue
              </span>
            </div>
          </div>
          <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
            Approvals
          </h1>
          <p className="mt-2.5 text-[12px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
            {!isLoading && !isError && (
              <>
                <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
                  {applicants.length}
                </span>{" "}
                {applicants.length === 1 ? "registration" : "registrations"} waiting ·{" "}
              </>
            )}
            Chapters with no Executive, Regional or Assistant Regional Director assigned —
            they come to you so no applicant is left without a reviewer.
          </p>
        </motion.header>

        {isError ? (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
            Couldn't load the queue. Refresh and try again.
          </div>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[196px] animate-pulse rounded-2xl bg-[var(--ov-panel)] ring-1 ring-[color:var(--ov-line-faint)]"
              />
            ))}
          </div>
        ) : applicants.length === 0 ? (
          // An empty queue here is the good outcome, not a dead end. A dashed
          // outline rather than a solid card says "nothing is here" instead of
          // presenting emptiness as content, and the icon and its wash are the
          // same hue — an ember wash behind a teal tick read as a mistake.
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-dashed border-[color:var(--ov-line-strong)] bg-[var(--ov-fill-subtle)] px-6 py-16 text-center"
          >
            <span
              aria-hidden="true"
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--ov-success-wash)] text-[var(--ov-success)] ring-1 ring-[color:var(--ov-success-wash)]"
            >
              <CheckCircle2 className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[17px] font-semibold text-[var(--ov-ink)]">
              You're all caught up
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              Registrations only land here when a chapter has no director to review them.
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {applicants.map((a, index) => {
              const name = a.user?.name || "Unknown";
              const where = locationOf(a);
              return (
                <motion.article
                  key={a._id}
                  initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: Math.min(index, 11) * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="flex h-full flex-col rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:ring-[color:var(--ov-line-strong)]"
                >
                  <div className="flex items-start gap-3 p-5">
                    <span
                      aria-hidden="true"
                      className="ekam-figure grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[16px] font-bold text-[var(--ov-on-ember)]"
                      style={{ backgroundColor: "var(--ov-ember-fill)" }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[15px] font-semibold leading-tight text-[var(--ov-ink)]">
                        {name}
                      </h2>
                      {a.user?.email && (
                        <p
                          className="mt-1 truncate text-[12.5px] text-[var(--ov-ink-3)]"
                          title={a.user.email}
                        >
                          {a.user.email}
                        </p>
                      )}
                      {a.user?.basicInfo?.phone && (
                        <p className="ekam-figure mt-0.5 truncate text-[12px] text-[var(--ov-ink-4)]">
                          {a.user.basicInfo.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Where they applied from. A solid ember badge made every card
                      shout the one thing that is the same on all of them; it is
                      context, so it reads as context. */}
                  {where && (
                    <p className="flex items-center gap-1.5 px-5 pb-4 text-[12px] text-[var(--ov-ink-3)]">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--ov-ink-5)]" aria-hidden="true" />
                      <span className="truncate" title={where}>{where}</span>
                    </p>
                  )}

                  {/* Approve is the expected outcome, so it carries the weight.
                      Previously Accept was an outline and Reject a solid slab,
                      which pointed the eye at the wrong one. */}
                  <div className="mt-auto flex gap-2 border-t border-[color:var(--ov-line-faint)] p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(a);
                        setMode("reject");
                        setRemark("");
                      }}
                      className="h-9 flex-1 rounded-lg text-[13px] font-medium text-[var(--ov-ink-3)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(a);
                        setMode("approve");
                      }}
                      className="h-9 flex-1 rounded-lg bg-[var(--ov-ember-fill)] text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)]"
                    >
                      Approve
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </main>

      <ConfirmationDialog
        isOpen={mode !== null}
        onClose={close}
        onConfirm={confirm}
        isSubmitting={isApproving || isRejecting}
        actionType={mode === "reject" ? "reject" : "accept"}
        title={
          mode === "reject"
            ? `Reject ${selected?.user?.name || "this application"}?`
            : `Approve ${selected?.user?.name || "this application"}?`
        }
        description={
          mode === "reject"
            ? "They'll be told their application wasn't approved, and can apply again with the same email."
            : "They become an active member and are emailed a temporary password to sign in with."
        }
        confirmText={mode === "reject" ? "Reject" : "Approve"}
        confirmDisabled={mode === "reject" && !remark.trim()}
      >
        {mode === "reject" && (
          <div className="w-full text-left">
            <label
              htmlFor="reject-remark"
              className="mb-1.5 block text-[12px] font-medium text-[var(--ov-ink-3)]"
            >
              Reason <span className="text-[var(--ov-ember)]">*</span>
            </label>
            <textarea
              id="reject-remark"
              rows={3}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Why is this application being rejected?"
              className="w-full rounded-xl border border-[color:var(--ov-line)] bg-[var(--ov-fill-subtle)] px-3 py-2 text-[13px] text-[var(--ov-ink)] placeholder:text-[var(--ov-ink-5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            />
            <p className="mt-1.5 text-[11px] text-[var(--ov-ink-4)]">
              The applicant is shown this reason.
            </p>
          </div>
        )}
      </ConfirmationDialog>
    </div>
  );
};

export default SuperAdminApprovalsPage;
