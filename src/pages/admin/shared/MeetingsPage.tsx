import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useNavigate } from "react-router-dom";
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
import { useGetEdMeetingsQuery, useGetEdChaptersQuery } from "../../../services/ed";
import calendarIcon from "../../../assets/icons/calendar.svg";
import PrintHeader from "../../../components/print/PrintHeader";
import PrintFooter from "../../../components/print/PrintFooter";

// Table columns configuration
const columns: TableColumn[] = [
  { key: "meetingDate", label: "Meeting Date", sortable: true, searchable: false },
  { key: "type", label: "Meeting Type", sortable: true, searchable: true },
  { key: "totalMembers", label: "Total Members", sortable: true, searchable: true },
  // API provides attendanceCount; map from legacy noOfAttendees label
  { key: "attendanceCount", label: "No of Attendees", sortable: true, searchable: true },
  { key: "noOfVisitors", label: "No of Visitors", sortable: true, searchable: true },
  { key: "businessClosed", label: "Business Closed", sortable: true, searchable: true },
  { key: "p2p", label: "P2P", sortable: true, searchable: true },
  { key: "status", label: "Status", sortable: true, searchable: true },
];

export default function MeetingsPage() {
  const navigate = useNavigate();
  const [userName] = useState("Mike");
  const userRole = useSelector((state: RootState) => state.auth.role);

  // Check if user is a director role (admin view)
  const showAdminView = ["EXECUTIVE_DIRECTOR","ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"].includes(
    userRole || "",
  );

  // Default to current month (start to last day)
  const firstDayOfMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  };
  const lastDayOfMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const last = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  };

  // Pending (UI) filters
  const [pendingStartDate, setPendingStartDate] = useState("");
  const [pendingEndDate, setPendingEndDate] = useState("");
  const [pendingChapter, setPendingChapter] = useState("ALL_CHAPTERS");
  // Applied filters - use YYYY-MM-DD format for date inputs
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(lastDayOfMonth());
  const [selectedChapter, setSelectedChapter] = useState("ALL_CHAPTERS");
  const [page, setPage] = useState(1);
  const [entriesPerPage] = useState(10);

  // Column search states
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});

  // API Integration
  // Use selected chapter id directly from ED chapters list
  const chapterParam = selectedChapter && selectedChapter !== "ALL_CHAPTERS" ? selectedChapter : undefined;

  // Load chapters for Chapter filter using ED chapters list API with name sorting
  const { data: chaptersRes } = useGetEdChaptersQuery({
    page: 1,
    limit: 50,
  });
  
  const chapterOptions = (
    [{ value: "ALL_CHAPTERS", label: "All Chapters" }] as Array<{ value: string; label: string }>
  ).concat(
    ((chaptersRes as any)?.data?.items ?? []).map((c: any) => ({ value: c.id, label: c.name })) as Array<{
      value: string;
      label: string;
    }>,
  );

  // Set default chapter when API returns data
  useEffect(() => {
    // Default remains All Chapters; no auto-select of first chapter
  }, [chaptersRes]);

  // Derive regionId from chapters list for scope compliance
  const chapterItems: any[] = ((chaptersRes as any)?.data?.items || []) as any[];
  const selectedChapterObj = chapterParam
    ? chapterItems.find((c: any) => String(c.id) === String(chapterParam))
    : undefined;
  const uniqueRegions: string[] = Array.from(new Set(chapterItems.map((c: any) => String(c.regionId)).filter(Boolean)));
  const regionIdToSend: string | undefined = selectedChapterObj?.regionId || uniqueRegions[0];
  const allowedChapterIds = new Set(chapterItems.map((c: any) => String(c.id)));
  const safeChapterId = chapterParam && allowedChapterIds.has(String(chapterParam)) ? chapterParam : undefined;
  const ready = !!regionIdToSend || !!safeChapterId;

  const { data, isLoading, error, refetch } = useGetEdMeetingsQuery(
    showAdminView && ready
      ? {
          chapterId: safeChapterId,
          regionId: regionIdToSend,
          from: startDate ? `${startDate}T00:00:00` : undefined,
          to: endDate ? `${endDate}T23:59:59` : undefined,
          page,
          limit: entriesPerPage,
        }
      : undefined,
    { skip: !showAdminView || !ready },
  );

  // Removed unused exportMeetings

  // Normalize API data shape
  // Supports both wrapped: { success, data: { items, total } }
  // and top-level: { success, items, total }
  const payload: any = data as any;
  try { console.debug("ED Meetings payload", payload); } catch {}
  const rawItemsCandidate =
    (Array.isArray(payload) ? payload : undefined) ??
    (Array.isArray(payload?.data) ? payload?.data : undefined) ??
    payload?.data?.items ??
    payload?.data?.rows ??
    payload?.items ??
    payload?.rows ??
    [];
  const meetings = Array.isArray(rawItemsCandidate) ? rawItemsCandidate : [];
  const total = payload?.data?.total ?? payload?.total ?? meetings.length;

  const handleSearch = () => {
    // Apply pending to applied, then refetch
    if (pendingStartDate) setStartDate(pendingStartDate);
    if (pendingEndDate) setEndDate(pendingEndDate);
    if (pendingChapter !== "") setSelectedChapter(pendingChapter);
    setPage(1);
    refetch();
  };

  // Removed unused handleExport function

  const handleColumnSearchChange = (key: string, value: string) => {
    setColumnSearches({ ...columnSearches, [key]: value });
  };

  const handleRowClick = (row: any) => {
    if (row.id) {
      navigate(`/admin/meetings/${row.id}`);
    }
  };

  const breadcrumbs = [{ label: "Business", onClick: () => navigate("/dashboard") }, { label: "Meetings" }];

  // Format date from YYYY-MM-DD to DD/MM/YYYY for display
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

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

        <div className="mb-6">
          <div className="mb-2">
            <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
              <Calendar className="h-3.5 w-3.5" />
              <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                Chapter Meetings
              </span>
            </div>
          </div>
          <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
            Meetings
          </h1>
          <p className="mt-2 text-[12px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
            Track chapter meetings, attendance cadence, and business generated.
          </p>
        </div>

        {/* Admin View: Show filters with chapter dropdown */}
        {showAdminView && (
          <div className="mb-6">
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
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8 text-[var(--ov-ink)] mb-6">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2">Loading meetings...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-[var(--ov-danger-wash)] border border-[color:var(--ov-danger)] text-[var(--ov-danger)] px-4 py-3 rounded-lg mb-6">
            Failed to load meetings. Please try again.
          </div>
        )}

        {/* Table Section */
        }
        {!isLoading && (
          <GradientContainer>
            <div className="rounded-2xl overflow-hidden">
              {/* Admin View: Show ReportInfoBar */}
              {showAdminView && (
                <ReportInfoBar
                  chapter={selectedChapter === "ALL_CHAPTERS" ? "All Chapters" : (chapterOptions.find((o) => o.value === (selectedChapter || ""))?.label || "")}
                  member=""
                  region={selectedChapterObj?.regionName || ""}
                  fromDate={formatDateForDisplay(startDate)}
                  toDate={formatDateForDisplay(endDate)}
                />
              )}

              {/* Data Table */}
              <DataTable
                columns={columns}
                data={meetings}
                searchValues={columnSearches}
                onSearchChange={handleColumnSearchChange}
                onRowClick={handleRowClick}
                className="w-full cursor-pointer"
                showSearchRow={false}
                headerTextClassName="text-[var(--ov-ink)]"
                total={total}
                page={page}
                pageSize={entriesPerPage}
                onPageChange={(p) => setPage(p)}
                // Render friendly values
                renderCell={(col, row) => {
                  if (col.key === "meetingDate") {
                    const iso = row.meetingDate as string | undefined;
                    if (!iso) return "-";
                    try {
                      const d = new Date(iso);
                      const dd = String(d.getDate()).padStart(2, "0");
                      const mm = String(d.getMonth() + 1).padStart(2, "0");
                      const yyyy = d.getFullYear();
                      return `${dd}/${mm}/${yyyy}`;
                    } catch {
                      return row.meetingDate ?? "-";
                    }
                  }
                  if (col.key === "status") {
                    const status = (row.status ?? "").toString().replace(/_/g, " ");
                    return status || "-";
                  }
                  // Provide fallbacks for legacy labels if backend uses different keys
                  if (col.key === "totalMembers") return row.totalMembers ?? row.membersCount ?? "-";
                  if (col.key === "attendanceCount") return row.attendanceCount ?? row.noOfAttendees ?? "-";
                  if (col.key === "noOfVisitors") return row.noOfVisitors ?? row.visitorsCount ?? "-";
                  if (col.key === "businessClosed") return row.businessClosed ?? row.closedBusiness ?? "-";
                  if (col.key === "p2p") return row.p2p ?? row.p2pCount ?? "-";
                  return null; // default rendering for others
                }}
              />
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
