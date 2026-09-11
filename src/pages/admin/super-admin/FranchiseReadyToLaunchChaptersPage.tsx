import { useState, useRef } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Calendar, Search as SearchIcon } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import DataTable from "../../../components/common/DataTable";
import FormSelect from "../../../components/forms/FormSelect";
import type { TableColumn } from "../../../components/common/DataTable";
import { useGetReadyToLaunchChaptersQuery } from "../../../services/superadmin/adminFranchiseApi";
import type { ChapterFilters } from "../../../services/superadmin/adminFranchiseApi";


// Table columns configuration
/** The API limit and the table footer must agree, or the page count is computed
 *  from a different size than the one being fetched. */
const PAGE_SIZE = 10;

const columns: TableColumn[] = [
  {
    key: "chapterName",
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

export default function FranchiseReadyToLaunchChaptersPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
  // Get edId from location state (passed from FranchisePartnerDetailPage)
  const edId = location.state?.edId || id;

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  
  // Local states for form inputs
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [localStatusFilter, setLocalStatusFilter] = useState("");
  const reduceMotion = useReducedMotion();

  // Build filters object for API
  const filters: ChapterFilters = {
    page,
    limit: PAGE_SIZE,
    search: searchQuery || undefined,
    status: localStatusFilter as "active" | "ready_to_launch" | "inactive" || undefined,
  };

  // API Integration - Only call API if edId is available
  const { data, isLoading, error } = useGetReadyToLaunchChaptersQuery(
    edId ? { edId: edId, filters: edId ? filters : {} } : { edId: "", filters: {} },
    {
      skip: !edId, // Skip the query if edId is not available
    }
  );

  // Transform API data to match table column keys
  const apiReadyChapters =
    data?.data?.data?.map((item: any) => {
      return {
        id: item.id,
        name: item.name || "-",
        // The table asks for `chapterName` and `noOfMembers`; the mapping only
        // ever emitted `name`, `targetMembers` and `currentMembers`, so those two
        // columns rendered blank for every row against the real API.
        chapterName: item.name || "-",
        noOfMembers: item.currentMembers ?? 0,
        region: item.region || "-",
        area: item.area || "-",
        city: item.city || "-",
        country: item.country || "-",
        status: item.status || "-",
        targetMembers: item.targetMembers || 0,
        currentMembers: item.currentMembers || 0,
        completionPercentage: item.completionPercentage || 0,
        launchDate: item.launchDate ? new Date(item.launchDate).toLocaleDateString('en-GB') : "-",
        createdDate: item.createdDate ? new Date(item.createdDate).toLocaleDateString('en-GB') : "-",
        coordinator: item.coordinator || "-",
        notes: item.description || "-",
      };
    }) || [];

  const readyChaptersData = apiReadyChapters.length > 0 ? apiReadyChapters : [];


  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "ready_to_launch", label: "Ready to Launch" },
    { value: "planning", label: "Planning" },
    { value: "recruiting", label: "Recruiting" },
    { value: "training", label: "Training" },
  ];

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
    // Apply local filter values to actual filter states
    setSearchQuery(localSearchQuery);
    setLocalStatusFilter(localStatusFilter);
    setPage(1);
  };

  // Handle Enter key press in search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle column search changes (with buffering to prevent immediate API calls)
  const handleColumnSearchChange = (key: string, value: string) => {
    // Update buffered value immediately for UI
    setBufferedColumnSearches((prev: any) => ({
      ...prev,
      [key]: value
    }));
    
    // Clear existing timeout
    if (columnSearchTimeoutRef.current) {
      clearTimeout(columnSearchTimeoutRef.current);
    }
    
    // Set new timeout to update actual search values after 500ms
    columnSearchTimeoutRef.current = window.setTimeout(() => {
      setColumnSearches((prev: any) => ({
        ...prev,
        [key]: value
      }));
      setPage(1);
    }, 500);
  };

  const totalChapters = data?.data?.pagination?.total ?? readyChaptersData.length;

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
          className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
              Ready to Launch
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-ink-4)]">
              <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
                {totalChapters}
              </span>{" "}
              {totalChapters === 1 ? "chapter" : "chapters"} in the pipeline
            </p>
          </div>

          {/* One search box, not two. The page had a labelled input with a Search
              button above the table and a second input inside the table header,
              both bound to the same state - typing in either filled the other. */}
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
                placeholder="Search name, city or area"
                aria-label="Search chapters"
                className="h-11 w-full rounded-xl bg-[var(--ov-fill-subtle)] pl-9 pr-3 text-[13px] text-[var(--ov-ink)] ring-1 ring-[color:var(--ov-line)] transition-colors placeholder:text-[var(--ov-ink-5)] focus:bg-[var(--ov-fill-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ov-ember)]"
              />
            </div>

            {/* The native <select> was the only unstyled control on the page, so
                it never matched the height or the theme of anything beside it. */}
            <div className="w-full sm:w-48">
              <FormSelect
                label="Status"
                hideLabel
                value={localStatusFilter}
                onChange={(e) => {
                  setLocalStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={statusOptions}
                className="w-full"
              />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              className="h-11 rounded-xl px-4 text-[12.5px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            >
              Apply
            </button>
          </div>
        </motion.div>

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
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]"
          >
            <DataTable
              columns={columns}
              data={readyChaptersData}
              searchValues={bufferedColumnSearches}
              onSearchChange={handleColumnSearchChange}
              total={totalChapters}
              page={page}
              // Must match the API's `limit`, or the footer computes a page count
              // from a different page size than the one being fetched.
              pageSize={PAGE_SIZE}
              onPageChange={(p) => setPage(p)}
              renderCell={(column, row) => {
                if (column.key === "status") {
                  // Status wears the reserved status tokens rather than raw
                  // Tailwind greens and greys, so it holds up on any theme.
                  const tone =
                    {
                      Ready: "bg-[var(--ov-success-wash)] text-[var(--ov-success)]",
                      "In Progress": "bg-[var(--ov-ember-wash)] text-[var(--ov-ember)]",
                      Pending: "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-4)]",
                    }[row.status as "Ready" | "In Progress" | "Pending"] ??
                    "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-4)]";
                  return (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-medium ${tone}`}
                    >
                      {row.status}
                    </span>
                  );
                }
                if (column.key === "launchDate") {
                  return (
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--ov-ink-5)]" aria-hidden="true" />
                      <span className="ekam-figure">{row.launchDate}</span>
                    </span>
                  );
                }
                return null; // Let the default rendering handle other columns
              }}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
