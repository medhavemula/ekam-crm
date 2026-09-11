import { useState, useRef, useEffect } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import DataTable from "../../../components/common/DataTable";
import type { TableColumn } from "../../../components/common/DataTable";
import { useGetChaptersQuery } from "../../../services/superadmin/adminFranchiseApi";
import type { ChapterFilters } from "../../../services/superadmin/adminFranchiseApi";

/** The API limit and the table footer must agree, or the page count is computed
 *  from a different size than the one being fetched. */
const PAGE_SIZE = 10;

// Table columns configuration
const columns: TableColumn[] = [
  {
    key: "name",
    label: "Chapter Name",
    sortable: true,
    searchable: true,
  },
  { key: "launchDate", label: "Launch Date", sortable: true, searchable: false },
  { key: "region", label: "Region", sortable: true, searchable: true },
  { key: "area", label: "Area", sortable: true, searchable: true },
  {
    key: "noOfMembers",
    label: "No of Members",
    sortable: true,
    searchable: true,
  },
];

export default function FranchiseChaptersPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  
  // Get edId from location state (passed from FranchisePartnerDetailPage)
  const edId = location.state?.edId || id;

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  
  // Local search state for form input
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  // Build filters object for API
  const filters: ChapterFilters = {
    page,
    limit: PAGE_SIZE,
    search: searchQuery || undefined,
  };

  // API Integration - Only call API if edId is available
  const { data, isLoading, error } = useGetChaptersQuery(
    edId ? { edId: edId, filters: edId ? filters : {} } : { edId: "", filters: {} },
    {
      skip: !edId, // Skip the query if edId is not available
    }
  );

  // Column search states
  const [, setColumnSearches] = useState<{
    [key: string]: string;
  }>({});

  // Buffer for column search values (to prevent immediate API calls)
  const [bufferedColumnSearches, setBufferedColumnSearches] = useState<{
    [key: string]: string;
  }>({});

  // Debounce timer for column searches
  const columnSearchTimeoutRef = useRef<number | undefined>(undefined);

  // Handle search when button is clicked
  const handleSearch = () => {
    // Apply local search value to actual search state
    setSearchQuery(localSearchQuery);
    setPage(1);
  };

  // Handle Enter key press in search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clean up column search timeout on unmount
  useEffect(() => {
    return () => {
      if (columnSearchTimeoutRef.current) {
        clearTimeout(columnSearchTimeoutRef.current);
      }
    };
  }, []);

  // Transform API data to match table structure
  const chaptersData = data?.data?.data?.map((chapter: any) => ({
    id: chapter.id,
    name: chapter.name || "-",
    launchDate: chapter.launchDate ? new Date(chapter.launchDate).toLocaleDateString('en-GB') : "-",
    region: chapter.region || "-",
    regionId: chapter.region || "-",
    area: chapter.area || "-",
    noOfMembers: chapter.memberCount || 0,
    status: chapter.status || "-",
  })) || [];

  // Calculate stats from API data
  const totalMembers = chaptersData.reduce((sum, ch) => sum + (ch.noOfMembers || 0), 0);
  const totalAreas = new Set(chaptersData.map((ch) => ch.area).filter(Boolean)).size;


  // Handle column search changes (with buffering to prevent immediate API calls)
  const handleColumnSearchChange = (key: string, value: string) => {
    // Update buffered value immediately for UI
    setBufferedColumnSearches(prev => ({
      ...prev,
      [key]: value
    }));

    // Clear existing timeout
    if (columnSearchTimeoutRef.current) {
      clearTimeout(columnSearchTimeoutRef.current);
    }

    // Set new timeout to apply search after 500ms
    columnSearchTimeoutRef.current = window.setTimeout(() => {
      if (key === 'area') {
        // For city/area column search, update the city parameter
        setColumnSearches({ area: value });
        setSearchQuery('');
      } else if (key === 'name') {
        // For chapter name column search, update the q parameter
        setSearchQuery(value);
        setColumnSearches({});
      } else {
        // For other columns, use column search
        setColumnSearches(prev => ({
          ...prev,
          [key]: value
        }));
        setSearchQuery('');
      }
      setPage(1);
    }, 500);
  };

  const totalChapters = data?.data?.pagination?.total ?? chaptersData.length;

  const summary = [
    { label: "Total chapters", value: totalChapters },
    { label: "Total members", value: totalMembers },
    { label: "Total areas", value: totalAreas },
  ];

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
          className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
              Chapters
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-ink-4)]">
              <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
                {totalChapters}
              </span>{" "}
              {totalChapters === 1 ? "chapter" : "chapters"} in this network
            </p>
          </div>

          {/* One search box, not two. The page previously had a labelled input
              with a Search button above the table and a second input inside the
              table header — both bound to the same state, so typing in either
              filled the other and only one of them looked like the real control. */}
          <div className="relative w-full sm:w-72">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ov-ink-4)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search chapters"
              aria-label="Search chapters by name"
              className="h-[38px] w-full rounded-xl bg-[var(--ov-fill-subtle)] pl-9 pr-3 text-[13px] text-[var(--ov-ink)] ring-1 ring-[color:var(--ov-line)] transition-colors placeholder:text-[var(--ov-ink-5)] focus:bg-[var(--ov-fill-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ov-ember)]"
            />
          </div>
        </motion.div>

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
                {s.value}
              </p>
            </motion.div>
          ))}
        </div>

        {error ? (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
            Couldn't load chapters. Check your connection and try again.
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
        ) : (
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]"
          >
            <DataTable
              columns={columns}
              data={chaptersData}
              searchValues={bufferedColumnSearches}
              onSearchChange={handleColumnSearchChange}
              total={totalChapters}
              page={page}
              // Must match the API's `limit` below, or the footer computes a page
              // count from a different page size than the one being fetched.
              pageSize={PAGE_SIZE}
              onPageChange={(p) => setPage(p)}
              renderCell={() => null}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
