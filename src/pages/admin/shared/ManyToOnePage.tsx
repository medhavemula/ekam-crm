import { useState, useEffect } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import GradientContainer from "../../../components/common/GradientContainer";
import DataTable from "../../../components/common/DataTable";
import type { TableColumn } from "../../../components/common/DataTable";
import DatePicker from "../../../components/common/DatePicker";
import FormSelect from "../../../components/forms/FormSelect";
import { useRole } from "../../../hooks/useRole";
import { useGetEdM2OListQuery, useGetEdChaptersQuery } from "../../../services/ed";
import calendarIcon from "../../../assets/icons/calendar.svg";
import PrintHeader from "../../../components/print/PrintHeader";
import PrintFooter from "../../../components/print/PrintFooter";

// Table columns configuration
const columns: TableColumn[] = [
  { key: "date", label: "Meeting Date", sortable: true, },
  { key: "topic", label: "Meeting Topic", sortable: true, minWidth: 260 },
  { key: "targetMemberName", label: "Name", sortable: true, },
  { key: "totalMembers", label: "Total Members", sortable: true, },
  { key: "present", label: "Present", sortable: true, },
  { key: "location", label: "Location", sortable: true, },
  { key: "status", label: "Status", sortable: true, },
];

export default function ManyToOnePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName] = useState("Mike");
  const { role: userRole } = useRole();
  const routeState = location.state as { chapterId?: string } | null;

  const showAdminView = [
    "EXECUTIVE_DIRECTOR",
    "ED_TEAM",
    "REGIONAL_DIRECTOR",
    "ASSISTANT_REGIONAL_DIRECTOR"
  ].includes(userRole || "");

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
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});

  // If navigated from Chapter Details with a chapterId in state, preselect it
  useEffect(() => {
    const ch = routeState?.chapterId ? String(routeState.chapterId) : undefined;
    if (ch) {
      setPendingChapter(ch);
      setSelectedChapter(ch);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle row click to navigate to meeting details
  const handleRowClick = (row: any) => {
    if (row?._id && typeof row._id === 'string' && row._id.trim() !== '') {
      navigate(`/admin/ed/m2o/${row._id}`);
    } else {
      console.error('Invalid row ID for navigation:', row);
    }
  };

  // Custom cell renderer for Status column
  const renderCell = (column: TableColumn, row: any) => {
    if (column.key === "status") {
      return (
        <div className="flex items-center gap-2">
          <span>{row.status}</span>
        </div>
      );
    }
    return null;
  };

  // API Integration
  // Use selected chapter id directly from ED chapters list
  const chapterParam = selectedChapter && selectedChapter !== "ALL_CHAPTERS" ? selectedChapter : undefined;

  // Load chapters for Chapter filter using ED chapters list API
  const { data: chaptersRes } = useGetEdChaptersQuery({ page: 1, limit: 50 });
  const chapterOptions = ([{ value: "ALL_CHAPTERS", label: "All Chapters" }] as Array<{ value: string; label: string }>).concat(
    (((chaptersRes as any)?.data?.items ?? []).map((c: any) => ({ value: c.id, label: c.name })) as Array<{ value: string; label: string }>)
  );

  // Set default chapter when API returns data
  useEffect(() => {
    // Default remains All Chapters; no auto-select
  }, [chaptersRes]);

  // Derive regionId from chapters list for scope compliance
  const chapterItems: any[] = (((chaptersRes as any)?.data?.items) || []) as any[];
  const selectedChapterObj = chapterParam ? chapterItems.find((c: any) => String(c.id) === String(chapterParam)) : undefined;
  const uniqueRegions: string[] = Array.from(new Set(chapterItems.map((c: any) => String(c.regionId)).filter(Boolean)));
  const regionIdToSend: string | undefined = selectedChapterObj?.regionId || uniqueRegions[0];
  const allowedChapterIds = new Set(chapterItems.map((c: any) => String(c.id)));
  const safeChapterId = chapterParam && allowedChapterIds.has(String(chapterParam)) ? chapterParam : undefined;
  const ready = !!regionIdToSend || !!safeChapterId;

  const { data, isLoading, error, refetch } = useGetEdM2OListQuery(
    showAdminView && ready ? {
      chapterId: safeChapterId,
      regionId: regionIdToSend,
      from: startDate ? `${startDate}T00:00:00` : undefined,
      to: endDate ? `${endDate}T23:59:59` : undefined,
      page,
      limit: entriesPerPage,
    } : undefined,
    { skip: !showAdminView || !ready }
  );

  // Format the API data to match the table structure
  const formatM2OData = (items: any[] = []) => {
    if (!Array.isArray(items)) return [];
    return items.map(item => ({
      ...item,
      ...(item.kpis || {}), // Flatten kpis into the main object
      date: item.date ? new Date(item.date).toLocaleDateString() : '',
      location: item.place || item.location || item.venue || '',
      topic: item.meetingTopic || item.topic || item.subject || '',
      // Add total members from kpis
      totalMembers: (item.kpis?.totalMembers) || 0,
      // Add members present from kpis
      present: (item.kpis?.present) || 0,
      // Transform status for display
      status: item.status === 'CLOSED' ? 'Completed' : 
              item.status === 'LOCKED' ? 'Completed' : 
              item.status || 'Draft',
    }));
  };

  // Use API data only
  const m2oData = formatM2OData((data as any)?.rows);
  const total = (data as any)?.total || m2oData.length;

  const handleSearch = () => {
    setStartDate(pendingStartDate);
    setEndDate(pendingEndDate);
    if (pendingChapter !== "") setSelectedChapter(pendingChapter);
    setPage(1);
    refetch();
  };

  const hasDateFilters = Boolean(startDate) || Boolean(endDate);

  const clearDateFilters = () => {
    setPendingStartDate("");
    setPendingEndDate("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handlePrint = () => {
    window.print();
  };

  

  const handleColumnSearchChange = (key: string, value: string) => {
    setColumnSearches({ ...columnSearches, [key]: value });
  };

  const chapterDetailsPath = routeState?.chapterId
    ? `/admin/regional-board/chapter/${routeState.chapterId}`
    : null;
  const breadcrumbChapterName = selectedChapterObj?.name || "Chapter";
  const breadcrumbs = chapterDetailsPath
    ? [
        { label: "Regional Board", onClick: () => navigate("/admin/regional-board") },
        { label: breadcrumbChapterName, onClick: () => navigate(chapterDetailsPath) },
        { label: "Many to One" },
      ]
    : [
        { label: "Business", onClick: () => navigate("/dashboard") },
        { label: "Many to One" },
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
          <h1 className="text-[26px] font-bold leading-tight text-[var(--ov-ink)] sm:text-[32px]">
            Many to One
          </h1>
          <p className="mt-2 text-[12.5px] text-[var(--ov-ink-4)]">
            One-on-one deep-dive meetings between members, in the range below.
          </p>
        </div>

        {/* Filters Section - Admin View */}
        {showAdminView && (
          <div className="mb-6">
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
                  className="text-[13px]"
                  value={pendingChapter || selectedChapter}
                  onChange={(e) => setPendingChapter(e.target.value)}
                  options={[
                    { value: "ALL_CHAPTERS", label: "All Chapters" },
                    ...chapterOptions.filter(option => option.value !== "ALL_CHAPTERS")
                  ]}
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

              {hasDateFilters && (
                <button
                  type="button"
                  onClick={clearDateFilters}
                  className="inline-flex h-11 items-center gap-1.5 rounded-[var(--field-radius)] px-3 text-[13px] font-medium text-[var(--ov-ink-3)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                >
                  Clear
                </button>
              )}

              {/* Right-aligned group: Print */}
              {false && (
                <div className="ml-auto flex gap-3">
                  <button
                    onClick={handlePrint}
                    className="h-[46px] px-6 rounded-md bg-[var(--ov-fill-subtle)] hover:bg-[var(--ov-fill-hover)] text-[var(--ov-ink)] font-medium transition-colors whitespace-nowrap mt-[26px]"
                  >
                    Print
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8 text-[var(--ov-ink)] mb-6">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-[color:var(--ov-ember)]"></div>
            <p className="mt-2">Loading M2O data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-[var(--ov-danger-wash)] border border-[color:var(--ov-danger)] text-[var(--ov-danger)] px-4 py-3 rounded-lg mb-6">
            Failed to load M2O data. Please try again.
          </div>
        )}

        {/* Table Section */}
        {!isLoading && (
          <GradientContainer>
            <div className="rounded-2xl overflow-hidden">
              {showAdminView && selectedChapterObj?.regionName && (
                <p className="px-4 pt-4 text-[12.5px] text-[var(--ov-ink-4)]">
                  {selectedChapterObj?.name || "All chapters"} ·{" "}
                  <span className="text-[var(--ov-ink-3)]">{selectedChapterObj.regionName}</span>
                </p>
              )}

            {/* Data Table */}
            <div onClick={(e) => e.stopPropagation()}>
              <DataTable
                columns={columns}
                data={m2oData}
                searchValues={columnSearches}
                onSearchChange={handleColumnSearchChange}
                onRowClick={handleRowClick}
                renderCell={renderCell}
                fitContent
                className="w-full cursor-pointer"
                total={total}
                page={page}
                pageSize={entriesPerPage}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </div>
        </GradientContainer>
      )}

      {/* Pagination handled by DataTable */}
      {/* Print spacer for fixed footer */}
      <div className="print:block hidden h-[44px]"></div>
    </main>
  </div>
  );
}
