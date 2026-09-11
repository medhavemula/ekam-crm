import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { ReportInfoBar } from "../../components/reports";
import FilterSection from "../../components/common/FilterSection";
import DataTable from "../../components/common/DataTable";
import GradientContainer from "../../components/common/GradientContainer";
import type { TableColumn } from "../../components/common/DataTable";
import { useGetEdSponsorsReportQuery } from "../../services/ed";
import { useAppSelector } from "../../app/store";
import { useGetEdRegionalBoardQuery } from "../../services/ed/edRegionalApi";
import { useRole } from "../../hooks/useRole";
import { getFirstDayOfMonth, getLastDayOfMonth } from "../../utils/date";

interface SponsorRecord {
  id: number;
  sponsorId?: string;
  sponsorName: string;
  noOfSponsored: number;
  sponsoredName: string;
  sponsoredRegion: string;
  sponsoredChapter: string;
  applicationDate: string;
}

// Table columns configuration (UI)
// Removed "No of Sponsored" as per latest requirement
const columns: TableColumn[] = [
  { key: "sponsoredName", label: "Member", sortable: true, searchable: false },
  { key: "sponsorName", label: "Inducted By", sortable: true, searchable: false },
  { key: "sponsoredChapter", label: "Chapter", sortable: true, searchable: false },
  { key: "sponsoredRegion", label: "Region", sortable: true, searchable: false },
  { key: "applicationDate", label: "Application Date", sortable: true, searchable: false },
];

export default function AdminInductedByReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAppSelector((s) => s.auth.user);
  const { role: userRole } = useRole();

  // Check if user is a director role (admin view)
  const isAdminRole = ["EXECUTIVE_DIRECTOR","ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"].includes(
    userRole || "",
  );

  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());
  const [appliedStartDate, setAppliedStartDate] = useState(getFirstDayOfMonth());
  const [appliedEndDate, setAppliedEndDate] = useState(getLastDayOfMonth());
  const [selectedChapter, setSelectedChapter] = useState<string>(() => {
    const st: any = location.state;
    const fromNav = st?.chapterId ? String(st.chapterId) : "";
    if (fromNav) return fromNav;
    const init = (authUser as any)?.basicInfo?.chapter || "";
    return String(init || "all"); // Default to user's chapter or "All Chapters"
  });
  const [appliedChapter, setAppliedChapter] = useState<string>(() => {
    const st: any = location.state;
    const fromNav = st?.chapterId ? String(st.chapterId) : "";
    if (fromNav) return fromNav;
    const init = (authUser as any)?.basicInfo?.chapter || "";
    return String(init || "all"); // Default to user's chapter or "All Chapters"
  });
  const [columnSearches] = useState<{ [key: string]: string }>({});
  const myRegionId = (authUser as any)?.basicInfo?.region || "";
  
  const entriesPerPage = 10;
  const [page, setPage] = useState(1);
  const displayMember = authUser?.name || "";

  // Load chapters for admin chapter dropdown from ED Regional Board API
  const { data: edRegionalBoardRes } = useGetEdRegionalBoardQuery({ page: 1, limit: 100 });
  const chapterOptions = React.useMemo(() => {
    const base = [{ label: "All Chapters", value: "all" }];
    const items = (edRegionalBoardRes as any)?.data?.items || [];
    for (const c of items) base.push({ label: c.name, value: String(c.id) });
    return base;
  }, [edRegionalBoardRes]);
  const selectedChapterLabel = React.useMemo(() => {
    if (appliedChapter === "all") return "All Chapters";
    const opt = chapterOptions.find((o) => o.value === appliedChapter);
    return opt?.label || "All Chapters";
  }, [chapterOptions, appliedChapter]);

  // ED services (admin only)
  const edParams = React.useMemo(() => 
    isAdminRole
      ? {
          regionId: myRegionId || undefined,
          ...(appliedChapter && appliedChapter !== "all" ? { chapterId: appliedChapter } : {}),
          from: startDate ? `${startDate}T00:00:00` : undefined,
          to: endDate ? `${endDate}T23:59:59` : undefined,
          page: page as number,
          pageSize: entriesPerPage as number,
        }
      : undefined,
    [isAdminRole, appliedChapter, myRegionId, startDate, endDate, page, entriesPerPage]
  );
  const {
    data: edData,
    isLoading: edLoading,
  } = useGetEdSponsorsReportQuery(edParams as any, {
    skip: !isAdminRole,
  });

  // If navigated from ChapterDetailsPage with chapterId in state, preselect it (admin view)
  React.useEffect(() => {
    const st: any = location.state;
    if (st && st.chapterId) {
      setSelectedChapter(String(st.chapterId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format date to DD-MM-YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateString; // Return original if error
    }
  };

  // Admin view computed rows and options (hoisted to top-level to avoid conditional hooks)
  const adminRows: SponsorRecord[] = React.useMemo(
    () => {
      // Handle different response structures without short-circuiting on []
      let itemsRaw: any = undefined;
      if (Array.isArray((edData as any)?.items)) itemsRaw = (edData as any).items;
      else if (Array.isArray((edData as any)?.data?.items)) itemsRaw = (edData as any).data.items;
      else if (Array.isArray((edData as any)?.data)) itemsRaw = (edData as any).data;
      else if (Array.isArray(edData as any)) itemsRaw = edData as any;
      const items: any[] = Array.isArray(itemsRaw) ? itemsRaw : [];
      return items.map((it: any, idx: number) => ({
        id: it.id ?? idx,
        sponsorId: String(it.sponsorId ?? it.sponsor?.id ?? it.id ?? ""),
        sponsorName: (() => {
          const n = String(it.sponsorName ?? it.sponsor?.name ?? it.name ?? "").trim();
          return n || "Self";
        })(),
        noOfSponsored: Number(it.noOfSponsored ?? it.count ?? it.sponsoredCount ?? 0),
        sponsoredName: String(it.sponsoredName ?? it.sponsored?.name ?? it.sponsoredMember ?? ""),
        sponsoredRegion: String(it.sponsoredRegion ?? it.region ?? it.regionName ?? ""),
        sponsoredChapter: String(it.sponsoredChapter ?? it.chapter ?? it.chapterName ?? ""),
        applicationDate: formatDate(it.applicationDate ?? it.appliedAt ?? it.date ?? it.createdAt ?? ""),
      }));
    },
    [edData],
  );
  const adminTotal = React.useMemo(
    () => Number((edData as any)?.total ?? (edData as any)?.count ?? adminRows.length),
    [edData, adminRows.length],
  );

  // Check authentication
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const handleSearch = () => {
    // Apply the selected chapter when search is clicked
    setAppliedChapter(selectedChapter);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setPage(1);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleColumnSearchChange = () => {
    // Not needed for this report
  };

  const routeState = location.state as { chapterId?: string } | null;
  const chapterDetailsPath = routeState?.chapterId
    ? `/admin/regional-board/chapter/${routeState.chapterId}`
    : null;
  const breadcrumbs = chapterDetailsPath
    ? [
        { label: "Regional Board", onClick: () => navigate(chapterDetailsPath) },
        { label: `Chapter Details - ${selectedChapterLabel || "Chapter"}` },
        { label: "Inducted By Report" },
      ]
    : [{ label: "Inducted By Report" }];

  // Render Admin View (for Executive Director, Regional Director, Assistant Regional Director)
  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={displayMember} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader breadcrumbs={breadcrumbs} />
        {/* Admin Filters */}
        <FilterSection
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          deferApply={true}
          showDropdown={true}
          dropdownLabel="Chapter"
          dropdownOptions={chapterOptions}
          dropdownValue={selectedChapter}
          onDropdownChange={(v) => setSelectedChapter(v)}
          onSearch={handleSearch}
          onPrint={handlePrint}
          allowFutureStartDate
          allowFutureEndDate
          skipAutoInit
        />

        {/* Loading State */}
        {edLoading && (
          <div className="text-center py-8 text-white">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2">Loading sponsor data...</p>
          </div>
        )}

        {/* Admin Table Section with Gradient */}
        {!edLoading && (
          <GradientContainer>
            <div className="rounded-2xl overflow-hidden">
              <ReportInfoBar
                chapter={selectedChapterLabel}
                member=""
                fromDate={appliedStartDate}
                toDate={appliedEndDate}
              />

              <DataTable
                columns={columns}
                data={adminRows}
                searchValues={columnSearches}
                onSearchChange={handleColumnSearchChange}
                total={adminTotal}
                page={page}
                pageSize={entriesPerPage}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </GradientContainer>
        )}
      </main>
    </div>
  );
}
