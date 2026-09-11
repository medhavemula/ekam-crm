import { useState, useEffect } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../../app/store";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import GradientContainer from "../../../components/common/GradientContainer";
import DataTable from "../../../components/common/DataTable";
import type { TableColumn } from "../../../components/common/DataTable";
import { ReportInfoBar } from "../../../components/reports";
import DatePicker from "../../../components/common/DatePicker";
import FormSelect from "../../../components/forms/FormSelect";
import { useGetEdVisitorsQuery, useGetEdChaptersQuery } from "../../../services/ed";
import { useLazyGenerateEdReportQuery } from "../../../services/ed/edReportsApi";
import calendarIcon from "../../../assets/icons/calendar.svg";
import PrintHeader from "../../../components/print/PrintHeader";
import PrintFooter from "../../../components/print/PrintFooter";
import { getBusinessCategoryLabel } from "../../../utils/businessCategories";
import { getFirstDayOfMonth, getLastDayOfMonth } from "../../../utils/date";

// Table columns configuration
const columns: TableColumn[] = [
  { key: "memberName", label: "Member Name", sortable: true, searchable: false },
  // { key: "companyName", label: "Company Name", sortable: true, searchable: false },
  { key: "phone", label: "Phone", sortable: true, searchable: false },
  { key: "email", label: "Email", sortable: true, searchable: false },
  { key: "profession", label: "Profession", sortable: true, searchable: false },
  // { key: "speciality", label: "Speciality", sortable: true, searchable: false },
  { key: "visitDate", label: "Visit Date", sortable: true, searchable: false },
  // { key: "meetingFormat", label: "Meeting Format", sortable: true, searchable: false },
  { key: "invitedBy", label: "Invited By", sortable: true, searchable: false },
  // { key: "description", label: "Description", sortable: true, searchable: false },
  // { key: "type", label: "Type", sortable: true, searchable: false },
];

export default function VisitorsPage() {
  const [userName] = useState("Mike");
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = useSelector((state: RootState) => state.auth.role);

  // Check if user is a director role (admin view)
  const showAdminView = [
    "EXECUTIVE_DIRECTOR",
    "ED_TEAM",
    "REGIONAL_DIRECTOR",
    "ASSISTANT_REGIONAL_DIRECTOR"
  ].includes(userRole || "");
  // Helper function to normalize meeting format
  const normalizeMeetingFormat = (format: string): string => {
    switch (format) {
      case "IN_PERSON":
        return "In Person";
      case "ONLINE":
        return "Online";
      case "HYBRID":
        return "Hybrid";
      case "VIRTUAL":
        return "Virtual";
      default:
        return format || "-";
    }
  };

  // Helper function to format date as DD/MM/YYYYbefore  in YYYY-MM-DD format
  const defaultDates = { 
        fromDate: getFirstDayOfMonth(),
        toDate: getLastDayOfMonth() 
      };

  // Pending (UI) filters
  const [pendingStartDate, setPendingStartDate] = useState<string>("");
  const [pendingEndDate, setPendingEndDate] = useState<string>("");
  const [pendingChapter, setPendingChapter] = useState<string>("ALL_CHAPTERS");
  const [chapterSearchQuery, setChapterSearchQuery] = useState("");
  const [chapterSearchDebounced, setChapterSearchDebounced] = useState("");
  // Applied filters - use YYYY-MM-DD format for date inputs
  const [startDate, setStartDate] = useState(defaultDates.fromDate);
  const [endDate, setEndDate] = useState(defaultDates.toDate);
  const [selectedChapter, setSelectedChapter] = useState("ALL_CHAPTERS");
  const [page, setPage] = useState(1);
  const [entriesPerPage] = useState(10);

  // Column search states
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});

  // If navigated from Chapter Details with a chapterId in state, preselect it
  useEffect(() => {
    const st: any = location.state;
    const ch = st?.chapterId ? String(st.chapterId) : undefined;
    if (ch) {
      setPendingChapter(ch);
      setSelectedChapter(ch);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Print-specific state
  const [printRows, setPrintRows] = useState<any[]>([]);
  const [triggerGenerateReport] = useLazyGenerateEdReportQuery();

  useEffect(() => {
    const timer = setTimeout(() => {
      setChapterSearchDebounced(chapterSearchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [chapterSearchQuery]);

  // ED Chapters list for dropdown
  const { data: chaptersRes } = useGetEdChaptersQuery({
    page: 1,
    limit: 100,
    q: chapterSearchDebounced || undefined,
  });
  const chapterOptions = ([{ value: "ALL_CHAPTERS", label: "All Chapters" }] as Array<{ value: string; label: string }>).concat(
    (((chaptersRes as any)?.data?.items ?? []).map((ch: any) => ({ value: ch.id, label: ch.name })) as Array<{ value: string; label: string }>)
  );

  // Set default chapter when API returns data
  useEffect(() => {
    // Keep default as All Chapters; do not auto-select first chapter
  }, [chaptersRes]);

  // Resolve region similar to M2O page
  const chapterItems: any[] = (((chaptersRes as any)?.data?.items) || []) as any[];
  const selectedChapterObj = (selectedChapter && selectedChapter !== "ALL_CHAPTERS") ? chapterItems.find((c: any) => String(c.id) === String(selectedChapter)) : undefined;
  const uniqueRegions: string[] = Array.from(new Set(chapterItems.map((c: any) => String(c.regionId)).filter(Boolean)));
  const regionIdToSend: string | undefined = selectedChapterObj?.regionId || uniqueRegions[0];
  const allowedChapterIds = new Set(chapterItems.map((c: any) => String(c.id)));
  const safeChapterId = (selectedChapter && selectedChapter !== "ALL_CHAPTERS" && allowedChapterIds.has(String(selectedChapter))) ? selectedChapter : undefined;
  const ready = !!regionIdToSend || !!safeChapterId;

  // Get the first non-empty search value from columnSearches
  const searchValue = Object.values(columnSearches).find(val => val.trim() !== '');

  // API Integration (after region derivation)
  const { data, isLoading, error, refetch } = useGetEdVisitorsQuery(
    showAdminView && ready ? {
      chapterId: safeChapterId,
      regionId: regionIdToSend,
      from: startDate ? `${startDate}T00:00:00` : undefined,
      to: endDate ? `${endDate}T23:59:59` : undefined,
      page,
      limit: entriesPerPage,
      // Use a single search parameter for all columns
      ...(searchValue && { search: searchValue.trim() }),
    } : undefined,
    { skip: !showAdminView || !ready }
  );

  // Use API data only (no hardcoded fallback) and map to table columns
  const resAny = data as any;
  const rawItems = Array.isArray(resAny)
    ? resAny
    : Array.isArray(resAny?.data)
      ? resAny.data
      : Array.isArray(resAny?.data?.items)
        ? resAny.data.items
        : Array.isArray(resAny?.items)
          ? resAny.items
          : Array.isArray(resAny?.results)
            ? resAny.results
            : [];
  const total =
    resAny?.data?.total ??
    resAny?.total ??
    resAny?.data?.count ??
    resAny?.count ??
    rawItems.length;

  const visitors = Array.isArray(rawItems) && rawItems.length > 0 && typeof rawItems[0] === "object"
    ? rawItems.map((v: any) => {
        // Extract ID with better fallback logic
        const id = v.id || v._id || v.visitorId || v.visitId || v.visitorId || String(v.id || v._id || Math.random());
        
        // Debug logging for first few items
        if (rawItems.indexOf(v) < 3) {
          console.log(`Visitor item ${rawItems.indexOf(v)}:`, v);
          console.log(`Extracted ID: ${id}`);
        }
        
        return {
          id: id,
          memberName: v.memberName || v.name || "-",
          companyName: v.companyName || v.company || "-",
          phone: v.phone || v.mobile || "-",
          email: v.email || "-",
          profession: getBusinessCategoryLabel(v.profession || v.designation || ""),
          speciality: v.speciality || v.specialities || "-",
          visitDate: (() => {
            const iso = v.visitDate || v.meetingDate || "";
            if (!iso) return "-";
            const d = new Date(iso);
            if (isNaN(d.getTime())) return "-";
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${day}/${m}/${y}`;
          })(),
          meetingFormat: normalizeMeetingFormat(v.meetingFormat || v.mode || "-"),
          invitedBy: v.invitedBy || v.invitedByName || "-",
          description: v.description || v.notes || "-",
          type: v.type || "-",
          chapter: v.chapter || "-",
          // Store original data for debugging
          _original: v,
        };
      })
    : [];

  // Log the final visitors array
  console.log('Final visitors array:', visitors);
    
  const handleSearch = () => {
    if (pendingStartDate) setStartDate(pendingStartDate);
    if (pendingEndDate) setEndDate(pendingEndDate);
    if (pendingChapter !== "") setSelectedChapter(pendingChapter);
    setPage(1);
    refetch();
  };

  const handlePrint = async () => {
    try {
      // Use same scope as screen: chapterId or regionId
      const params: any = {
        reportType: "VISITORS",
        from: startDate ? `${startDate}T00:00:00` : undefined,
        to: endDate ? `${endDate}T23:59:59` : undefined,
        regionId: regionIdToSend,
        chapterId: safeChapterId,
      };
      const res = await triggerGenerateReport(params).unwrap();
      const items = (res as any)?.data?.data || [];
      // Normalize to table shape used on this page
      const mapped = items.map((v: any) => ({
        memberName: v.memberName || v.name || "-",
        companyName: v.companyName || v.company || "-",
        phone: v.phone || v.mobile || "-",
        email: v.email || "-",
        profession: getBusinessCategoryLabel(v.profession || v.designation || ""),
        speciality: v.speciality || v.specialities || "-",
        visitDate: (() => {
          const iso = v.visitDate || v.meetingDate || "";
          if (!iso) return "-";
          const d = new Date(iso);
          if (isNaN(d.getTime())) return "-";
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${day}/${m}/${y}`;
        })(),
        meetingFormat: normalizeMeetingFormat(v.meetingFormat || v.mode || "-"),
        invitedBy: v.invitedBy || v.invitedByName || "-",
        description: v.description || v.notes || "-",
        type: v.type || "-",
        chapter: v.chapter || "-",
      }));
      setPrintRows(mapped);
      // Allow React to render before printing
      setTimeout(() => window.print(), 0);
    } catch (e) {
      // Fallback to printing existing screen data
      setTimeout(() => window.print(), 0);
    } finally {
    }
  };


  const handleColumnSearchChange = (key: string, value: string) => {
    // Only keep one search at a time by clearing other searches
    setColumnSearches({ [key]: value });
    setPage(1);
  };

  // Format date from YYYY-MM-DD to DD/MM/YYYY for display
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const handleRowClick = (row: any) => {
    console.log('Row clicked:', row);
    console.log('Row ID:', row.id);
    
    if (row.id) {
      navigate(`/admin/visitors/${row.id}/edit`);
    } else {
      console.error('No ID found for visitor row:', row);
      alert('Unable to edit visitor: No valid ID found');
    }
  };

  const routeState = location.state as { chapterId?: string } | null;
  const chapterDetailsPath = routeState?.chapterId
    ? `/admin/regional-board/chapter/${routeState.chapterId}`
    : null;
  const breadcrumbChapterName = selectedChapterObj?.name || "Chapter";
  const breadcrumbs = chapterDetailsPath
    ? [
        { label: "Regional Board", onClick: () => navigate(chapterDetailsPath) },
        { label: `Chapter Details - ${breadcrumbChapterName}` },
        { label: "Visitor Registration Report" },
      ]
    : [{ label: "Visitor Registration Report" }];

  return (
    <div className={`${ADMIN_THEME} min-h-screen`}
      style={{ background: "var(--ov-floor)" }}>
      <div className="print:hidden"><Navbar userName={userName} /></div>

      {/* Global Print Header/Footer (print only) */}
      <PrintHeader userName={userName} />
      <PrintFooter />

      <main className="container mx-auto px-4 py-6">
        {/* Print Header (only visible when printing) */}
        <div className="print:block hidden h-[68px]"></div>
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* Filters Section - Admin View */}
        {showAdminView && (
          <div className="mb-6 print:hidden">
            <div className="flex flex-wrap items-end gap-3">
              {/* Start Date */}
              <div className="flex-none w-full sm:w-auto lg:w-[200px]">
                <label className="block text-xs text-[var(--ov-ink-4)] mb-1.5">Start Date</label>
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
                <label className="block text-xs text-[var(--ov-ink-4)] mb-1.5">End Date</label>
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
                  value={pendingChapter || selectedChapter}
                  onChange={(e) => setPendingChapter(e.target.value)}
                  options={chapterOptions}
                  searchable
                  searchPlaceholder="Search chapters"
                  onSearchChange={setChapterSearchQuery}
                  disableClientSideFilter={true}
                />
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="h-[46px] px-6 rounded-md bg-[var(--ov-ember-fill)] hover:bg-[var(--ov-ember-fill-hover)] text-[var(--ov-on-ember)] font-medium transition-colors whitespace-nowrap mt-[26px] disabled:opacity-50"
              >
                {isLoading ? "Searching..." : "Search"}
              </button>

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
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2">Loading visitors...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-[var(--ov-danger-wash)] border border-[color:var(--ov-danger)] text-[var(--ov-danger)] px-4 py-3 rounded-lg mb-6">
            Failed to load visitors. Please try again.
          </div>
        )}

        {/* Table Section */}
        {!isLoading && (
          <GradientContainer>
            <div className="rounded-2xl overflow-hidden">
              {/* Admin View: Show ReportInfoBar */}
              {showAdminView && (
                <ReportInfoBar
                  chapter={selectedChapter === "ALL_CHAPTERS" ? "All Chapters" : (chapterOptions.find((o) => o.value === selectedChapter)?.label) || ""}
                  member=""
                  region={selectedChapterObj?.regionName || ""}
                  fromDate={formatDateForDisplay(startDate)}
                  toDate={formatDateForDisplay(endDate)}
                />
              )}

              {/* Data Table */}
              <DataTable
                columns={columns}
                data={visitors}
                searchValues={columnSearches}
                onSearchChange={handleColumnSearchChange}
                onRowClick={handleRowClick}
                total={total}
                page={page}
                pageSize={entriesPerPage}
                onPageChange={(p) => setPage(p)}
              />

              {/* Print-only table driven by report API */}
              <div className="hidden print:block">
                <DataTable
                  columns={columns}
                  data={printRows.length ? printRows : visitors}
                  searchValues={{}}
                  onSearchChange={() => {}}
                  total={(printRows.length ? printRows.length : visitors.length) || 0}
                  page={1}
                  pageSize={printRows.length || visitors.length || 1}
                  onPageChange={() => {}}
                />
              </div>
            </div>
          </GradientContainer>
        )}

        {/* Pagination handled by DataTable */}
        <div className="print:block hidden h-[44px]"></div>
      </main>
    </div>
  );
}
