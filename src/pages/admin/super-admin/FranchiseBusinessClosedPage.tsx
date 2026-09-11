import React, { useEffect, useMemo, useRef, useState } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Search as SearchIcon,
  X,
  CircleCheck,
  IndianRupee,
  Percent,
  Scale,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import DataTable, { type TableColumn } from "../../../components/common/DataTable";
import {
  type BusinessClosedResponse,
  type BusinessFilters,
  useGetBusinessClosedQuery,
} from "../../../services/superadmin/adminFranchiseApi";

type ClosedRow = {
  id: string;
  chapter: string;
  memberInvolved: string;
  amount: number | null;
  amountFormatted: string;
  category: string;
  completionDate: string;
};

const columns: TableColumn[] = [
  { key: "chapter", label: "Chapter", sortable: true, searchable: true },
  { key: "memberInvolved", label: "Member Involved", sortable: true, searchable: true },
  { key: "amountFormatted", label: "Amount", sortable: true, searchable: true },
  // The API has been sending `category` on every record all along; the page just
  // never showed it.
  { key: "category", label: "Category", sortable: true, searchable: true },
  { key: "completionDate", label: "Completion Date", sortable: true, searchable: false },
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

const titleCase = (value?: string | null) => {
  if (!value) return "-";
  return String(value)
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
};

export default function FranchiseBusinessClosedPage() {
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
  const [page, setPage] = useState(1);

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
    setSearchQuery("");
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
  };

  const { data: res, isLoading, isFetching, isError } = useGetBusinessClosedQuery(
    { edId, filters },
    { skip: !edId },
  );

  const apiItems: BusinessClosedResponse[] = res?.data?.data ?? [];
  const total = res?.data?.pagination?.total ?? apiItems.length;

  const rows: ClosedRow[] = useMemo(
    () =>
      apiItems.map((item) => ({
        id: String(item.id),
        chapter: item.chapter?.name || "-",
        memberInvolved: item.memberInvolved?.name || "-",
        amount: item.amount ?? null,
        amountFormatted: toCurrency(item.amount),
        category: titleCase(item.category),
        completionDate: toDisplayDate(item.completionDate),
      })),
    [apiItems],
  );

  const summary = res?.data?.summary;
  const hasServerSummary = typeof summary?.totalValue === "number";

  const totalAmount = useMemo(() => {
    if (typeof summary?.totalValue === "number") return summary.totalValue;
    return apiItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [apiItems, summary?.totalValue]);

  // The tile read a hardcoded `useMemo(() => 0, [])`, so Total Commission was
  // always ₹0 no matter what came back — while every record carries a
  // commissionAmount the page never looked at.
  const totalCommission = useMemo(
    () => apiItems.reduce((sum, item) => sum + (item.commissionAmount || 0), 0),
    [apiItems],
  );
  const anyCommission = apiItems.some((i) => typeof i.commissionAmount === "number");

  // The average divided a possibly page-local total by the full-dataset count,
  // which is two different populations over one another. Both halves now come
  // from the same place.
  const avgAmount = useMemo(() => {
    if (typeof summary?.averageValue === "number") return summary.averageValue;
    if (hasServerSummary && total > 0) return Math.round(totalAmount / total);
    if (apiItems.length === 0) return 0;
    return Math.round(
      apiItems.reduce((sum, item) => sum + (item.amount || 0), 0) / apiItems.length,
    );
  }, [summary?.averageValue, hasServerSummary, total, totalAmount, apiItems]);

  const stats = [
    {
      key: "closed",
      title: "Total Closed",
      value: String(total),
      Icon: CircleCheck,
      tone: "success" as const,
      exact: true,
    },
    {
      key: "amount",
      title: "Total Amount",
      value: toCompactCurrency(totalAmount),
      exactValue: toCurrency(totalAmount),
      Icon: IndianRupee,
      exact: hasServerSummary,
    },
    {
      key: "commission",
      title: "Total Commission",
      value: anyCommission ? toCompactCurrency(totalCommission) : "—",
      exactValue: anyCommission ? toCurrency(totalCommission) : undefined,
      Icon: Percent,
      // Never exact: there is no server-side commission total, so this is
      // either summed from the rows in hand or absent entirely. Both cases need
      // the caption — "exact: !anyCommission" suppressed it in the second one,
      // leaving a bare em-dash with nothing to explain it.
      exact: false,
      note: anyCommission ? "on this page" : "not reported",
    },
    {
      key: "avg",
      title: "Avg Amount",
      value: toCompactCurrency(avgAmount),
      exactValue: toCurrency(avgAmount),
      Icon: Scale,
      exact: typeof summary?.averageValue === "number" || hasServerSummary,
    },
  ];

  const filtered = !!searchQuery;

  // Kept so a future category filter has somewhere to read its vocabulary from,
  // and so the column can be checked against what actually arrives.
  const seenCategories = useRef<Set<string>>(new Set());
  useEffect(() => {
    apiItems.forEach((i) => {
      const raw = String(i.category || "").trim();
      if (raw) seenCategories.current.add(raw);
    });
  }, [apiItems]);

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
          // shape the Members and Chapters lists use, so the drill-downs under
          // Franchise Partner all present their filters the same way.
          className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
        >
          <div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
              Business Closed
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-ink-4)]">
              {!isLoading && !isError && edId && (
                <>
                  <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{total}</span>{" "}
                  {total === 1 ? "deal" : "deals"}
                  {filtered ? " matching" : " booked"}
                  {" · "}
                </>
              )}
              Business this partner&apos;s chapters have completed
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
                aria-label="Search closed business"
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
            these can only be computed from the rows on screen, and a page-local
            figure under the heading "Total Amount" reads as a grand total. */}
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
                  <p className="mt-1.5 text-[11px] leading-4 text-[var(--ov-ink-5)]">
                    {s.note || "on this page"}
                  </p>
                )}
              </div>
              <span
                aria-hidden="true"
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${
                  s.tone === "success"
                    ? "bg-[var(--ov-success-wash)] text-[var(--ov-success)] ring-[color:var(--ov-success-wash)]"
                    : "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-4)] ring-[color:var(--ov-line)]"
                }`}
              >
                <s.Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
            </motion.div>
          ))}
        </div>

        {!edId ? (
          // This route carries no :id, so edId arrives only in router state from
          // the partner detail page. Opening the URL directly skipped the query
          // and left every tile on zero and the table on "No data available",
          // which reads as "this partner has closed nothing".
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
            Couldn&apos;t load closed business. Check your connection and try again.
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
              <CircleCheck className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[17px] font-semibold text-[var(--ov-ink)]">
              {filtered ? "Nothing matches that search" : "Nothing closed yet"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              {filtered
                ? "Try a different chapter, member or category."
                : "Deals appear here once this partner's chapters close them."}
            </p>
            {filtered && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 h-9 rounded-lg px-4 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                Clear search
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
                if (column.key === "category") {
                  if (!row.category || row.category === "-") {
                    return <span className="text-[var(--ov-ink-5)]">&mdash;</span>;
                  }
                  return (
                    <span className="inline-flex items-center rounded-full bg-[var(--ov-fill-subtle)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--ov-ink-3)]">
                      {row.category}
                    </span>
                  );
                }
                // Money and dates only line up column-wise if they are tabular.
                if (column.key === "amountFormatted") {
                  return <span className="ekam-figure">{row.amountFormatted}</span>;
                }
                if (column.key === "completionDate") {
                  return <span className="ekam-figure">{row.completionDate}</span>;
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
