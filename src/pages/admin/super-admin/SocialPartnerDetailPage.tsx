import { useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Users,
  Rocket,
  UsersRound,
  Briefcase,
  IndianRupee,
  ArrowUpRight,
} from "lucide-react";
import Navbar from "../../../components/navigation/Navbar";
import { useToast } from "../../../components/toast/ToastProvider";
import { BlockConfirmModal, RenewPartnerModal } from "../../../components/modals";

import {
  useBlockSocialPartnerMutation,
  useUnblockSocialPartnerMutation,
  useRenewSocialPartnerMutation,
  useGetSocialOverviewQuery,
  useGetSocialPartnerQuery,
} from "../../../services/superadmin/adminSocialApi";
import { useGetAdminFiltersQuery } from "../../../services/superadmin/adminFiltersApi";

const getErrMsg = (e: any) =>
  e?.data?.message || e?.error || e?.message || "Something went wrong";

export default function SocialPartnerDetailPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { id = "" } = useParams();
  const location = useLocation() as { state?: any };
  const partner = location.state?.partner;
  const reduceMotion = useReducedMotion();

  const socialId = id || location.state?.socialId || partner?.id;

  const {
    data: partnerData,
    isLoading: isPartnerLoading,
    isError: isPartnerError,
    refetch: refetchPartner,
  } = useGetSocialPartnerQuery(socialId, { skip: !socialId });

  const {
    data: overview,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
  } = useGetSocialOverviewQuery(socialId ? { id: socialId } : { id: "" }, { skip: !socialId });

  const [blockPartner] = useBlockSocialPartnerMutation();
  const [unblockPartner] = useUnblockSocialPartnerMutation();
  const [renewPartner] = useRenewSocialPartnerMutation();
  const { data: filtersRes } = useGetAdminFiltersQuery();

  const countryById = useMemo(() => {
    const map: Record<string, string> = {};
    (filtersRes?.data?.countries ?? []).forEach((c: any) => {
      map[String(c.id)] = c.name;
    });
    return map;
  }, [filtersRes]);

  const regionById = useMemo(() => {
    const map: Record<string, string> = {};
    (filtersRes?.data?.regions ?? []).forEach((r: any) => {
      map[String(r.id)] = r.name;
    });
    return map;
  }, [filtersRes]);

  const ed = partnerData?.data || partner || {};
  const kpis = overview?.data || {};

  const isLoading = (isPartnerLoading || isOverviewLoading) && !ed?.name;

  /**
   * Days remaining on the licence.
   *
   * Preferring the API's own count, but falling back to the expiry date when it
   * is absent. The detail endpoint returns expiryDate without daysLeft, so
   * keying only on daysLeft made the card announce "No expiry on record"
   * directly above an Expiry of 30/09/2026 — the page contradicting itself
   * about a value it was rendering two lines below.
   *
   * NaN only when there is genuinely no expiry date to reason about.
   */
  const daysLeft = (() => {
    if (ed?.daysLeft != null) return Number(ed.daysLeft);
    if (!ed?.expiryDate) return Number.NaN;
    const expiry = new Date(ed.expiryDate);
    if (Number.isNaN(expiry.getTime())) return Number.NaN;
    // Whole days in UTC, the same arithmetic as daysLeftUTC on the server —
    // but deliberately not its Math.max(0, ...) clamp. The server pairs that
    // clamp with a computed EXPIRED status, so a past date is still reported
    // correctly there. Here there is no such companion, and clamping to 0 made
    // a licence that lapsed last week read "Expires today".
    const MS_PER_DAY = 86_400_000;
    const now = new Date();
    const startUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const endUtc = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate());
    return Math.ceil((endUtc - startUtc) / MS_PER_DAY);
  })();

  // "Not ACTIVE" is not the same as "blocked": an EXPIRED or INACTIVE partner
  // has never been blocked, and the button offered to Unblock them.
  const blockLabel = (ed?.status || "").toUpperCase() === "BLOCKED" ? "Unblock" : "Block";
  const isBlocked = blockLabel === "Unblock";

  /**
   * The expiry fields reduced to the one sentence a reader wants.
   *
   * The header used to render a badge only for the `upcoming` and `expired`
   * bands, so an active licence said nothing at all — and because `upcoming`
   * was any `daysLeft <= 30`, a licence already past its date printed a
   * negative count: "-5 Days Left".
   */
  const health = (() => {
    if (isBlocked) return { tone: "muted" as const, label: "Blocked" };
    if (!Number.isFinite(daysLeft)) return { tone: "muted" as const, label: "No expiry on record" };
    // Whether the licence has lapsed is the API's call, not something to infer
    // from the day count: a term runs to the end of its expiry date, so its
    // final day counts 0 days left while still being active.
    if ((ed?.status || "").toUpperCase() === "EXPIRED")
      return { tone: "bad" as const, label: "Expired" };
    if (daysLeft < 0) return { tone: "bad" as const, label: "Past expiry date" };
    if (daysLeft === 0) return { tone: "warn" as const, label: "Expires today" };
    if (daysLeft <= 30)
      return {
        tone: "warn" as const,
        label: `Expires in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`,
      };
    return { tone: "ok" as const, label: `Active · ${daysLeft} days left` };
  })();

  const TONE = {
    ok: { dot: "bg-[var(--ov-s3)]", text: "text-[var(--ov-ink-2)]" },
    warn: { dot: "bg-[var(--ov-ember)]", text: "text-[var(--ov-ember)]" },
    bad: { dot: "bg-[var(--ov-danger)]", text: "text-[var(--ov-danger)]" },
    muted: { dot: "bg-[var(--ov-ink-5)]", text: "text-[var(--ov-ink-4)]" },
  }[health.tone];

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);

  const stats = useMemo(() => {
    const d = kpis as Record<string, any>;
    const currency = String(d.currency || "INR").toUpperCase();
    const fmt = (amount: number) => {
      if (currency === "INR") return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
      return `${currency} ${Number(amount || 0).toLocaleString()}`;
    };
    return [
      {
        title: "Chapters",
        key: "chapters",
        value: String(Number(d.chapters ?? 0)),
        Icon: Building2,
        href: true,
      },
      {
        title: "Regional Members",
        key: "regionalMembers",
        value: String(Number(d.regionalMembers ?? 0)),
        Icon: Users,
      },
      {
        title: "Ready to launch chapters",
        key: "readyToLaunchChapters",
        value: String(Number(d.readyToLaunchChapters ?? 0)),
        Icon: Rocket,
      },
      {
        title: "Total Members",
        key: "totalMembers",
        value: String(Number(d.totalMembers ?? 0)),
        Icon: UsersRound,
      },
      {
        title: "Business Opportunity",
        key: "opportunities",
        value: String(Number(d.opportunities ?? 0)),
        Icon: Briefcase,
      },
      {
        title: "Business Closed",
        key: "businessClosedAmount",
        value: fmt(Number(d.businessClosedAmount ?? 0)),
        Icon: IndianRupee,
      },
    ];
  }, [kpis]);

  const formatDMY = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  };

  const prettifyRole = (r?: string) => {
    if (!r) return "—";
    return r
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  // The header printed `ed.country` straight out when it was a string — which is
  // an id on this endpoint, so the card showed a raw uuid under the name. The
  // lookup the Renew modal already builds resolves it to a name.
  const countryName = (() => {
    const c = (ed as any)?.country;
    if (!c) return "";
    if (typeof c === "object") return c.name || "";
    return countryById[String(c)] || "";
  })();

  const dates = [
    { label: "Registration", value: formatDMY(ed?.registrationDate) },
    { label: "Renewal", value: formatDMY(ed?.renewalDate) },
    { label: "Expiry", value: formatDMY(ed?.expiryDate) },
  ];

  const partnerIdForEdit = socialId;

  const onEdit = () => {
    if (!partnerIdForEdit) return;
    const returnPath = `/admin/social/${partnerIdForEdit}`;
    navigate(`/admin/social/edit/${partnerIdForEdit}`, {
      state: {
        partner: {
          ...ed,
          startDate: ed?.startDate || ed?.renewalDate || ed?.registrationDate || "",
        },
        returnPath,
        socialId: partnerIdForEdit,
      },
    });
  };

  const handleConfirmBlock = async () => {
    if (!ed?.id) return;
    try {
      if (!isBlocked) {
        await blockPartner(String(ed.id)).unwrap();
        showToast({ title: "Partner blocked", kind: "success" });
      } else {
        await unblockPartner(String(ed.id)).unwrap();
        showToast({ title: "Partner unblocked", kind: "success" });
      }
      setBlockModalOpen(false);
      await refetchPartner();
      await refetchOverview();
    } catch (e) {
      showToast({
        title: "Action failed",
        description: String(getErrMsg(e as any)),
        kind: "error",
      });
    }
  };

  const handleRenewSubmit = async (renewalDate: string, expiryDate: string) => {
    if (!ed?.id) return;
    try {
      await renewPartner({ id: String(ed.id), renewalDate, expiryDate }).unwrap();
      showToast({ title: "Renewed successfully", kind: "success" });
      setRenewModalOpen(false);
      await refetchPartner();
      await refetchOverview();
    } catch (e) {
      showToast({
        title: "Renewal failed",
        description: String(getErrMsg(e as any)),
        kind: "error",
      });
    }
  };

  const actionBase =
    "h-10 rounded-xl px-5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)]";

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <button
          type="button"
          onClick={() => navigate("/admin/social")}
          className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-[13px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Social Partner
        </button>

        {isPartnerError && !ed?.name ? (
          // A failed load used to render the card with "—" for the name and
          // zeros in every tile, which is what a real empty partner looks like.
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
            Couldn&apos;t load this partner. Check your connection and try again.
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="h-[188px] animate-pulse rounded-2xl bg-[var(--ov-panel)] ring-1 ring-[color:var(--ov-line-faint)]" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[108px] animate-pulse rounded-2xl bg-[var(--ov-panel)] ring-1 ring-[color:var(--ov-line-faint)]"
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <motion.header
              initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-4 overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]"
            >
              <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="ekam-figure grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-[20px] font-bold text-[var(--ov-on-ember)]"
                    style={{ backgroundColor: "var(--ov-ember-fill)" }}
                  >
                    {(ed?.name || "").charAt(0).toUpperCase()}
                  </span>

                  <div className="min-w-0">
                    <h1 className="ekam-figure truncate text-[24px] font-bold leading-tight text-[var(--ov-ink)] sm:text-[28px]">
                      {ed?.name || "—"}
                    </h1>
                    <p className="ekam-eyebrow mt-1.5 truncate text-[10px] font-semibold text-[var(--ov-ink-4)]">
                      {prettifyRole(ed?.role)}
                      {countryName ? ` · ${countryName}` : ""}
                    </p>
                    {/* One line for licence health, always present. */}
                    <p className="mt-2.5 flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE.dot}`}
                      />
                      <span className={`text-[12.5px] font-medium ${TONE.text}`}>
                        {health.label}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onEdit}
                    className={`${actionBase} text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockModalOpen(true)}
                    className={`${actionBase} text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]`}
                  >
                    {blockLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenewModalOpen(true)}
                    className={`${actionBase} bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)] hover:bg-[var(--ov-ember-fill-hover)]`}
                  >
                    Renew
                  </button>
                </div>
              </div>

              {/* The three dates are reference, so they sit on their own quiet
                  shelf rather than competing with the name for the top. */}
              <dl className="grid grid-cols-1 divide-y divide-[color:var(--ov-line-faint)] border-t border-[color:var(--ov-line-faint)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {dates.map((d) => (
                  <div key={d.label} className="px-5 py-4 sm:px-6">
                    <dt className="ekam-eyebrow text-[9.5px] font-semibold text-[var(--ov-ink-4)]">
                      {d.label}
                    </dt>
                    <dd className="ekam-figure mt-1.5 text-[15px] font-medium text-[var(--ov-ink-2)]">
                      {d.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.header>

            {/* Unlike the franchise equivalent these tiles are figures, not
                links: there are no social drill-down routes to open, so they
                stay plain elements rather than pretending to be clickable. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((s, index) => (
                <motion.div
                  key={s.key}
                  initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  whileHover={reduceMotion || !s.href ? undefined : { y: -3 }}
                  transition={{
                    duration: 0.45,
                    delay: 0.08 + index * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {(() => {
                    const body = (
                      <>
                        <div className="min-w-0">
                          <p className="ekam-eyebrow text-[10px] font-semibold leading-[1.4] text-[var(--ov-ink-4)]">
                            {s.title}
                          </p>
                          <p className="ekam-figure mt-2 text-[30px] font-semibold leading-none text-[var(--ov-ink)]">
                            {s.value}
                          </p>
                        </div>
                        <span
                          aria-hidden="true"
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 transition-colors ${
                            s.href
                              ? "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-4)] ring-[color:var(--ov-line)] group-hover:bg-[var(--ov-ember-wash)] group-hover:text-[var(--ov-ember)] group-hover:ring-[color:var(--ov-ember-edge)]"
                              : "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-4)] ring-[color:var(--ov-line)]"
                          }`}
                        >
                          {s.href ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <s.Icon className="h-4 w-4" strokeWidth={1.75} />
                          )}
                        </span>
                      </>
                    );
                    const shell =
                      "flex w-full items-center justify-between gap-4 rounded-2xl bg-[var(--ov-panel)] p-5 text-left shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]";
                    return s.href ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/admin/social/${socialId}/chapters`, {
                            state: { socialId, partnerName: ed?.name },
                          })
                        }
                        aria-label={`${s.title}: ${s.value}. View chapters`}
                        className={`group ${shell} transition-colors hover:bg-[var(--ov-panel-hover)] hover:ring-[color:var(--ov-line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]`}
                      >
                        {body}
                      </button>
                    ) : (
                      <div className={shell}>{body}</div>
                    );
                  })()}
                </motion.div>
              ))}
            </div>
          </>
        )}

        <BlockConfirmModal
          isOpen={blockModalOpen}
          onClose={() => setBlockModalOpen(false)}
          onConfirm={handleConfirmBlock}
          partnerName={ed?.name}
          mode={isBlocked ? "unblock" : "block"}
        />

        <RenewPartnerModal
          isOpen={renewModalOpen}
          onClose={() => setRenewModalOpen(false)}
          onSubmit={handleRenewSubmit}
          partnerData={{
            name: ed?.name || "",
            email: ed?.email || "",
            phone: ed?.phone || "",
            country: (() => {
              const cid = typeof ed?.country === "string" ? ed.country : ed?.country?.id;
              return cid ? { id: cid, name: countryById[cid] || "—" } : null;
            })(),
            region: (() => {
              const rid = typeof ed?.region === "string" ? ed.region : ed?.region?.id;
              return rid ? { id: rid, name: regionById[rid] || "—" } : null;
            })(),
            registrationDate: ed?.registrationDate,
            renewalDate: ed?.renewalDate,
            expiryDate: ed?.expiryDate,
          }}
        />
      </main>
    </div>
  );
}
