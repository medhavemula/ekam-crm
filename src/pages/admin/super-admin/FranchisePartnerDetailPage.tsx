import { useMemo, useState } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import { useToast } from "../../../components/toast/ToastProvider";

// ⬇️ add the modals
import { RenewPartnerModal } from "../../../components/modals";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";

import {
  useBlockFranchisePartnerMutation,
  useUnblockFranchisePartnerMutation,
  useRenewFranchisePartnerMutation,
  useGetEdOverviewQuery,
} from "../../../services/superadmin/adminFranchiseApi";
import { skipToken } from "@reduxjs/toolkit/query";

const getErrMsg = (e: any) =>
  e?.data?.message || e?.error || e?.message || "Something went wrong";

export default function FranchisePartnerDetailPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { id = "" } = useParams();
  const location = useLocation() as { state?: any };
  const partner = location.state?.partner;

  const edId =
    location.state?.edId || (partner as any)?.edId || partner?.id || id;

  // ⬇️ get refetch so we can refresh after actions and when navigating back from edit
  const { data: overview, refetch } = useGetEdOverviewQuery(
    edId ? { id: edId } : (skipToken as any),
    {
      // ensure API is called again when this page mounts with same edId
      refetchOnMountOrArgChange: true,
    }
  );

  const [blockPartner] = useBlockFranchisePartnerMutation();
  const [unblockPartner] = useUnblockFranchisePartnerMutation();
  const [renewPartner] = useRenewFranchisePartnerMutation();

  const ed = (overview?.data as any)?.ed || partner || {};
  const kpis = (overview?.data as any)?.kpis || {};
  // NaN rather than 0 when the field is absent: defaulting to 0 made "no expiry
  // recorded" indistinguishable from "expired today".
  const daysLeft = ed?.daysLeft == null ? Number.NaN : Number(ed.daysLeft);
  const blockLabel =
    (ed?.status || "").toUpperCase() === "BLOCKED" ? "Unblock" : "Block";

  // Block state
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const reduceMotion = useReducedMotion();

  const stats = useMemo(() => {
    const d = kpis as Record<string, any>;
    const currency = String(d.currency || "INR").toUpperCase();
    const fmt = (amount: number) => {
      if (currency === "INR")
        return `₹ ${Number(amount || 0).toLocaleString("en-IN")}`;
      return `${currency} ${Number(amount || 0).toLocaleString()}`;
    };
    return [
      { title: "Chapters", key: "chapters", value: Number(d.chapters ?? 0), icon: "chapters" as const },
      { title: "Regional Members", key: "regionalMembers", value: Number(d.regionalMembers ?? 0), icon: "users" as const },
      { title: "Ready to launch chapters", key: "readyToLaunchChapters", value: Number(d.readyToLaunchChapters ?? 0), icon: "chapters" as const },
      { title: "Total Members", key: "totalMembers", value: Number(d.totalMembers ?? 0), icon: "totalchapters" as const },
      { title: "Business Opportunity", key: "opportunities", value: Number(d.opportunities ?? 0), icon: "bo" as const },
      { title: "Business Closed", key: "businessClosedAmount", value: fmt(Number(d.businessClosedAmount ?? 0)), icon: "bc" as const },
    ];
  }, [kpis]);

  const formatDMY = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  };

  const prettifyRole = (r?: string) => {
    if (!r) return "—";
    const words = r
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
    return words.join(" ");
  };

  const partnerIdForEdit = (location.state?.partner?.id ?? id) as string;

  const onEdit = () => {
    if (!partnerIdForEdit) return console.warn("No partner id to edit");
    const returnPath = `/admin/franchise/${partnerIdForEdit}`;
    navigate(`/admin/franchise/edit/${partnerIdForEdit}`, {
      state: { 
        partner: partner || ed, 
        returnPath,
        edId: ed?.id || partnerIdForEdit
      },
    });
  };

  // ⬇️ open modals instead of calling APIs directly
  const onBlockClick = () => setShowBlockConfirm(true);
  const onRenew = () => setRenewModalOpen(true);

  // ⬇️ modal handlers
  const handleBlockConfirm = async () => {
    try {
      setIsBlocking(true);
      const result = await (ed.status === 'ACTIVE' ? blockPartner(edId) : unblockPartner(edId));
      
      if ('error' in result) {
        throw result.error;
      }
      
      // Refresh the data
      await refetch();
      
      showToast({
        title: 'Success',
        description: `Partner has been ${ed.status === 'ACTIVE' ? 'blocked' : 'unblocked'} successfully`,
        kind: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Error',
        description: getErrMsg(error),
        kind: 'error',
      });
    } finally {
      setShowBlockConfirm(false);
      setIsBlocking(false);
    }
  };

  const handleRenewSubmit = async (renewalDate: string, expiryDate: string) => {
    if (!ed?.id) return;

    try {
      await renewPartner({
        id: String(ed.id),
        body: { renewalDate, expiryDate },
      }).unwrap();

      showToast({ title: "Renewed successfully", kind: "success" });
      setRenewModalOpen(false);
      await refetch?.();
    } catch (e) {
      showToast({
        title: "Renewal failed",
        description: String(getErrMsg(e as any)),
        kind: "error",
      });
    }
  };

  const handleCardClick = (key: string) => {
    switch (key) {
      case "chapters":
        navigate("/admin/franchise/chapters", {
          state: { edId }
        });
        break;
      case "regionalMembers":
        navigate(`/admin/franchise/regional-members/${edId}`);
        break;
      case "totalMembers":
        navigate("/admin/franchise/members-list", {
          state: { edId }
        });
        break;
      case "readyToLaunchChapters":
        navigate("/admin/franchise/ready-to-launch", {
          state: { edId }
        });
        break;
      case "opportunities":
        navigate("/admin/franchise/business-opportunity", {
          state: { edId }
        });
        break;
      case "businessClosedAmount":
        navigate("/admin/franchise/business-closed", {
          state: { edId }
        });
        break;
      default:
    }
  };

  const isBlocked = blockLabel === "Unblock";

  /**
   * The expiry fields reduced to the one sentence a reader wants.
   *
   * The previous header only rendered a badge for "active" and "expired" — the
   * `upcoming` band, meaning 30 days or fewer, fell through both branches and
   * showed nothing at all. The partner closest to lapsing was the one the page
   * said least about.
   */
  const health = (() => {
    if (isBlocked) return { tone: "muted" as const, label: "Blocked" };
    if (!Number.isFinite(daysLeft)) return { tone: "muted" as const, label: "No expiry on record" };
    // Whether the licence has lapsed is the API's call, not something to infer
    // from the day count: a term runs to the end of its expiry date, so its
    // final day counts 0 days left while still being active. Reading "expired"
    // off `daysLeft <= 0` marked every partner expired a day early, and
    // disagreed with the list, which asks the API.
    if ((ed?.status || "").toUpperCase() === "EXPIRED")
      return { tone: "bad" as const, label: "Expired" };
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

  const countryName =
    typeof (ed as any)?.country === "object"
      ? (ed as any)?.country?.name || ""
      : (ed as any)?.country || "";

  const dates = [
    { label: "Registration", value: formatDMY(ed?.registrationDate) },
    { label: "Renewal", value: formatDMY(ed?.renewalDate) },
    { label: "Expiry", value: formatDMY(ed?.expiryDate) },
  ];

  const actionBase =
    "h-10 rounded-xl px-5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)]";

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <button
          type="button"
          onClick={() => navigate("/admin/franchise")}
          className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-[13px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Franchise Partner
        </button>

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
                <p className="mt-2.5 flex items-center gap-2">
                  <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE.dot}`} />
                  <span className={`text-[12.5px] font-medium ${TONE.text}`}>{health.label}</span>
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
                onClick={onBlockClick}
                className={`${actionBase} text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]`}
              >
                {blockLabel}
              </button>
              <button
                type="button"
                onClick={onRenew}
                className={`${actionBase} bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)] hover:bg-[var(--ov-ember-fill-hover)]`}
              >
                Renew
              </button>
            </div>
          </div>

          {/* The three dates are reference, so they sit on their own quiet shelf
              rather than competing with the name for the top of the card. */}
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

        {/* Every tile navigates. They were divs with an onClick, which meant the
            six primary destinations on this page could not be reached by keyboard
            and gave no hint they were clickable. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s, index) => (
            <motion.button
              key={s.key}
              type="button"
              onClick={() => handleCardClick(s.key)}
              aria-label={`${s.title}: ${s.value}. View details`}
              initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              transition={{
                duration: 0.45,
                delay: 0.08 + index * 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group flex items-center justify-between gap-4 rounded-2xl bg-[var(--ov-panel)] p-5 text-left shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-panel-hover)] hover:ring-[color:var(--ov-line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            >
              <div className="min-w-0">
                <p className="ekam-eyebrow truncate text-[10px] font-semibold text-[var(--ov-ink-4)]">
                  {s.title}
                </p>
                <p className="ekam-figure mt-2 text-[30px] font-semibold leading-none text-[var(--ov-ink)]">
                  {s.value}
                </p>
              </div>

              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-4)] ring-1 ring-[color:var(--ov-line)] transition-colors group-hover:bg-[var(--ov-ember-wash)] group-hover:text-[var(--ov-ember)] group-hover:ring-[color:var(--ov-ember-edge)]"
              >
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </motion.button>
          ))}
        </div>

        <ConfirmationDialog
          isOpen={showBlockConfirm}
          onClose={() => setShowBlockConfirm(false)}
          onConfirm={handleBlockConfirm}
          isSubmitting={isBlocking}
          // Unblocking previously passed "delete", so confirming an unblock showed
          // delete iconography and a "Yes, Delete" button for a reversible action.
          actionType={isBlocked ? "unblock" : "block"}
        />

        <RenewPartnerModal
          isOpen={renewModalOpen}
          onClose={() => setRenewModalOpen(false)}
          onSubmit={handleRenewSubmit}
          partnerData={{
            name: ed?.name || '',
            email: ed?.email || '',
            phone: ed?.phone || '',
            country: ed?.country,
            region: ed?.region,
            registrationDate: ed?.registrationDate,
            renewalDate: ed?.renewalDate,
            expiryDate: ed?.expiryDate
          }}
        />
      </main>
    </div>
  );
}
