import React, { useEffect, useMemo, useState } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Search as SearchIcon, X, Building2 } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import DataTable, { type TableColumn } from "../../../components/common/DataTable";
import {
  useGetSocialPartnerChaptersQuery,
  type SocialPartnerChapter,
  type SocialChaptersSummary,
} from "../../../services/superadmin/adminSocialApi";

const columns: TableColumn[] = [
  { key: "name", label: "Chapter Name", sortable: true, searchable: true },
  { key: "region", label: "Region", sortable: true, searchable: true },
  { key: "area", label: "Area", sortable: true, searchable: true },
  { key: "members", label: "Members", sortable: true, searchable: false },
];

/** The API limit and the table footer read the same number, or the footer
 *  computes a page count from a size that was never fetched. */
const PAGE_SIZE = 20;

export default function SocialPartnerChaptersPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation() as { state?: any };
  const reduceMotion = useReducedMotion();

  const socialId = (location.state?.socialId || id || "") as string;
  const partnerName = location.state?.partnerName as string | undefined;

  // Typed vs applied, the same shape the sibling drill-downs use: nothing is
  // fetched until Apply, and Apply is dead until something actually changed.
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

  const { data, isLoading, isFetching, isError } = useGetSocialPartnerChaptersQuery(
    {
      id: socialId,
      page,
      limit: PAGE_SIZE,
      search: searchQuery || undefined,
    },
    { skip: !socialId },
  );

  /**
   * The endpoint answers in one of two shapes.
   *
   * The current build returns `{ items, page, limit, total }` with the chapter
   * populated and honours `page`, `limit` and `search`. A deployment still
   * running the older build returns a bare array of `{ id, chapter }` — no
   * pagination, no filtering, and none of the extra columns. Reading `.items`
   * off that array gives undefined, which is an empty table rather than an
   * error, so the page looks broken with no clue why.
   *
   * When the legacy array turns up it is the complete set, so searching and
   * paging are done here instead. The columns it cannot supply fall back to
   * "—" through the mapping below.
   */
  const raw = data?.data as
    | SocialPartnerChapter[]
    | { items?: SocialPartnerChapter[]; total?: number; summary?: SocialChaptersSummary }
    | undefined;
  const isLegacyShape = Array.isArray(raw);

  const allItems: SocialPartnerChapter[] = isLegacyShape ? raw : (raw?.items ?? []);

  const legacyFiltered = useMemo(() => {
    if (!isLegacyShape) return allItems;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((c) =>
      [c.chapter?.name, c.area, c.city, c.region]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [isLegacyShape, allItems, searchQuery]);

  const total = isLegacyShape ? legacyFiltered.length : (raw?.total ?? allItems.length);

  /**
   * Totals for the three cards.
   *
   * The server sums these over the whole matching set. When only the legacy
   * array is available there is no summary, but that array is itself the
   * complete set, so summing it here is still exact — unlike summing one page
   * of rows, which is how the franchise equivalent of this page computes its
   * "Total members" and quietly under-reports past page one.
   */
  const summarySource = isLegacyShape ? legacyFiltered : null;
  const summary = useMemo(() => {
    const fromServer = isLegacyShape ? undefined : raw?.summary;
    if (fromServer) {
      return [
        { label: "Total chapters", value: fromServer.chapters },
        { label: "Total members", value: fromServer.members },
        { label: "Total areas", value: fromServer.areas },
      ];
    }
    // The legacy array carries neither members nor area, so those two are not
    // zero — they are unknown, and printing 0 under "Total members" states
    // something the response never said.
    const set = summarySource ?? [];
    const known = set.some((c) => c.members != null || c.area);
    return [
      { label: "Total chapters", value: total },
      {
        label: "Total members",
        value: known ? set.reduce((n, c) => n + (c.members || 0), 0) : "—",
      },
      {
        label: "Total areas",
        value: known ? new Set(set.map((c) => c.area).filter(Boolean)).size : "—",
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLegacyShape, raw, summarySource, total]);

  const apiItems = isLegacyShape
    ? legacyFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : allItems;

  const rows = useMemo(
    () =>
      apiItems.map((c) => ({
        id: c.id,
        name: c.chapter?.name || "-",
        region: c.region || "-",
        area: c.area || "-",
        members: c.members == null ? "-" : String(c.members),
      })),
    [apiItems],
  );

  const filtered = !!searchQuery;

  const backToPartner = () => {
    if (socialId) navigate(`/admin/social/${socialId}`);
    else navigate("/admin/social");
  };

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <button
          type="button"
          onClick={backToPartner}
          className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-[13px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {partnerName || "Social Partner"}
        </button>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
        >
          <div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
              Chapters
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-ink-4)]">
              {!isLoading && !isError && socialId && (
                <>
                  <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{total}</span>{" "}
                  {total === 1 ? "chapter" : "chapters"}
                  {filtered ? " matching" : " assigned"}
                  {" · "}
                </>
              )}
              Social chapters this partner holds
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
                placeholder="Search chapter or area"
                aria-label="Search chapters"
                className="h-11 w-full rounded-xl bg-[var(--ov-fill-subtle)] pl-9 pr-9 text-[13px] text-[var(--ov-ink)] ring-1 ring-[color:var(--ov-line)] transition-colors placeholder:text-[var(--ov-ink-5)] focus:bg-[var(--ov-fill-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ov-ember)] [&::-webkit-search-cancel-button]:hidden"
              />
              {localSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearchQuery("");
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

        {/* Same three cards as the franchise chapters list, so the two
            drill-downs read the same way. */}
        {socialId && !isError && (
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {summary.map((s, i) => (
              <motion.div
                key={s.label}
                initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl bg-[var(--ov-panel)] p-5 shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]"
              >
                <p className="ekam-eyebrow text-[10px] font-semibold text-[var(--ov-ink-4)]">
                  {s.label}
                </p>
                <p className="ekam-figure mt-2 text-[30px] font-semibold leading-none text-[var(--ov-ink)]">
                  {isLoading ? "—" : s.value}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {!socialId ? (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-ink-3)] ring-1 ring-[color:var(--ov-line)]">
            No partner selected. Open this from a partner on the{" "}
            <button
              type="button"
              onClick={() => navigate("/admin/social")}
              className="font-medium text-[var(--ov-ember)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            >
              Social Partner
            </button>{" "}
            list.
          </div>
        ) : isError ? (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
            Couldn&apos;t load chapters. Check your connection and try again.
          </div>
        ) : isLoading ? (
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
              <Building2 className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[17px] font-semibold text-[var(--ov-ink)]">
              {filtered ? "Nothing matches that search" : "No chapters assigned"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              {filtered
                ? "Try a different chapter, area or city."
                : "Chapters appear here once this partner is assigned to one."}
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
                // Counts and dates only line up column-wise if they are tabular.
                if (column.key === "members") {
                  return <span className="ekam-figure">{row.members}</span>;
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
