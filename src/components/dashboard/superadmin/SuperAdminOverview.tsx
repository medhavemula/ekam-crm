import React, { useMemo } from "react";
import { Clock, ArrowRight, ShieldAlert, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CascadeRail, { type CascadeNode } from "./CascadeRail";
import FlowPanel, { type FlowLeg } from "./FlowPanel";
import TrendChart, { type TrendPoint } from "./TrendChart";
import CommandBar, { type FilterBarValues, type FilterOption } from "./CommandBar";
import { useGetSuperAdminPendingApprovalsQuery } from "../../../services/approvalsApi";
import { useListFranchisePartnersQuery } from "../../../services/superadmin/adminFranchiseApi";
import {
  BEAT,
  formatCurrencyCompact,
  formatCurrencyFull,
  formatNumberFull,
  hueForMetric,
  type MetricFormat,
} from "./chartTheme";

import globeIcon from "../../../assets/icons/globe.svg";
import chaptersIcon from "../../../assets/icons/chapters.svg";
import totalChaptersIcon from "../../../assets/icons/totalchapters.svg";
import boIcon from "../../../assets/icons/BO.svg";
import bcIcon from "../../../assets/icons/BC.svg";
import usersIcon from "../../../assets/icons/users.svg";

const ICONS: Record<string, string> = {
  globe: globeIcon,
  chapters: chaptersIcon,
  totalchapters: totalChaptersIcon,
  bo: boIcon,
  bc: bcIcon,
  users: usersIcon,
};

/**
 * Keys the backend reports as a summed rupee amount rather than a document count.
 * `businessClosed` aggregates `$sum: "$amount"`; `businessOpportunity` is a
 * `countDocuments`, so it is a count despite the similar name.
 */
const CURRENCY_STAT_KEYS = new Set(["businessClosed"]);

/** The two metrics that belong to the business flow rather than the scale cascade. */
const BUSINESS_STAT_KEYS = new Set(["businessOpportunity", "businessClosed"]);

/** Series key that backs each business leg's sparkline. */
const SPARK_SERIES_KEY: Record<string, string> = {
  businessOpportunity: "businessOpportunity",
  businessClosed: "businessClosed",
};

/**
 * The containment order of the network, outermost first. The cascade reads left
 * to right in this order regardless of how the role config lists its stats —
 * a rail that claims containment has to be sorted by containment, not by
 * whatever order someone happened to type the config in.
 */
const CASCADE_ORDER = ["countries", "regions", "chapters", "totalMembers"];

/**
 * Labels and singular nouns per level, keyed on the stat key rather than the
 * title: titles are editable copy and keys are not. The config titles ("No of
 * Countries", "Total Chapter Members") describe the field, not the thing — in a
 * rail whose figures are self-evidently counts, "Countries" says all of it.
 */
const LEVEL: Record<string, { label: string; noun: string }> = {
  countries: { label: "Countries", noun: "country" },
  regions: { label: "Regions", noun: "region" },
  chapters: { label: "Chapters", noun: "chapter" },
  totalMembers: { label: "Members", noun: "member" },
};

/** Leg labels and notes for the business flow. The panel heading carries "Business". */
const FLOW_LEG: Record<string, { label: string; note: string }> = {
  businessOpportunity: {
    label: "Opportunity",
    note: "Opportunities raised in this slice",
  },
  businessClosed: {
    label: "Closed",
    note: "Value booked against them",
  },
};

export interface StatConfig {
  title: string;
  key: string;
  icon?: string;
}

export interface ChartConfig {
  title: string;
  key: string;
  color?: string;
  format?: MetricFormat;
}

export interface SuperAdminOverviewProps {
  stats: StatConfig[];
  statValues: Record<string, number>;
  charts: ChartConfig[];
  series: Record<string, TrendPoint[]>;
  isRefreshing?: boolean;

  // Filter wiring — same contract the page already used.
  showCountries?: boolean;
  showRegions?: boolean;
  showChapters?: boolean;
  showDateRange?: boolean;
  countries?: FilterOption[];
  regions?: FilterOption[];
  chapters?: FilterOption[];
  initialFilters?: FilterBarValues;
  appliedFilters?: {
    date_from?: string;
    date_to?: string;
    country_id?: string;
    region_id?: string;
    chapter_id?: string;
  };
  onSearch: (filters: FilterBarValues) => void;
  onCountryChange?: (countryId: string) => void;
  onRegionChange?: (regionId: string) => void;
  onChapterChange?: (chapterId: string) => void;

  /** Range currently in effect, yyyy-mm-dd, for the header summary. */
  rangeFrom?: string;
  rangeTo?: string;
}

const sumValues = (arr: TrendPoint[] = []) =>
  arr.reduce((acc, item) => acc + (Number(item?.value) || 0), 0);

/**
 * The Super Admin overview.
 *
 * Three bands, in the order an operator reads them: how big the network is, what
 * business moved through it, and how each of those trended. The scale metrics are
 * a containment chain rather than four sibling cards — see CascadeRail — and the
 * two business metrics are a sequence rather than two cards — see FlowPanel. The
 * charts stay a plain equal-weight grid, because at that point the three series
 * genuinely are peers.
 */
export const SuperAdminOverview: React.FC<SuperAdminOverviewProps> = ({
  stats,
  statValues,
  charts,
  series,
  isRefreshing = false,
  showCountries,
  showRegions,
  showChapters,
  showDateRange,
  countries,
  regions,
  chapters,
  initialFilters,
  appliedFilters,
  onSearch,
  onCountryChange,
  onRegionChange,
  onChapterChange,
  rangeFrom,
  rangeTo,
}) => {
  const navigate = useNavigate();
  const { data: pendingApprovalsRes } = useGetSuperAdminPendingApprovalsQuery();
  const { data: franchiseRes } = useListFranchisePartnersQuery({ page: 1, limit: 100 });

  const pendingApprovalsCount = Array.isArray(pendingApprovalsRes?.data) ? pendingApprovalsRes.data.length : 0;

  const urgentRenewalsCount = useMemo(() => {
    const list = franchiseRes?.data || [];
    return list.filter((p: any) => {
      const days = Number(p.daysLeft);
      return Number.isFinite(days) && days <= 30;
    }).length;
  }, [franchiseRes]);

  const cascadeNodes: CascadeNode[] = useMemo(() => {
    const scale = stats.filter((s) => !BUSINESS_STAT_KEYS.has(s.key));

    // Sort into containment order; anything the map does not know about keeps its
    // config position at the end rather than being dropped.
    const ordered = [...scale].sort((a, b) => {
      const ai = CASCADE_ORDER.indexOf(a.key);
      const bi = CASCADE_ORDER.indexOf(b.key);
      return (ai === -1 ? CASCADE_ORDER.length : ai) - (bi === -1 ? CASCADE_ORDER.length : bi);
    });

    return ordered.map((stat, index) => {
      const parent = index > 0 ? ordered[index - 1] : null;
      return {
        key: stat.key,
        label: LEVEL[stat.key]?.label ?? stat.title,
        value: Number(statValues[stat.key] ?? 0),
        iconSrc: stat.icon ? ICONS[stat.icon] : undefined,
        // The density line reads "N per <parent>", so each node carries the
        // singular noun of the level above it, not of itself.
        parentNoun: parent
          ? LEVEL[parent.key]?.noun ?? (LEVEL[parent.key]?.label ?? parent.title).toLowerCase()
          : undefined,
      };
    });
  }, [stats, statValues]);

  const flowLegs: FlowLeg[] = useMemo(
    () =>
      stats
        .filter((s) => BUSINESS_STAT_KEYS.has(s.key))
        .map((stat) => {
          const raw = Number(statValues[stat.key] ?? 0);
          const isCurrency = CURRENCY_STAT_KEYS.has(stat.key);
          const sparkKey = SPARK_SERIES_KEY[stat.key];
          return {
            key: stat.key,
            label: FLOW_LEG[stat.key]?.label ?? stat.title,
            value: raw,
            format: isCurrency ? formatCurrencyCompact : formatNumberFull,
            valueTitle: isCurrency ? formatCurrencyFull(raw) : formatNumberFull(raw),
            hue: hueForMetric(stat.key),
            iconSrc: stat.icon ? ICONS[stat.icon] : undefined,
            series: sparkKey ? series[sparkKey] : undefined,
            note: FLOW_LEG[stat.key]?.note ?? "",
          };
        }),
    [stats, statValues, series],
  );

  /**
   * Value per opportunity: rupees closed divided by opportunities raised. Hidden
   * when no opportunity was raised — a per-unit figure over zero units is not a
   * zero, it is undefined.
   */
  const derived = useMemo(() => {
    const opportunities = Number(statValues.businessOpportunity ?? 0);
    const closed = Number(statValues.businessClosed ?? 0);
    if (!opportunities) return null;
    return {
      value: formatCurrencyCompact(closed / opportunities),
      label: "per opportunity",
    };
  }, [statValues]);

  /** Replays the cascade sweep whenever a fresh result lands. */
  const sweepKey = useMemo(
    () => cascadeNodes.map((n) => n.value).join("-"),
    [cascadeNodes],
  );

  return (
    <>
      <CommandBar
        showCountries={showCountries}
        showRegions={showRegions}
        showChapters={showChapters}
        showDateRange={showDateRange}
        countries={countries}
        regions={regions}
        chapters={chapters}
        initialFilters={initialFilters}
        appliedFilters={appliedFilters}
        onSearch={onSearch}
        onCountryChange={onCountryChange}
        onRegionChange={onRegionChange}
        onChapterChange={onChapterChange}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        isRefreshing={isRefreshing}
      />

      {/* Everything below holds its previous render while a refetch is in flight,
          so the numbers fade rather than collapsing into a skeleton. */}
      <div
        className={`transition-opacity duration-200 ${isRefreshing ? "opacity-70" : "opacity-100"}`}
        aria-busy={isRefreshing}
      >
        {cascadeNodes.length > 0 && (
          <CascadeRail nodes={cascadeNodes} sweepKey={sweepKey} />
        )}

        {flowLegs.length > 0 && <FlowPanel legs={flowLegs} derived={derived} />}

        {/* Operational Health & Action Queue */}
        <section aria-label="Operational Health" className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Card 1: Approvals Queue */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 border border-[#E2E8F0] shadow-sm flex flex-col justify-between hover:border-[#CBD5E1] transition-all">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60">
                    <ShieldAlert className="h-4 w-4" />
                  </span>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Pending Approvals
                  </h3>
                </div>
                {pendingApprovalsCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                    {pendingApprovalsCount} Action Needed
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl font-bold text-[#0F172A]">
                {pendingApprovalsCount}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Registrations routed to Super Admin fallback queue
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => navigate("/admin/approvals")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E85A14] hover:text-[#C2410C] transition-colors cursor-pointer"
              >
                <span>Open Approvals Queue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Upcoming Renewals */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 border border-[#E2E8F0] shadow-sm flex flex-col justify-between hover:border-[#CBD5E1] transition-all">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-50 text-[#E85A14] border border-orange-200/60">
                    <Clock className="h-4 w-4" />
                  </span>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Upcoming Renewals
                  </h3>
                </div>
                {urgentRenewalsCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800">
                    {urgentRenewalsCount} within 30d
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl font-bold text-[#0F172A]">
                {urgentRenewalsCount}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Franchise partners requiring renewal review
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => navigate("/admin/franchise")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E85A14] hover:text-[#C2410C] transition-colors cursor-pointer"
              >
                <span>Manage Partner Renewals</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Business Pipeline */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 border border-[#E2E8F0] shadow-sm flex flex-col justify-between hover:border-[#CBD5E1] transition-all">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-50 text-[#0D9488] border border-teal-200/60">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Business Activity
                  </h3>
                </div>
                <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800">
                  Active
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-[#0F172A]">
                {formatNumberFull(Number(statValues.businessOpportunity ?? 0))}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Total business opportunities initiated across chapters
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => navigate("/admin/business-opportunity")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D9488] hover:text-teal-800 transition-colors cursor-pointer"
              >
                <span>View Opportunity Pipeline</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        <section aria-label="Trends" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {charts.map((chart, index) => {
            const data = series[chart.key] || [];
            const format: MetricFormat = chart.format === "currency" ? "currency" : "number";
            return (
              <TrendChart
                key={chart.key}
                title={chart.title}
                total={sumValues(data)}
                data={data}
                hue={hueForMetric(chart.key)}
                format={format}
                isRefreshing={isRefreshing}
                delay={BEAT.charts + index * BEAT.chartStagger}
              />
            );
          })}
        </section>
      </div>
    </>
  );
};

export default SuperAdminOverview;
