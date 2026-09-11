import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ADMIN_THEME } from "../theme/themeScope";
import { ArrowLeft, RotateCw, ShieldOff } from "lucide-react";
import Navbar from "../components/navigation/Navbar";
import { ConfirmationDialog } from "../components/common/ConfirmationDialog";
import { useToast } from "../components/toast/ToastProvider";
import { useListBlockedUsersQuery, useUnblockUserMutation } from "../services/moderationApi";

const formatDate = (value?: string) => {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function BlockedMembersPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [pendingUnblock, setPendingUnblock] = useState<{ userId: string; name: string } | null>(null);
  const { data, isLoading, isFetching, refetch } = useListBlockedUsersQuery();
  const [unblockUser, { isLoading: isUnblocking }] = useUnblockUserMutation();

  const blockedUsers = data?.data || [];

  const confirmUnblock = async () => {
    if (!pendingUnblock) return;
    try {
      await unblockUser({ userId: pendingUnblock.userId }).unwrap();
      showToast({
        title: "Member unblocked",
        description: `${pendingUnblock.name} can appear in your feeds and messages again.`,
        kind: "success",
      });
      setPendingUnblock(null);
    } catch (error: any) {
      showToast({
        title: "Unable to unblock",
        description: error?.data?.message || "Please try again.",
        kind: "error",
      });
    }
  };

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-[13px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </button>

        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
              Blocked Members
            </h1>
            <p className="mt-2.5 max-w-2xl text-[12px] text-[var(--ov-ink-4)]">
              <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
                {blockedUsers.length}
              </span>{" "}
              {blockedUsers.length === 1 ? "member" : "members"} blocked · Blocked members are hidden
              from your feeds and messages
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-4 text-[12.5px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCw className={`h-4 w-4 ${isFetching ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] ring-1 ring-[color:var(--ov-line)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[76px] animate-pulse border-b border-[color:var(--ov-line-faint)] bg-[var(--ov-panel)] last:border-b-0"
              />
            ))}
          </div>
        ) : blockedUsers.length === 0 ? (
          // Nobody blocked is the good outcome, so it reads as one rather than
          // as a big "0" in a grey circle.
          <div className="rounded-2xl border border-dashed border-[color:var(--ov-line-strong)] bg-[var(--ov-fill-subtle)] px-6 py-16 text-center">
            <span
              aria-hidden="true"
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--ov-success-wash)] text-[var(--ov-success)] ring-1 ring-[color:var(--ov-success-wash)]"
            >
              <ShieldOff className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[17px] font-semibold text-[var(--ov-ink)]">No blocked members</p>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[var(--ov-ink-4)]">
              When you block someone from a post or message, they appear here so you can undo it.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]">
            <div className="divide-y divide-[color:var(--ov-line-faint)]">
              {blockedUsers.map((member) => (
                <div
                  key={member.userId}
                  className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="ekam-figure grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--ov-fill-subtle)] text-[15px] font-bold text-[var(--ov-ink-3)] ring-1 ring-[color:var(--ov-line)]">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                      ) : (
                        member.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold text-[var(--ov-ink)]">
                        {member.name}
                      </div>
                      {member.email ? (
                        <div className="truncate text-[12.5px] text-[var(--ov-ink-3)]">{member.email}</div>
                      ) : null}
                      <div className="mt-1 flex flex-wrap gap-2 text-[11.5px] text-[var(--ov-ink-5)]">
                        <span>Blocked on {formatDate(member.blockedAt)}</span>
                        {member.reason ? <span>Reason: {member.reason}</span> : null}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPendingUnblock({ userId: member.userId, name: member.name })}
                    className="h-10 shrink-0 rounded-xl px-5 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <ConfirmationDialog
        isOpen={pendingUnblock !== null}
        onClose={() => setPendingUnblock(null)}
        onConfirm={confirmUnblock}
        title={`Unblock ${pendingUnblock?.name || "this member"}?`}
        description="Their posts and messages can appear for you again after unblocking."
        confirmText={isUnblocking ? "Unblocking..." : "Unblock"}
        variant="warning"
      />
    </div>
  );
}
