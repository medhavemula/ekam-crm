import React, { useState, useEffect } from "react";
import { Users2 } from "lucide-react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import GradientContainer from "../../../components/common/GradientContainer";
import DataTable from "../../../components/common/DataTable";
import type { TableColumn } from "../../../components/common/DataTable";
import { ReportInfoBar } from "../../../components/reports";
import DatePicker from "../../../components/common/DatePicker";
import FormSelect from "../../../components/forms/FormSelect";
import { useGetEdChaptersQuery, useGetEdP2PListQuery } from "../../../services/ed";
import calendarIcon from "../../../assets/icons/calendar.svg";
import PrintHeader from "../../../components/print/PrintHeader";
import PrintFooter from "../../../components/print/PrintFooter";

// Table columns configuration
const columns: TableColumn[] = [
  { key: "date", label: "Date", sortable: true, searchable: false },
  { key: "meetWith", label: "Meet With", sortable: true, searchable: true },
  { key: "initiatedBy", label: "Initiated by", sortable: true, searchable: true },
  { key: "location", label: "Location", sortable: true, searchable: true },
  { key: "topics", label: "Topics", sortable: true, searchable: true },
];

// Helper to format date as DD/MM/YYYY
const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export default function P2PPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName] = useState("Mike");
  const routeState = location.state as { chapterId?: string } | null;

  // Pending (UI) filters
  const [pendingStartDate, setPendingStartDate] = useState<string>("");
  const [pendingEndDate, setPendingEndDate] = useState<string>("");
  const [pendingChapter, setPendingChapter] = useState<string>("ALL_CHAPTERS");
  // Applied filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("ALL_CHAPTERS");
  const [page, setPage] = useState(1);
  const [entriesPerPage] = useState(10);

  // Column search states
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Load chapters for Chapter filter using ED chapters list API
  const { data: chaptersRes } = useGetEdChaptersQuery({ page: 1, limit: 50 });
  const chapterOptions = (
    [{ value: "ALL_CHAPTERS", label: "All Chapters" }] as Array<{ value: string; label: string }>
  ).concat(
    ((chaptersRes as any)?.data?.items ?? []).map((c: any) => ({ value: c.id, label: c.name })) as Array<{
      value: string;
      label: string;
    }>,
  );

  // Default to "All Chapters" - no need to set a specific chapter
  // User can select a specific chapter if they want to filter
  // If navigated from Chapter Details with a chapterId in state, preselect it
  useEffect(() => {
    const ch = routeState?.chapterId ? String(routeState.chapterId) : undefined;
    if (ch) {
      setPendingChapter(ch);
      setSelectedChapter(ch);
    }
    // we intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive chapter object for region info
  const chapterItems: any[] = ((chaptersRes as any)?.data?.items || []) as any[];
  const chapterParam = selectedChapter && selectedChapter !== "ALL_CHAPTERS" ? selectedChapter : undefined;
  const selectedChapterObj = chapterParam
    ? chapterItems.find((c: any) => String(c.id) === String(chapterParam))
    : undefined;

  // Derive regionId from chapters list for scope compliance
  const uniqueRegions: string[] = Array.from(new Set(chapterItems.map((c: any) => String(c.regionId)).filter(Boolean)));
  const regionIdToSend: string | undefined = selectedChapterObj?.regionId || uniqueRegions[0];

  // Only send chapterId if a specific chapter is selected (not "All Chapters")
  const safeChapterId = chapterParam ? chapterParam : undefined;
  const ready = !!regionIdToSend;

  // Fetch P2P data using ED API with search
  // If no chapter selected, fetch all data for the region
  // If chapter selected, filter by that chapter
  const { data, isLoading, error, refetch } = useGetEdP2PListQuery(
    ready
      ? {
          ...(safeChapterId ? { chapterId: safeChapterId } : {}),
          regionId: regionIdToSend,
          startDate: startDate ? `${startDate}T00:00:00` : undefined,
          endDate: endDate ? `${endDate}T23:59:59` : undefined,
          ...(Object.entries(columnSearches).reduce((acc, [_, value]) => {
            if (value.trim()) {
              // Use 'search' as the parameter name for all searches
              acc['search'] = value.trim();
            }
            return acc;
          }, {} as Record<string, string>)),
          page,
          limit: entriesPerPage,
        }
      : undefined,
    { 
      skip: !ready,
      refetchOnMountOrArgChange: true, // Refetch when search query changes
    },
  );

  // Map API data to table format based on actual API response
  const p2pData = React.useMemo(() => {
    return ((data as any)?.data?.items || (data as any)?.items || []).map((item: any) => ({
      date: item?.date ? formatDate(item.date) : "",
      meetWith: item?.with || "",
      initiatedBy: item?.initiatedBy || "",
      location: item?.location || "",
      topics: item?.topics || "",
      _original: item
    }));
  }, [data]);

  // Get total count from API response
  const totalCount = (data as any)?.data?.total || (data as any)?.total || 0;
  const regionName = ((data as any)?.header?.region) || selectedChapterObj?.regionName || "";

  const handleSearch = () => {
    // Applied as they stand, empty included — the old version only ever widened
    // a filter, so once a date was set there was no way back to everything.
    setStartDate(pendingStartDate);
    setEndDate(pendingEndDate);
    setSelectedChapter(pendingChapter);
    setPage(1);
    refetch();
  };

  const hasFilters =
    Boolean(startDate) || Boolean(endDate) || selectedChapter !== "ALL_CHAPTERS";

  const clearFilters = () => {
    setPendingStartDate("");
    setPendingEndDate("");
    setPendingChapter("ALL_CHAPTERS");
    setStartDate("");
    setEndDate("");
    setSelectedChapter("ALL_CHAPTERS");
    setPage(1);
  };

  const handleColumnSearchChange = (key: string, value: string) => {
    // Update the search value for the specific column
    const newSearches = { ...columnSearches, [key]: value };
    setColumnSearches(newSearches);
    
    // Debounce the API call
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    setSearchTimeout(
      setTimeout(() => {
        setPage(1); // Reset to first page on new search
        // The API call will automatically trigger due to the columnSearches state change
      }, 300)
    );
  };


  const chapterDetailsPath = routeState?.chapterId
    ? `/admin/regional-board/chapter/${routeState.chapterId}`
    : null;
  const breadcrumbs = [
    chapterDetailsPath
      ? { label: "Regional Board", onClick: () => navigate(chapterDetailsPath) }
      : { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "P2P" },
  ];

  return (
    <div className={`${ADMIN_THEME} min-h-screen`}
      style={{ background: "var(--ov-floor)" }}>
      <div className="print:hidden"><Navbar userName={userName} /></div>

      {/* Global Print Header/Footer (print only) */}
      <PrintHeader userName={userName} />
      <PrintFooter />

      <main className="container mx-auto px-4 py-6">
        {/* Print spacer for fixed header */}
        <div className="print:block hidden h-[68px]"></div>
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} className="mb-3" />

        <div className="mb-5">
          <div className="mb-2">
            <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
              <Users2 className="h-3.5 w-3.5" />
              <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                1-to-1 Meetings
              </span>
            </div>
          </div>
          <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
            P2P
          </h1>
          <p className="mt-2.5 text-[12px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
            {!isLoading && (
              <>
                <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{totalCount}</span>{" "}
                {totalCount === 1 ? "meeting" : "meetings"}
                {" · "}
              </>
            )}
            {hasFilters ? "Matching the filters below." : "Every one-to-one meeting in your region."}
          </p>
        </div>

        {/* Admin Filters */}
        <div className="mb-6 print:hidden">
          <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-[var(--ov-trough)] p-4 ring-1 ring-[color:var(--ov-line-faint)]">
            {/* Start Date */}
            <div className="flex-none w-full sm:w-auto lg:w-[200px]">
              <label className="mb-1.5 block text-xs text-[var(--field-label)]">Start Date</label>
              <DatePicker
                value={pendingStartDate || startDate}
                onChange={setPendingStartDate}
                iconSrc={calendarIcon}
                iconAlt="Calendar"
                iconPosition="right"
              />
            </div>

            {/* End Date */}
            <div className="flex-none w-full sm:w-auto lg:w-[200px]">
              <label className="mb-1.5 block text-xs text-[var(--field-label)]">End Date</label>
              <DatePicker
                value={pendingEndDate || endDate}
                onChange={setPendingEndDate}
                iconSrc={calendarIcon}
                iconAlt="Calendar"
                iconPosition="right"
              />
            </div>

            {/* Chapter Filter */}
            <div className="flex-none w-full sm:w-auto lg:w-[200px]">
              <FormSelect label="Chapter" className="text-[13px]" value={pendingChapter || selectedChapter} onChange={(e) => setPendingChapter(e.target.value)} options={chapterOptions} />
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="inline-flex h-11 items-center gap-1.5 rounded-[var(--field-radius)] bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-trough)] disabled:opacity-50"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center gap-1.5 rounded-[var(--field-radius)] px-3 text-[13px] font-medium text-[var(--ov-ink-3)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                Clear
              </button>
            )}

            <div className="ml-auto flex items-end gap-3 sm:w-auto">
              {/* Print Button */}
              {false && (
                <button
                  onClick={() => window.print()}
                  className="h-11 w-36 px-6 rounded-md bg-[var(--ov-fill-subtle)] hover:bg-[var(--ov-fill-hover)] text-[var(--ov-ink)] font-medium transition-colors whitespace-nowrap"
                >
                  Print
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8 text-[var(--ov-ink)] mb-6">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2">Loading P2P...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-[var(--ov-danger-wash)] border border-[color:var(--ov-danger)] text-[var(--ov-danger)] px-4 py-3 rounded-lg mb-6">
            Failed to load P2P. Please try again.
          </div>
        )}

        {/* Table Section */}
        {!isLoading && (
          <GradientContainer>
            <div className="rounded-2xl overflow-hidden">
              {/* Report Info Bar */}
              <ReportInfoBar
                chapter={chapterOptions.find((o) => o.value === selectedChapter)?.label || "All Chapters"}
                member=""
                region={regionName}
                fromDate={startDate ? formatDate(startDate) : "All time"}
                toDate={endDate ? formatDate(endDate) : "All time"}
              />

              {/* Data Table */}
              <DataTable
                columns={columns}
                data={p2pData}
                searchValues={columnSearches}
                onSearchChange={handleColumnSearchChange}
                total={totalCount}
                page={page}
                pageSize={entriesPerPage}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </GradientContainer>
        )}
      {/* Print spacer for fixed footer */}
      <div className="print:block hidden h-[44px]"></div>
      </main>
    </div>
  );
}
