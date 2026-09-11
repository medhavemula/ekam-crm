import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  MapPin,
  Settings,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { RootState } from "../../../app/store";
import Navbar from "../../../components/navigation/Navbar";
import Figure from "../../../components/dashboard/superadmin/Figure";
import TrendChart, { type TrendPoint } from "../../../components/dashboard/superadmin/TrendChart";
import {
  BEAT,
  EASE_OUT,
  formatNumberFull,
  hueForMetric,
  type MetricFormat,
} from "../../../components/dashboard/superadmin/chartTheme";
import { Skeleton } from "../../../components/common/Skeletons";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useGetEdChapterQuery, useGetEdChapterOverviewQuery } from "../../../services/ed";

export default function ChapterDetailsPage() {
  const { chapterId } = useParams();
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const userRole = useSelector((state: RootState) => state.auth.role);
  
  // Date range state
  const [selectedDateRange, setSelectedDateRange] = useState<string>("last_6_months");
  
  // Date range options
  const dateRangeOptions = [
    { value: "last_6_months", label: "Last 6 Months" },
    { value: "this_month", label: "This Month" },
    { value: "this_year", label: "This Year" },
    { value: "last_year", label: "Last Year" },
    { value: "lifetime", label: "Lifetime" },
  ];
  
  // Calculate date range based on selection
  const getDateRange = (range: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    switch (range) {
      case "last_6_months": {
        const startDate = new Date(currentYear, currentMonth - 6, 1);
        const endDate = new Date();
        return {
          from: startDate.toISOString(),
          to: endDate.toISOString()
        };
      }
      case "this_month": {
        const startDate = new Date(currentYear, currentMonth, 1);
        const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999); // Last day of current month
        return {
          from: startDate.toISOString(),
          to: endDate.toISOString()
        };
      }
      case "this_year": {
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999); // December 31st of current year
        return {
          from: startDate.toISOString(),
          to: endDate.toISOString()
        };
      }
      case "last_year": {
        const startDate = new Date(currentYear - 1, 0, 1); // January 1st of last year
        const endDate = new Date(currentYear - 1, 11, 31, 23, 59, 59, 999); // December 31st of last year
        return {
          from: startDate.toISOString(),
          to: endDate.toISOString()
        };
      }
      case "lifetime": {
        const startDate = new Date(2023, 0, 1); // January 1st, 2023
        const endDate = new Date(currentYear + 5, 11, 31, 23, 59, 59, 999); // December 31st, 5 years from now
        return {
          from: startDate.toISOString(),
          to: endDate.toISOString()
        };
      }
      default:
        return { from: undefined, to: undefined };
    }
  };

  // Helper to choose chart interval based on date range (mirrors Dashboard logic)
  const getIntervalForRange = (from?: string, to?: string): "week" | "month" | "year" => {
    try {
      if (!from || !to) return "month" as const;
      const f = new Date(from);
      const t = new Date(to);

      const diffMs = t.getTime() - f.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive
      const monthDiff =
        (t.getUTCFullYear() - f.getUTCFullYear()) * 12 +
        (t.getUTCMonth() - f.getUTCMonth()) +
        1;

      // <= 31 days  -> week
      // <= 12 months -> month
      // > 12 months  -> year
      if (diffDays <= 31) return "week" as const;
      if (monthDiff <= 12) return "month" as const;
      return "year" as const;
    } catch {
      return "month" as const;
    }
  };

  const dateRange = useMemo(() => getDateRange(selectedDateRange), [selectedDateRange]);
  const interval = getIntervalForRange(dateRange.from, dateRange.to);

  // Check if user has full access (Executive/Regional/Assistant Regional Director)
  const hasFullAccess = [
    "EXECUTIVE_DIRECTOR",
    "ED_TEAM",
    "REGIONAL_DIRECTOR",
    "ASSISTANT_REGIONAL_DIRECTOR"
  ].includes(userRole || "");

  // Fetch chapter details and overview
  const { data: chapterRes, isLoading: isChapterLoading, error: chapterError } = useGetEdChapterQuery(chapterId as string, { skip: !chapterId });
  const { data: overviewRes, isLoading: isOverviewLoading, error: overviewError } = useGetEdChapterOverviewQuery(
    { 
      chapterId: chapterId as string, 
      from: dateRange.from, 
      to: dateRange.to
    }, 
    { skip: !chapterId }
  );

  const chapterDataRoot = (chapterRes as any)?.data || {};
  const chapter = (chapterDataRoot as any)?.chapter || chapterDataRoot || {};
  const overview = (overviewRes as any)?.data || {};
  const stats = overview?.kpis || overview?.stats || overview?.counters || overview || {};

  const name = chapter?.name || "-";
  const regionLabel =
    (chapter as any)?.regionName ||
    (chapter as any)?.region_name ||
    (chapter as any)?.regionLabel ||
    (chapter as any)?.region?.name ||
    (chapter as any)?.region?.label ||
    (chapter as any)?.region?.regionName ||
    (overview as any)?.regionName ||
    (overview as any)?.chapter?.regionName ||
    "";
  const location = chapter?.location || (chapter as any)?.address || "";
  const toNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };
  const pickMax = (...vals: any[]) => {
    const nums = vals.map(toNum).filter((n) => Number.isFinite(n));
    return nums.length ? Math.max(...nums) : 0;
  };

  const totalMembers = pickMax(
    stats?.members,
    stats?.totalMembers,
    stats?.activeMembers,
    overview?.members,
    chapter?.members,
    chapter?.membersCount,
    chapter?.totalMembers
  );

  const p2pStat = pickMax(
    stats?.p2p,
    stats?.counters?.p2p,
    stats?.totalP2P,
    stats?.p2pCount,
    stats?.P2P
  );

  // Renewal date UI can be derived when required; omit here to avoid unused vars

  // Next Meeting Details from overview (commented out as unused)
  // const nextMeetingAtRaw = (overview as any)?.nextMeetingAt
  //   || (overview as any)?.next_meeting_at
  //   || (overview as any)?.upcomingMeetingAt
  //   || (overview as any)?.meetings?.next_meeting_at
  //   || (overview as any)?.meetings?.nextMeetingAt
  //   || (chapter as any)?.meetings?.next_meeting_at
  //   || (chapter as any)?.nextMeetingAt;
  const toFancyDateTime = (iso?: string) => {
    if (!iso || iso === '-') return ''; // Return empty string instead of dash
    const d = new Date(iso);
    if (isNaN(d.getTime())) return ''; // Return empty string for invalid dates
    // Same shape as the range line above it — the shouted "14 AUG 2026" was
    // the only uppercase date on the page.
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };
  // Last Meeting Details
  const lastMeetingAtRaw = (overview as any)?.lastCompletedMeeting?.date
    || (overview as any)?.lastMeetingAt
    || (overview as any)?.last_meeting_at
    || (overview as any)?.previousMeetingAt
    || (overview as any)?.meetings?.last_meeting_at
    || (overview as any)?.meetings?.lastMeetingAt
    || (chapter as any)?.meetings?.last_meeting_at
    || (chapter as any)?.lastCompletedMeeting?.date;
  const lastMeetingDateStr = toFancyDateTime(lastMeetingAtRaw);
  const meetingModeRaw = (overview as any)?.lastCompletedMeeting?.mode
    || (overview as any)?.nextMeeting?.mode
    || (overview as any)?.meetings?.mode
    || (chapter as any)?.meetings?.mode
    || (stats as any)?.meetingMode;
  const modeLabel = (() => {
    const m = String(meetingModeRaw || "").toUpperCase();
    if (m.includes("PERSON")) return "In Person";
    if (m.includes("ONLINE") || m.includes("VIRTUAL")) return "Online";
    if (m.includes("HYBRID")) return "Hybrid";
    return m || "-";
  })();

  // Charts: normalize possible series shapes from API
  type SeriesPoint = { month?: string; label?: string; date?: string; value?: number; count?: number; amount?: number };
  const rootSeries = (overview as any)?.series || (overview as any)?.timeSeries || (overview as any)?.trends || (overview as any)?.monthly || {};
  const getSeries = (keys: string[]): SeriesPoint[] => {
    for (const k of keys) {
      const v = (rootSeries as any)[k];
      if (Array.isArray(v)) return v as SeriesPoint[];
    }
    // Sometimes series can be directly at root data
    for (const k of keys) {
      const v = (overview as any)[k];
      if (Array.isArray(v)) return v as SeriesPoint[];
    }
    return [];
  };

  // Formatter for chart labels (mirrors Dashboard toChartData logic)
  const formatLabel = (label: string) => {
    try {
      if (!label) return "";
      // Week label like 2025-W45
      if (/^\d{4}-W\d{2}$/i.test(label)) {
        const wk = label.split("W")[1];
        return `W${wk}`;
      }
      // Date label
      if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
        const d = new Date(label);
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      }
      // Month label like 2025-03
      if (/^\d{4}-\d{2}$/.test(label)) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthNum = parseInt(label.split("-")[1], 10);
        return monthNames[monthNum - 1] || label;
      }
      return label;
    } catch {
      return label;
    }
  };

  const toChartData = (arrInput: any, intv: "week" | "month" | "year" = "month") => {
    const arr = Array.isArray(arrInput) ? arrInput : [];
    if (intv === "year") {
      // Aggregate into yearly buckets
      const bucket = new Map<string, number>();
      arr.forEach((item: any, idx: number) => {
        const label = item?.month ?? item?.label ?? item?.date ?? idx + 1;
        // extract year from formats: YYYY, YYYY-MM, YYYY-Www, YYYY-MM-DD
        const match = String(label).match(/^(\d{4})/);
        const year = match ? match[1] : "";
        if (!year) return;
        const value = Number(item?.value ?? item?.amount ?? item?.count ?? 0);
        const prev = bucket.get(year) || 0;
        bucket.set(year, prev + value);
      });
      return Array.from(bucket.entries())
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([year, sum]) => ({ month: year, value: sum }));
    }
    // week/month formatting
    if (intv === "week") {
      return arr.map((item: any, idx: number) => ({
        month: `Week ${idx + 1}`,
        value: Number(item?.value ?? item?.amount ?? item?.count ?? 0),
      }));
    }
    // month interval: format to short month when possible
    return arr.map((item: any, idx: number) => {
      const raw = item?.month ?? item?.label ?? item?.date ?? idx + 1;
      return {
        month: /^\d{4}-W\d{2}$/i.test(String(raw)) ? `Week ${idx + 1}` : formatLabel(String(raw)),
        value: Number(item?.value ?? item?.amount ?? item?.count ?? 0),
      };
    });
  };

  const chapterGrowthData = toChartData(getSeries(["membersGrowth", "chapterGrowth", "growth", "memberGrowth"]), interval);
  const businessClosedData = toChartData(getSeries(["businessClosed", "closed", "revenue", "closedOpportunities"]), interval);
  const businessOpportunityData = toChartData(getSeries(["opportunity", "businessOpportunity", "opportunities"]), interval);

  // Derive amounts to display on cards
  const sumValues = (arr: Array<{ value: number }>) => (Array.isArray(arr) ? arr.reduce((s, x) => s + (Number(x?.value) || 0), 0) : 0);
  const totalRevenue = pickMax(
    sumValues(businessClosedData),
    stats?.businessClosedAmount,
    stats?.totalRevenue,
    stats?.revenue
  );

  const totalOpportunities = pickMax(
    sumValues(businessOpportunityData),
    stats?.opportunities,
    stats?.totalOpportunities,
    stats?.opportunity
  );

  // Get last meeting details
  const lastMeeting = (overview as any)?.lastCompletedMeeting || {};
  const lastMeetingId = lastMeeting.meetingId || '';

  const handleViewPALMS = (meetingId?: string) => {
    if (!meetingId || !chapterId) return;
    
    // Check if user has ED, RD, or ARD role
    const isEdLevelUser = [
      "EXECUTIVE_DIRECTOR",
      "ED_TEAM",
      "REGIONAL_DIRECTOR", 
      "ASSISTANT_REGIONAL_DIRECTOR"
    ].includes(userRole || "");
    
    if (isEdLevelUser) {
      // Navigate to ED Meeting PALMS page for ED, RD, ARD
      navigate(`/admin/meetings/${meetingId}`);
    } else {
      // Navigate to regular Meeting Details page for other roles
      navigate(`/business/meetings/${meetingId}`);
    }
  };

  const handleViewTeam = () => {
    navigate(`/admin/regional-board/chapter/${chapterId}/leadership-team`);
  };

  const handleViewMembers = () => {
    navigate(`/admin/regional-board/chapter/${chapterId}/members?chapterId=${chapterId}`);
  };

  const handleReportClick = (reportName: string) => {
    
    // Navigate to appropriate report page
    if (reportName === "Inducted By Report") {
      navigate("/admin/inducted-by-report", { state: { chapterId } });
    } else if (reportName === "Visitor Registration Report") {
      navigate("/admin/visitors", { state: { chapterId } });
    } else if (reportName === "Many to One Report") {
      navigate("/admin/many-to-one", { state: { chapterId } });
    } else if (reportName === "Business Opportunity Report") {
      navigate(`/admin/regional-board/chapter/${chapterId}/business-opportunity`);
    } else if (reportName === "PALMS Attendance Report") {
      navigate(`/admin/regional-board/chapter/${chapterId}/palms`);
    } else if (reportName === "Upcoming Events") {
      navigate("/admin/business/events", { state: { chapterId } });
    } else {
      // TODO: Add other report navigations
    }
  };

  const handleEditChapter = () => {
    if (!chapterId) return;
    
    // Only pass chapterId, let EditChapterPage fetch data via API
    navigate(`/admin/regional-board/chapters/edit/${chapterId}`, {
      state: {
        chapterId: chapterId
      }
    });
  };

  const isLoading = (isChapterLoading || isOverviewLoading) && !chapterRes && !overviewRes;
  const hasError = Boolean(chapterError || overviewError);

  /** "1 Mar 2026 – 27 Sept 2026", the range the figures are measured over. */
  const rangeLabel = (() => {
    const fmt = (iso?: string) =>
      iso
        ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        : "";
    const from = fmt(dateRange.from);
    const to = fmt(dateRange.to);
    return from && to ? `${from} – ${to}` : "";
  })();

  const trends: Array<{
    key: string;
    title: string;
    data: TrendPoint[];
    total: number;
    format: MetricFormat;
    wide?: boolean;
  }> = [
    {
      key: "memberGrowth",
      title: "Members growth",
      data: chapterGrowthData,
      total: sumValues(chapterGrowthData),
      format: "number",
      wide: true,
    },
    {
      key: "businessOpportunity",
      title: "Business opportunity",
      data: businessOpportunityData,
      total: totalOpportunities,
      format: "number",
    },
    {
      key: "businessClosed",
      title: "Business closed",
      data: businessClosedData,
      total: totalRevenue,
      format: "currency",
    },
  ];

  const reports: Array<{ title: string; icon: LucideIcon }> = [
    { title: "Business Opportunity Report", icon: Briefcase },
    { title: "PALMS Attendance Report", icon: ClipboardList },
    { title: "Many to One Report", icon: UsersRound },
    { title: "Inducted By Report", icon: UserPlus },
    { title: "Visitor Registration Report", icon: UserCheck },
    { title: "Upcoming Events", icon: CalendarDays },
  ];

  /** One line of the identity column: what it is on the left, its figure on the
      right, the whole row the way into that screen. */
  const IdStat = ({
    label,
    value,
    onClick,
    delay = 0,
  }: {
    label: string;
    value: number | string;
    onClick?: () => void;
    delay?: number;
  }) => {
    const body = (
      <>
        <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ov-ink-2)]">{label}</span>
        {typeof value === "number" ? (
          <Figure
            value={value}
            format={formatNumberFull}
            delay={delay}
            className="shrink-0 text-[18px] font-semibold leading-none text-[var(--ov-ink)]"
          />
        ) : (
          <span className="shrink-0 text-[13px] font-semibold text-[var(--ov-ink)]">{value}</span>
        )}
        {onClick && (
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-[var(--ov-ink-5)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--ov-ember)]"
            aria-hidden="true"
          />
        )}
      </>
    );

    if (!onClick) {
      return (
        <div className="flex items-center gap-2.5 border-t border-[color:var(--ov-line-faint)] py-2.5">
          {body}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={onClick}
        className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 border-t border-[color:var(--ov-line-faint)] px-2 py-2.5 text-left transition-colors hover:bg-[var(--ov-fill-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ov-ember)]"
      >
        {body}
      </button>
    );
  };

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-3 flex items-center gap-2 text-[13px] text-[var(--ov-ink-4)]">
          <button
            onClick={() => navigate("/admin/regional-board")}
            className="transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
          >
            Regional Board
          </button>
          <span aria-hidden="true">›</span>
          <span className="text-[var(--ov-ink)]">{name}</span>
        </div>

        {hasError && (
          <div className="mb-4 rounded-2xl bg-[var(--ov-panel)] p-8 text-center ring-1 ring-[color:var(--ov-line)]">
            <span
              aria-hidden="true"
              className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[var(--ov-danger-wash)] text-[var(--ov-danger)]"
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <p className="mt-3.5 text-[15px] font-semibold text-[var(--ov-ink)]">
              Could not load this chapter
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              The chapter overview did not respond. Nothing has changed — reload to try again.
            </p>
          </div>
        )}

        {isLoading ? (
          <ChapterOverviewSkeleton showReports={hasFullAccess} />
        ) : (
          /*
            A standing identity column, evidence to its right.
            The chapter stays on screen while its numbers are read — the way a
            profile keeps its subject in view — instead of scrolling away above
            a stack of panels. Everything that identifies the chapter or leads
            somewhere lives in the column; the right side is only measurement.
          */
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[306px_minmax(0,1fr)] lg:items-start">
            <motion.aside
              aria-label="Chapter"
              initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: BEAT.cascade, ease: EASE_OUT }}
              className="rounded-2xl bg-[var(--ov-panel)] p-5 shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] lg:sticky lg:top-24"
            >
              <span
                aria-hidden="true"
                className="ekam-figure grid h-13 w-13 place-items-center rounded-2xl bg-[var(--ov-ember-wash)] text-[19px] font-bold text-[var(--ov-ember)] ring-1 ring-[color:var(--ov-ember-edge)]"
                style={{ width: "52px", height: "52px" }}
              >
                {(name || "?").trim().charAt(0).toUpperCase()}
              </span>

              <h1 className="mt-3.5 text-[23px] font-bold leading-tight text-[var(--ov-ink)]">
                {name}
              </h1>
              <p className="mt-1.5 text-[12.5px] leading-5 text-[var(--ov-ink-4)]">
                {location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {location}
                  </span>
                )}
                {regionLabel && <span className="block">{regionLabel}</span>}
              </p>

              <div className="mt-4">
                <IdStat
                  label="Members"
                  value={totalMembers}
                  onClick={handleViewMembers}
                  delay={BEAT.node}
                />
                {hasFullAccess && (
                  <IdStat
                    label="Executive team"
                    value={Number((overview as any)?.leadership?.total || 0)}
                    onClick={handleViewTeam}
                    delay={BEAT.node + BEAT.nodeStagger}
                  />
                )}
                <IdStat
                  label="P2P"
                  value={p2pStat}
                  onClick={() => navigate("/admin/business/p2p", { state: { chapterId } })}
                  delay={BEAT.node + BEAT.nodeStagger * 2}
                />
                <IdStat
                  label={
                    lastMeetingDateStr && modeLabel && modeLabel !== "-"
                      ? `Last meeting · ${modeLabel}`
                      : "Last meeting"
                  }
                  value={lastMeetingDateStr || "None yet"}
                  onClick={lastMeetingDateStr ? () => handleViewPALMS(lastMeetingId) : undefined}
                />
              </div>

              {hasFullAccess && (
                <button
                  onClick={handleEditChapter}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                >
                  <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                  Chapter settings
                </button>
              )}

              {hasFullAccess && (
                <div className="mt-5 border-t border-[color:var(--ov-line-faint)] pt-4">
                  <h2 className="ekam-eyebrow text-[9.5px] font-semibold text-[var(--ov-ink-4)]">
                    Reports
                  </h2>
                  <div className="mt-2 flex flex-col">
                    {reports.map(({ title, icon: Icon }) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => handleReportClick(title)}
                        className="group -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--ov-fill-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ov-ember)]"
                      >
                        <Icon
                          className="h-4 w-4 shrink-0 text-[var(--ov-ink-4)] transition-colors group-hover:text-[var(--ov-ember)]"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--ov-ink-2)]">
                          {title.replace(" Report", "")}
                        </span>
                        <ChevronRight
                          className="h-3.5 w-3.5 shrink-0 text-[var(--ov-ink-5)] transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.aside>

            <div>
              {/* The range belongs to the measurements, so it sits over them
                  rather than in the identity column. */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                {rangeLabel && (
                  <p className="ekam-figure text-[12px] text-[var(--ov-ink-4)]">{rangeLabel}</p>
                )}
                <div
                  role="group"
                  aria-label="Date range presets"
                  className="ml-auto flex flex-wrap gap-0.5 rounded-xl bg-[var(--ov-trough)] p-1 ring-1 ring-[color:var(--ov-line-faint)]"
                >
                  {dateRangeOptions.map((option) => {
                    const isActive = selectedDateRange === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedDateRange(option.value)}
                        aria-pressed={isActive}
                        className="relative whitespace-nowrap rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                      >
                        {isActive && (
                          <motion.span
                            layoutId="chapter-range-pill"
                            aria-hidden="true"
                            className="absolute inset-0 rounded-lg bg-[var(--ov-select-fill)]"
                            transition={
                              reduceMotion
                                ? { duration: 0 }
                                : { type: "spring", stiffness: 420, damping: 34 }
                            }
                          />
                        )}
                        <span
                          className={`relative z-10 ${
                            isActive
                              ? "text-[var(--ov-on-select)]"
                              : "text-[var(--ov-ink-3)] hover:text-[var(--ov-ink)]"
                          }`}
                        >
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <section aria-label="Trends" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {trends.map((trend, index) => (
                  <TrendChart
                    key={trend.key}
                    title={trend.title}
                    total={trend.total}
                    data={trend.data}
                    hue={hueForMetric(trend.key)}
                    format={trend.format}
                    delay={BEAT.charts + index * BEAT.chartStagger}
                    className={trend.wide ? "xl:col-span-2" : ""}
                  />
                ))}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/** The page's own shape while the chapter and its overview are in flight. */
const ChapterOverviewSkeleton = ({ showReports }: { showReports: boolean }) => (
  <div
    role="status"
    aria-live="polite"
    className="grid grid-cols-1 gap-4 lg:grid-cols-[306px_minmax(0,1fr)] lg:items-start"
  >
    <div className="rounded-2xl bg-[var(--ov-panel)] p-5 shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]">
      <Skeleton className="h-[52px] w-[52px] rounded-2xl" />
      <Skeleton className="mt-4 h-6 w-40 max-w-full" />
      <Skeleton className="mt-3 h-3 w-28" />
      <div className="mt-5 flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-4 w-6 shrink-0" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-5 h-10 w-full rounded-xl" />
      {showReports && (
        <div className="mt-5 flex flex-col gap-3.5 border-t border-[color:var(--ov-line-faint)] pt-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-3.5 w-full" />
          ))}
        </div>
      )}
    </div>

    <div>
      <div className="mb-3 flex justify-end">
        <Skeleton className="h-10 w-[420px] max-w-full rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className={`rounded-2xl bg-[var(--ov-panel)] p-5 shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] ${
              i === 0 ? "xl:col-span-2" : ""
            }`}
          >
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-4 h-[190px] w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
    <span className="sr-only">Loading chapter</span>
  </div>
);
