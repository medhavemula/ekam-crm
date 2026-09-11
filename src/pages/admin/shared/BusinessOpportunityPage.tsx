import { useState, useEffect } from "react";
import { Briefcase } from "lucide-react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import GradientContainer from "../../../components/common/GradientContainer";
import DataTable from "../../../components/common/DataTable";
import type { TableColumn } from "../../../components/common/DataTable";

// Extend the TableColumn type to include className and render
interface ExtendedTableColumn extends TableColumn {
  className?: string;
  render?: (column: TableColumn, row: any) => { props: any, children: React.ReactNode };
}

import { ReportInfoBar } from "../../../components/reports";
import { ReportStatCard } from "../../../components/reports/ReportStatCard";
import DatePicker from "../../../components/common/DatePicker";
import FormSelect from "../../../components/forms/FormSelect";
import { useGetEdChaptersQuery, useGetEdOpportunitiesQuery } from "../../../services/ed";
import calendarIcon from "../../../assets/icons/calendar.svg";
import PrintHeader from "../../../components/print/PrintHeader";
import PrintFooter from "../../../components/print/PrintFooter";

// Table columns configuration
const columns: ExtendedTableColumn[] = [
  { key: "borDate", label: "BOR Date", sortable: true, searchable: false },
  { key: "fromName", label: "From Name", sortable: true, searchable: true },
  { key: "phone", label: "Phone", sortable: true, searchable: true },
  { key: "email", label: "Email", sortable: true, searchable: true, minWidth: 230 },
  { key: "referredToName", label: "Referred To Name", sortable: true, searchable: true, minWidth: 190 },
  { key: "lastUpdated", label: "Last Updated", sortable: true, searchable: false },
  { key: "status", label: "Status", sortable: true, searchable: true },
  { 
    key: "businessClosed", 
    label: "Business Closed", 
    sortable: true, 
    searchable: true,
    className: 'text-right',
    render: (_column: TableColumn, row: any) => ({
      props: { className: 'text-right' },
      children: row.businessClosed
    })
  },
  { key: "comments", label: "Comments", sortable: true, searchable: true, minWidth: 220 },
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

export default function BusinessOpportunityPage() {
  const navigate = useNavigate();
  const [userName] = useState("Mike");

  // Get chapterId from URL params
  const { chapterId: urlChapterId } = useParams<{ chapterId?: string }>();

  // Pending (UI) filters
  const [pendingStartDate, setPendingStartDate] = useState<string>("");
  const [pendingEndDate, setPendingEndDate] = useState<string>("");
  const [pendingChapter, setPendingChapter] = useState<string>(urlChapterId || "ALL_CHAPTERS");
  const [chapterSearchQuery, setChapterSearchQuery] = useState("");
  const [debouncedChapterSearchQuery, setDebouncedChapterSearchQuery] = useState("");
  // Applied filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedChapter, setSelectedChapter] = useState(urlChapterId || "ALL_CHAPTERS");
  const [page, setPage] = useState(1);
  const [entriesPerPage] = useState(10);
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});
  
  // Sync both dropdown states when the route chapter changes.
  useEffect(() => {
    if (urlChapterId) {
      setPendingChapter(urlChapterId);
      setSelectedChapter(urlChapterId);
      return;
    }

    setPendingChapter("ALL_CHAPTERS");
    setSelectedChapter("ALL_CHAPTERS");
  }, [urlChapterId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedChapterSearchQuery(chapterSearchQuery.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [chapterSearchQuery]);

  // Load chapters for Chapter filter using ED chapters list API
  const { data: chaptersRes } = useGetEdChaptersQuery({
    page: 1,
    limit: 100,
    ...(debouncedChapterSearchQuery ? { q: debouncedChapterSearchQuery } : {}),
  });
  const chapterOptions = (
    [{ value: "ALL_CHAPTERS", label: "All Chapters" }] as Array<{ value: string; label: string }>
  ).concat(
    ((chaptersRes as any)?.data?.items ?? []).map((c: any) => ({ value: c.id, label: c.name })) as Array<{
      value: string;
      label: string;
    }>,
  );

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

  // Get the first non-empty search value from columnSearches
  const searchValue = Object.values(columnSearches).find(val => val.trim() !== '');

  // Fetch opportunities data using ED API with search support
  const { data, isLoading, error, refetch } = useGetEdOpportunitiesQuery(
    ready
      ? {
          ...(safeChapterId ? { chapterId: safeChapterId } : {}),
          regionId: regionIdToSend,
          startDate: startDate ? `${startDate}T00:00:00` : undefined,
          endDate: endDate ? `${endDate}T23:59:59` : undefined,
          // Use a single search parameter for all columns
          ...(searchValue && { search: searchValue.trim() }),
          // Add pagination parameters
          page: page,
          limit: 10,
        }
      : undefined,
    { skip: !ready },
  );

  // Use API data
  const opportunities = (data as any)?.items || [];
  const total = (data as any)?.pagination?.total || opportunities.length;
  const regionName = (data as any)?.region?.name || selectedChapterObj?.regionName || "";
  const kpis = (data as any)?.kpis || { totalMembers: 0, businessClosedTotal: 0 };

  // Format opportunities data for table
  const formattedOpportunities = opportunities.map((opp: any) => ({
    ...opp,
    borDate: formatDate(opp.borDate),
    lastUpdated: formatDate(opp.lastUpdated),
    businessClosed: opp.businessClosed ? `₹${opp.businessClosed.toLocaleString('en-IN')}` : '₹0',
  }));

  // Custom cell renderer to show "-" for empty cells
  const renderCell = (column: TableColumn, row: any) => {
    const value = row[column.key];
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return null; // Use default rendering
  };

  // Stats from KPIs
  /** The KPI arrives as a plain number; every other rupee figure here is formatted. */
  const formatRupees = (n: unknown) => {
    const value = Number(n);
    if (!Number.isFinite(value)) return "₹0";
    return "₹" + value.toLocaleString("en-IN");
  };

  const stats = {
    totalMembers: kpis.totalMembers,
    businessClosed: kpis.businessClosedTotal,
  };

  const handleSearch = () => {
    setStartDate(pendingStartDate);
    setEndDate(pendingEndDate);
    setSelectedChapter(pendingChapter);
    setPage(1);
    // Clear column searches when doing a main search
    setColumnSearches({});
    refetch();
  };

  const hasDateOrChapterFilters =
    Boolean(startDate) || Boolean(endDate) || (selectedChapter !== "ALL_CHAPTERS" && !urlChapterId);

  const clearDateFilters = () => {
    setPendingStartDate("");
    setPendingEndDate("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setColumnSearches({});
  };

  const handleColumnSearchChange = (key: string, value: string) => {
    // Only keep one search at a time by clearing other searches
    setColumnSearches({ [key]: value });
    setPage(1);
  };

  const chapterDetailsPath = urlChapterId
    ? `/admin/regional-board/chapter/${urlChapterId}`
    : null;
  const breadcrumbChapterName =
    selectedChapterObj?.name ||
    chapterItems.find((c: any) => String(c.id) === String(urlChapterId || ""))?.name ||
    "Chapter";
  const breadcrumbs = chapterDetailsPath
    ? [
        { label: "Regional Board", onClick: () => navigate(chapterDetailsPath) },
        { label: `Chapter Details - ${breadcrumbChapterName}` },
        { label: "Business Opportunity" },
      ]
    : [
        { label: "Business", onClick: () => navigate("/dashboard") },
        { label: "Business Opportunity" },
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

        <div className="mb-5 print:hidden">
          <div className="mb-2">
            <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
              <Briefcase className="h-3.5 w-3.5" />
              <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                Referrals &amp; Pipeline
              </span>
            </div>
          </div>
          <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
            Business Opportunity
          </h1>
          <p className="mt-2.5 text-[12px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
            Referrals raised between members, and the business closed against them.
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
              <FormSelect
                label="Chapter"
                value={pendingChapter}
                onChange={(e) => setPendingChapter(e.target.value)}
                options={chapterOptions}
                className="text-[13px]"
                searchable
                searchPlaceholder="Search chapters"
                onSearchChange={setChapterSearchQuery}
                disableClientSideFilter
              />
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="inline-flex h-11 items-center gap-1.5 rounded-[var(--field-radius)] bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-trough)] disabled:opacity-50"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>

            {hasDateOrChapterFilters && (
              <button
                type="button"
                onClick={clearDateFilters}
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

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ReportStatCard title="Members involved" value={stats.totalMembers} />
          <ReportStatCard title="Business closed" value={formatRupees(stats.businessClosed)} />
        </div>


        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8 text-[var(--ov-ink)] mb-6">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-[color:var(--ov-ember)]"></div>
            <p className="mt-2">Loading opportunities...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-[var(--ov-danger-wash)] border border-[color:var(--ov-danger)] text-[var(--ov-danger)] px-4 py-3 rounded-lg mb-6">
            Failed to load opportunities. Please try again.
          </div>
        )}

        {/* Table Section */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            {/* Report Info Bar */}
            <ReportInfoBar
              chapter={selectedChapter !== "ALL_CHAPTERS" ? selectedChapterObj?.name || "" : "All Chapters"}
              member=""
              region={selectedChapter !== "ALL_CHAPTERS" ? regionName : undefined}
              fromDate={startDate ? formatDate(startDate) : "All time"}
              toDate={endDate ? formatDate(endDate) : "All time"}
            />
            
            {/* Data Table */}
            <div className="min-h-[400px]">
              {error ? (
                <div className="text-[var(--ov-danger)] p-4">
                  Error loading data. Please try again.
                </div>
              ) : !isLoading ? (
                <DataTable
                  columns={columns}
                  data={formattedOpportunities}
                  searchValues={columnSearches}
                  onSearchChange={handleColumnSearchChange}
                  fitContent
                  page={page}
                  pageSize={entriesPerPage}
                  total={total}
                  onPageChange={setPage}
                  showSearchRow={true}
                  renderCell={renderCell}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[color:var(--ov-ink-4)]"></div>
                </div>
              )}
            </div>
          </div>
        </GradientContainer>
      {/* Print spacer for fixed footer */}
      <div className="print:block hidden h-[44px]"></div>
      </main>
    </div>
  );
}
