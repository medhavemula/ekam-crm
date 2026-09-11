import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import GradientContainer from "../../components/common/GradientContainer";
import FilterSection from "../../components/common/FilterSection";
import DataTable from "../../components/common/DataTable";
import type { TableColumn } from "../../components/common/DataTable";
import { ReportStatCard } from "../../components/reports";
import { useToast } from "../../components/toast/ToastProvider";
import { useUsersMeQuery } from "../../services/authApi";
import { useLazyGetPALMSSummaryReportQuery, useExportPALMSSummaryReportMutation } from "../../services/dashboardApi";
import { getFirstDayOfMonth, getLastDayOfMonth } from "../../utils/date";

interface PALMSSummaryRecord {
  id: string;
  name: string;
  present: number;
  absent: number;
  late: number;
  medical: number;
  substitute: number;
  businessOpportunitiesReceived: number;
  businessOpportunitiesGiven: number;
  p2p: number;
  visitors: number;
  businessClosed: number;
  ceu: number;
  testimonials: number;
}

interface PALMSSummaryMeta {
  chapterName: string;
  region: string;
  totalMeetings: number;
  reportGeneratedAt: string;
  reportGeneratedBy: string;
  from: string;
  to: string;
}

interface PALMSSummaryData {
  meta: PALMSSummaryMeta;
  summary: {
    totalMembers: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalMedical: number;
    totalSubstitute: number;
    totalBusinessOpportunitiesReceived: number;
    totalBusinessOpportunitiesGiven: number;
    totalP2P: number;
    totalVisitors: number;
    totalBusinessClosed: number;
    totalCEU: number;
    totalTestimonials: number;
  };
  members: PALMSSummaryRecord[];
}

// Table columns configuration
const columns: TableColumn[] = [
  { key: "name", label: "Name", sortable: true, searchable: true },
  { key: "present", label: "Present", sortable: true, searchable: false },
  { key: "absent", label: "Absent", sortable: true, searchable: false },
  { key: "late", label: "Late", sortable: true, searchable: false },
  { key: "medical", label: "Medical", sortable: true, searchable: false },
  { key: "substitute", label: "Substitute", sortable: true, searchable: false },
  { key: "businessOpportunitiesReceived", label: "BOR", sortable: true, searchable: false },
  { key: "businessOpportunitiesGiven", label: "BOG", sortable: true, searchable: false },
  { key: "p2p", label: "P2P", sortable: true, searchable: false },
  { key: "visitors", label: "Visitors", sortable: true, searchable: false },
  { key: "businessClosed", label: "Business Closed", sortable: true, searchable: false },
  { key: "testimonials", label: "Testimonials", sortable: true, searchable: false },
];

const defaultSummaryData: PALMSSummaryData = {
  meta: {
    chapterName: "",
    region: "",
    totalMeetings: 0,
    reportGeneratedAt: "",
    reportGeneratedBy: "",
    from: "",
    to: "",
  },
  summary: {
    totalMembers: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    totalMedical: 0,
    totalSubstitute: 0,
    totalBusinessOpportunitiesReceived: 0,
    totalBusinessOpportunitiesGiven: 0,
    totalP2P: 0,
    totalVisitors: 0,
    totalBusinessClosed: 0,
    totalCEU: 0,
    totalTestimonials: 0,
  },
  members: [],
};

export default function PALMSSummaryReportPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [userName, setUserName] = useState("");
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getLastDayOfMonth());
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [isChapterLoaded, setIsChapterLoaded] = useState(false);

  // API hooks
  const { data: userData } = useUsersMeQuery();
  const [getPALMSSummaryReport, { isLoading }] = useLazyGetPALMSSummaryReportQuery();
  const [exportPALMSSummaryReport] = useExportPALMSSummaryReportMutation();

  // Set user name if available
  useEffect(() => {
    if (userData?.data?.name) {
      setUserName(userData.data.name);
    }
  }, [userData]);

  useEffect(() => {
    const myChapterIdFromMe = (userData as any)?.data?.basicInfo?.chapter ? String((userData as any).data.basicInfo.chapter) : null;

    // Only set chapterId if we have a valid value
    if (myChapterIdFromMe && myChapterIdFromMe !== chapterId) {
      setChapterId(myChapterIdFromMe);
      setIsChapterLoaded(true);
    }
  }, [userData, chapterId]);

  const toIso = (d: string, end?: boolean) => `${d}T${end ? "23:59:59.999Z" : "00:00:00.000Z"}`;

  // State for data
  const [summaryData, setSummaryData] = useState<PALMSSummaryData>(defaultSummaryData);

  // Load data when chapter is ready and dates are set
  useEffect(() => {
    // Only load data if chapter is loaded and we have valid dates
    if (isChapterLoaded && chapterId && fromDate && toDate) {
      loadSummaryData();
    }
  }, [isChapterLoaded, fromDate, toDate]); // Depend on chapter loading and date changes

  const loadSummaryData = async () => {
    try {
      if (!fromDate || !toDate) return;
      if (!chapterId) return;

      const result = await getPALMSSummaryReport({
        chapterId,
        from: toIso(fromDate, false),
        to: toIso(toDate, true),
      }).unwrap();

      if (result.success && result.data) {
        const d: any = result.data;
        if (Array.isArray(d?.rows)) {
          const nextMembers: PALMSSummaryRecord[] = d.rows.map((r: any) => ({
            id: String(r?.memberId ?? r?.id ?? ""),
            name: String(r?.memberName ?? r?.name ?? ""),
            present: Number(r?.present ?? 0),
            absent: Number(r?.absent ?? 0),
            late: Number(r?.late ?? 0),
            medical: Number(r?.medical ?? 0),
            substitute: Number(r?.substitute ?? 0),
            businessOpportunitiesReceived: Number(r?.businessOpportunitiesReceived ?? 0),
            businessOpportunitiesGiven: Number(r?.businessOpportunitiesGiven ?? 0),
            p2p: Number(r?.p2p ?? 0),
            visitors: Number(r?.visitors ?? 0),
            businessClosed: Number(r?.businessClosed ?? 0),
            ceu: Number(r?.ceu ?? 0),
            testimonials: Number(r?.testimonials ?? 0),
          }));

          const s: any = d?.summary || {};
          const m: any = d?.meta || {};
          const nextSummary = {
            totalMembers: Number(s?.totalMembers ?? 0),
            totalPresent: Number(s?.totalPresent ?? 0),
            totalAbsent: Number(s?.totalAbsent ?? 0),
            totalLate: Number(s?.totalLate ?? 0),
            totalMedical: Number(s?.totalMedical ?? 0),
            totalSubstitute: Number(s?.totalSubstitute ?? 0),
            totalBusinessOpportunitiesReceived: Number(s?.totalBusinessOpportunitiesReceived ?? 0),
            totalBusinessOpportunitiesGiven: Number(s?.totalBusinessOpportunitiesGiven ?? 0),
            totalP2P: Number(s?.totalP2P ?? 0),
            totalVisitors: Number(s?.totalVisitors ?? 0),
            totalBusinessClosed: Number(s?.totalBusinessClosed ?? 0),
            totalCEU: Number(s?.totalCEU ?? 0),
            totalTestimonials: Number(s?.totalTestimonials ?? 0),
          };
          const nextMeta: PALMSSummaryMeta = {
            chapterName: String(m?.chapterName ?? ""),
            region: String(m?.region ?? ""),
            totalMeetings: Number(m?.totalMeetings ?? 0),
            reportGeneratedAt: String(m?.reportGeneratedAt ?? ""),
            reportGeneratedBy: String(m?.reportGeneratedBy ?? ""),
            from: String(m?.from ?? ""),
            to: String(m?.to ?? ""),
          };

          setSummaryData({ meta: nextMeta, summary: nextSummary, members: nextMembers });
        } else {
          const nextMembers = Array.isArray(d?.members)
            ? d.members
            : Array.isArray(d?.items)
              ? d.items
              : Array.isArray(d?.data)
                ? d.data
                : [];
          const nextSummary = d?.summary && typeof d.summary === "object" ? d.summary : summaryData.summary;
          const nextMeta = d?.meta && typeof d.meta === "object" ? d.meta : summaryData.meta;
          setSummaryData({ meta: nextMeta, summary: nextSummary, members: nextMembers });
        }
      } else {
        showToast({
          title: "Error",
          description: "Failed to load PALMS summary data. Invalid response format.",
          kind: "error",
        });
      }
    } catch (error) {
      console.error("Error loading PALMS summary data:", error);
      console.error("Error details:", {
        error,
        chapterId,
        fromDate,
        toDate,
        isChapterLoaded,
      });

      // Don't show error toast on initial load if it's a network/auth issue
      // Only show if we have valid chapter data
      if (isChapterLoaded && chapterId) {
        showToast({
          title: "Error",
          description: "Failed to load PALMS summary data. Please try again.",
          kind: "error",
        });
      }
    }
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    let filtered = Array.isArray(summaryData.members) ? summaryData.members : [];

    // Apply column searches
    Object.entries(columnSearches).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter((member) => {
          const memberValue = String(member[key as keyof PALMSSummaryRecord]).toLowerCase();
          return memberValue.includes(value.toLowerCase());
        });
      }
    });

    return filtered;
  }, [summaryData.members, columnSearches]);

  // Get current page data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return (Array.isArray(filteredData) ? filteredData : []).slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleSearchChange = (key: string, value: string) => {
    setColumnSearches((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table when changing pages
    const tableElement = document.querySelector(".data-table-container");
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleExport = async () => {
    try {
      if (!fromDate || !toDate) return;
      if (!chapterId) return;
      const blob = await exportPALMSSummaryReport({
        chapterId,
        from: toIso(fromDate, false),
        to: toIso(toDate, true),
      }).unwrap();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `palms-summary-report-${fromDate}-to-${toDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast({
        title: "Export Successful",
        description: "PALMS Summary Report has been downloaded successfully.",
        kind: "success",
      });
    } catch (error) {
      console.error("Error exporting PALMS summary report:", error);
      showToast({
        title: "Export Failed",
        description: "Failed to export PALMS Summary Report. Please try again.",
        kind: "error",
      });
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", onClick: () => navigate("/dashboard") },
    { label: "PALMS Summary Report" },
  ];

  const { meta, summary } = summaryData;

  const statCards = [
    { label: "Total Members", value: summary.totalMembers },
    { label: "Total Meetings", value: meta.totalMeetings },
    { label: "Present", value: summary.totalPresent },
    { label: "Absent", value: summary.totalAbsent },
    { label: "Late", value: summary.totalLate },
    { label: "Medical", value: summary.totalMedical },
    { label: "Substitute", value: summary.totalSubstitute },
    { label: "BOR", value: summary.totalBusinessOpportunitiesReceived },
    { label: "BOG", value: summary.totalBusinessOpportunitiesGiven },
    { label: "P2P", value: summary.totalP2P },
    { label: "Visitors", value: summary.totalVisitors },
    { label: "Business Closed", value: summary.totalBusinessClosed.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }) },
    { label: "Testimonials", value: summary.totalTestimonials },
  ];


  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D85D27]"></div>
          </div>
        )}

        {!isLoading && (
          <>
            {/* Filter Section */}
            <FilterSection
              startDate={fromDate}
              endDate={toDate}
              onStartDateChange={setFromDate}
              onEndDateChange={setToDate}
              onSearch={() => loadSummaryData()}
              onPrint={handleExport}
              showSearchButton={true}
              allowFutureEndDate={false}
              className="pb-2 md:pb-2"
            />


            {/* Summary Stats Bar */}
            <div className="-mt-6 mb-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
              {statCards.map((card) => (
                <div key={card.label} className={card.label === "Business Closed" ? "col-span-2" : ""}>
                  <ReportStatCard title={card.label} value={card.value} />
                </div>
              ))}
            </div>

            {/* Table Section */}
            <GradientContainer>
              <div className="rounded-2xl overflow-hidden">
                {/* Table Header */}
                <div className="p-4 border-b border-gray-700 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-bold text-white">Member PALMS Details</h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
                    {meta.chapterName && (
                      <span>Chapter: <span className="text-white font-medium">{meta.chapterName}</span></span>
                    )}
                    {meta.region && (
                      <span>Region: <span className="text-white font-medium">{meta.region}</span></span>
                    )}
                  </div>
                </div>

                {/* Data Table */}
                <div className="min-w-full">
                  <DataTable
                    columns={columns}
                    data={paginatedData}
                    searchValues={columnSearches}
                    onSearchChange={handleSearchChange}
                    showSearchRow={true}
                    total={filteredData.length}
                    page={currentPage}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    className="palms-summary-table"
                    renderCell={(column, row) => row[column.key]}
                  />
                </div>
              </div>
            </GradientContainer>
            <style>{`
              .palms-summary-table th:first-child,
              .palms-summary-table td:first-child {
                min-width: 220px;
                width: 220px;
              }
            `}</style>
          </>
        )}
      </main>
    </div>
  );
}
