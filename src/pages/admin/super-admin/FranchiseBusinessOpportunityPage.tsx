import React, { useEffect, useMemo, useRef, useState } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Search as SearchIcon,
  X,
  Briefcase,
  CircleCheck,
  CircleX,
  IndianRupee,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import DataTable, { type TableColumn } from "../../../components/common/DataTable";
import FormSelect from "../../../components/forms/FormSelect";
import {
  type BusinessOpportunityResponse,
  type BusinessFilters,
  useGetBusinessOpportunitiesQuery,
} from "../../../services/superadmin/adminFranchiseApi";

type OpportunityRow = {
  id: string;
  chapter: string;
  memberResponsible: string;
  value: number | null;
  valueFormatted: string;
  status: string;
  createdDate: string;
};

const columns: TableColumn[] = [
  { key: "chapter", label: "Chapter", sortable: true, searchable: true },
  { key: "memberResponsible", label: "Member Responsible", sortable: true, searchable: true },
  { key: "valueFormatted", label: "Value", sortable: true, searchable: true },
  { key: "status", label: "Status", sortable: true, searchable: true },
  { key: "createdDate", label: "Created Date", sortable: true, searchable: false },
];

/** The API limit and the table footer read the same number, or the footer
 *  computes a page count from a size that was never fetched. */
const PAGE_SIZE = 20;

const toDisplayDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
};

const toCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

/** A full rupee figure runs to eleven characters on a summary tile and stops
 *  being a number you can read at a glance. The exact value stays in a title. */
const toCompactCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(abs >= 1e9 ? 0 : 1)}Cr`;
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(abs >= 1e7 ? 0 : 1)}L`;
  if (abs >= 1e3) return `₹${(value / 1e3).toFixed(0)}K`;
  return `₹${value}`;
};

const formatStatus = (status?: string | null) => {
  if (!status) return "-";
  return String(status)
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
};

const normalizeStatus = (status?: string | null) => {
  if (!status) return "";
  return String(status).toUpperCase().replace(/[\s_-]/g, "");
};

export default function FranchiseBusinessOpportunityPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation() as any;
  const reduceMotion = useReducedMotion();

  const edId = (location?.state?.edId || id || "") as string;

  // Typed vs applied. The page previously fed the input straight into the query
  // key, so every keystroke was a request, and the Search button — which only
  // re-set each piece of state to the value it already held — did nothing at all.
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [localStatusFilter, setLocalStatusFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  // Page size is deferred like the other two. It used to apply the instant it
  // changed, which made one control in the bar behave unlike the two beside it:
  // you changed it, the table reloaded on its own, and Apply — sitting right
  // there — stayed greyed out as though nothing had happened.

  // No Apply button, so the typed value commits itself after a short pause.
  // The debounce is what stops this becoming a request per keystroke, which is
  // how this page behaved before the typed/applied split existed.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = localSearchQuery.trim();
      setSearchQuery((prev) => {
        if (prev === next) return prev;
        setPage(1);
        return next;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [localSearchQuery]);

  const clearFilters = () => {
    setLocalSearchQuery("");
    setLocalStatusFilter("");
    setSearchQuery("");
    setStatusFilter("");
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter commits without waiting for the debounce.
    if (e.key === "Enter") {
      setSearchQuery(localSearchQuery.trim());
      setPage(1);
    }
  };

  const filters: BusinessFilters = {
    page,
    limit: PAGE_SIZE,
    search: searchQuery || undefined,
    status: statusFilter || undefined,
  };

  const { data: res, isLoading, isFetching, isError } = useGetBusinessOpportunitiesQuery(
    { edId, filters },
    { skip: !edId },
  );

  const apiItems: BusinessOpportunityResponse[] = res?.data?.data ?? [];
  const total = res?.data?.pagination?.total ?? apiItems.length;

  const rows: OpportunityRow[] = useMemo(
    () =>
      apiItems.map((item) => ({
        id: String(item.id),
        chapter: item.chapter?.name || "-",
        memberResponsible: item.memberResponsible?.name || "-",
        value: item.value ?? null,
        valueFormatted: toCurrency(item.value),
        status: formatStatus(item.status),
        createdDate: toDisplayDate(item.createdDate),
      })),
    [apiItems],
  );

  const summary = res?.data?.summary;
  const hasServerSummary =
    !!summary && (typeof summary.totalValue === "number" || !!summary.counts);

  const statusCounts = useMemo(() => {
    const fromSummary = summary?.counts;
    if (fromSummary && typeof fromSummary === "object") return fromSummary as Record<string, number>;
    return apiItems.reduce<Record<string, number>>((acc, item) => {
      const key = normalizeStatus(item.status);
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [apiItems, summary?.counts]);

  const totalValue = useMemo(() => {
    if (typeof summary?.totalValue === "number") return summary.totalValue;
    return apiItems.reduce((sum, item) => sum + (item.value || 0), 0);
  }, [apiItems, summary?.totalValue]);

  const totalClosedWon = statusCounts["CLOSEDWON"] || statusCounts["WON"] || statusCounts["CLOSED"] || 0;
  const totalClosedLost = statusCounts["CLOSEDLOST"] || statusCounts["LOST"] || 0;

  // Statuses accumulate and never shrink. Building the options from the current
  // page meant choosing "Closed Won" filtered the rows to Closed Won, which then
  // rebuilt the dropdown from those rows — so the option needed to switch back
  // had vanished and a reload was the only way out. An empty first page left the
  // filter with nothing in it at all.
  const seenStatuses = useRef<Map<string, string>>(new Map());
  const [statusVersion, setStatusVersion] = useState(0);
  useEffect(() => {
    let added = false;
    apiItems.forEach((i) => {
      const raw = String(i.status || "").trim();
      if (!raw || seenStatuses.current.has(raw)) return;
      seenStatuses.current.set(raw, formatStatus(raw));
      added = true;
    });
    if (added) setStatusVersion((v) => v + 1);
  }, [apiItems]);

  const statusOptions = useMemo(() => {
    const dynamic = Array.from(seenStatuses.current.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: "", label: "All statuses" }, ...dynamic];
    // seenStatuses is a ref, so statusVersion is what marks it as changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusVersion]);

  const stats = [
    { key: "total", title: "Total Opportunities", value: String(total), Icon: Briefcase, exact: true },
    {
      key: "won",
      title: "Closed Won",
      value: String(totalClosedWon),
      Icon: CircleCheck,
      tone: "success" as const,
      exact: hasServerSummary,
    },
    {
      key: "lost",
      title: "Closed Lost",
      value: String(totalClosedLost),
      Icon: CircleX,
      tone: "danger" as const,
      exact: hasServerSummary,
    },
    {
      key: "value",
      title: "Total Value",
      value: toCompactCurrency(totalValue),
      exactValue: toCurrency(totalValue),
      Icon: IndianRupee,
      exact: hasServerSummary,
    },
  ];

  const filtered = !!searchQuery || !!statusFilter;

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

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          // The filter row sits beside the title in one wrapping group, the same
          // shape the Members and Chapters lists use. It had briefly been a
          // joined shell on its own line, which made this page the odd one out.
          className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
        >
          <div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
              Business Opportunities
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-ink-4)]">
              {!isLoading && !isError && edId && (
                <>
                  <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{total}</span>{" "}
                  {total === 1 ? "opportunity" : "opportunities"}
                  {filtered ? " matching" : " raised"}
                  {" · "}
                </>
              )}
              Deals this partner&apos;s chapters are working on
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="relative w-full sm:w-64">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ov-ink-4)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search chapter or member"
                aria-label="Search opportunities"
                className="h-11 w-full rounded-xl bg-[var(--ov-fill-subtle)] pl-9 pr-9 text-[13px] text-[var(--ov-ink)] ring-1 ring-[color:var(--ov-line)] transition-colors placeholder:text-[var(--ov-ink-5)] focus:bg-[var(--ov-fill-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ov-ember)] [&::-webkit-search-cancel-button]:hidden"
              />
              {localSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearchQuery("");
                    // Clearing the box should clear the result, not wait for a
                    // second click on Apply to take effect.
                    setSearchQuery("");
                    setPage(1);
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="w-full sm:w-44">
              <FormSelect
                label="Status"
                hideLabel
                value={localStatusFilter}
                onChange={(e) => {
                  setLocalStatusFilter(e.target.value);
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={statusOptions}
                // Statuses are learnt from the rows that come back, so until
                // some arrive there is nothing to filter by and the only entry
                // is the no-op "All statuses".
                disabled={statusOptions.length < 2}
                className="w-full"
              />
            </div>

            {filtered && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-11 rounded-xl px-3 text-[12.5px] font-medium text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* Each tile says where its number came from. Without a server summary
            the last three can only be computed from the rows on screen, and a
            page-local count under the heading "Closed Won" reads as a total. */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {stats.map((s, index) => (
            <motion.div
              key={s.key}
              initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 + index * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start justify-between gap-3 rounded-2xl bg-[var(--ov-panel)] p-4 shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] sm:p-5"
            >
              <div className="min-w-0">
                <p className="ekam-eyebrow text-[10px] font-semibold leading-[1.4] text-[var(--ov-ink-4)]">
                  {s.title}
                </p>
                <p
                  className="ekam-figure mt-2 text-[26px] font-semibold leading-none text-[var(--ov-ink)] sm:text-[30px]"
                  title={s.exactValue}
                >
                  {isLoading || isError || !edId ? "—" : s.value}
                </p>
                {!isLoading && !isError && edId && !s.exact && (
                  <p className="mt-1.5 text-[11px] leading-4 text-[var(--ov-ink-5)]">on this page</p>
                )}
              </div>
              <span
                aria-hidden="true"
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${
                  s.tone === "success"
                    ? "bg-[var(--ov-success-wash)] text-[var(--ov-success)] ring-[color:var(--ov-success-wash)]"
                    : s.tone === "danger"
                      ? "bg-[var(--ov-danger-wash)] text-[var(--ov-danger)] ring-[color:var(--ov-danger-wash)]"
                      : "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-4)] ring-[color:var(--ov-line)]"
                }`}
              >
                <s.Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
            </motion.div>
          ))}
        </div>

        {!edId ? (
          // Reaching this route with no id used to skip the query silently and
          // leave a permanently empty table, which reads as "this partner has
          // none" rather than "nothing was asked for".
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-ink-3)] ring-1 ring-[color:var(--ov-line)]">
            No partner selected. Open this from a partner on the{" "}
            <button
              type="button"
              onClick={() => navigate("/admin/franchise")}
              className="font-medium text-[var(--ov-ember)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            >
              Franchise Partner
            </button>{" "}
            list.
          </div>
        ) : isError ? (
          // The page used to raise a toast and still render "No data available",
          // so a failed request was indistinguishable from an empty one.
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
            Couldn&apos;t load business opportunities. Check your connection and try again.
          </div>
        ) : isLoading ? (
          // Skeleton rows rather than a spinner that replaces the whole table:
          // the shape of what is loading is itself information.
          <div className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] ring-1 ring-[color:var(--ov-line)]">
            <div className="h-12 bg-[var(--ov-raised)]" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse border-t border-[color:var(--ov-line-faint)] bg-[var(--ov-panel)]"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-dashed border-[color:var(--ov-line-strong)] bg-[var(--ov-fill-subtle)] px-6 py-16 text-center"
          >
            <span
              aria-hidden="true"
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--ov-ember-wash)] text-[var(--ov-ember)] ring-1 ring-[color:var(--ov-ember-wash)]"
            >
              <Briefcase className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[17px] font-semibold text-[var(--ov-ink)]">
              {filtered ? "Nothing matches those filters" : "No opportunities yet"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              {filtered
                ? "Try a different status, or clear the search."
                : "Opportunities appear here once this partner's chapters start raising them."}
            </p>
            {filtered && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 h-9 rounded-lg px-4 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                Clear filters
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            // Paging keeps the old rows on screen and dims them, rather than
            // dropping back to a skeleton and losing the reader's place.
            className={`overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] transition-opacity ${
              isFetching ? "opacity-60" : "opacity-100"
            }`}
          >
            <DataTable
              columns={columns}
              data={rows}
              searchValues={{}}
              onSearchChange={() => {}}
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={(p) => setPage(p)}
              renderCell={(column, row) => {
                if (column.key === "status") {
                  // Status wears the reserved status tokens rather than raw
                  // Tailwind greens and greys, so it holds up on any theme, and
                  // anything still open is the accent instead of being lumped in
                  // with cancelled deals under one grey.
                  const norm = normalizeStatus(row.status);
                  if (!norm || row.status === "-") {
                    return <span className="text-[var(--ov-ink-5)]">&mdash;</span>;
                  }
                  const tone = norm.includes("WON")
                    ? "bg-[var(--ov-success-wash)] text-[var(--ov-success)]"
                    : norm.includes("LOST") || norm.includes("CANCEL")
                      ? "bg-[var(--ov-danger-wash)] text-[var(--ov-danger)]"
                      : "bg-[var(--ov-ember-wash)] text-[var(--ov-ember)]";
                  return (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-medium ${tone}`}
                    >
                      {row.status}
                    </span>
                  );
                }
                // Money and dates only line up column-wise if they are tabular.
                if (column.key === "valueFormatted") {
                  return <span className="ekam-figure">{row.valueFormatted}</span>;
                }
                if (column.key === "createdDate") {
                  return <span className="ekam-figure">{row.createdDate}</span>;
                }
                return null;
              }}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
