import React, { useState, useEffect } from "react";
import { useAppSelector } from "../../app/store";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { ReportStatCard, ReportInfoBar } from "../../components/reports";
import FilterSection from "../../components/common/FilterSection";
import { toStartOfDayISO, toEndOfDayISO, getFirstDayOfMonth, getLastDayOfMonth } from "../../utils/date";
import DataTable from "../../components/common/DataTable";
import GradientContainer from "../../components/common/GradientContainer";
import type { TableColumn } from "../../components/common/DataTable";
import { useLazyGetReceivedOpportunitiesReportQuery } from "../../services/dashboardApi";
import { useGetChapterMembersListQuery } from "../../services/ed/edChaptersApi";

interface OpportunityRecord {
  id: number;
  meetingDate: string;
  name: string;
  phone: string;
  email: string;
  lastUpdated: string;
  status: string;
  businessClosed: number;
  comments: string;
}

// Table columns configuration
const columns: TableColumn[] = [
  { key: "meetingDate", label: "BOR Date",sublabel:"Business Opportunity Received", sortable: true, searchable: false },
  { key: "name", label: "From Name", sortable: true, searchable: false },
  { key: "phone", label: "Phone", sortable: true, searchable: false },
  { key: "email", label: "Email", sortable: true, searchable: false },
  { key: "ref name", label: "Referred to name", sortable: true, searchable: false },
  { key: "lastUpdated", label: "Last Updated", sortable: true, searchable: false },
  { key: "status", label: "Status", sortable: true, searchable: false },
  { key: "businessClosed", label: "Business Closed", sortable: true, searchable: false },
  { key: "comments", label: "Looking For", sortable: true, searchable: false },
];

// API-driven data will be mapped below

export default function ReceivedBusinessOpportunityReportPage() {
  const navigate = useNavigate();
  const authUser = useAppSelector((s) => s.auth.user);
  const displayMember = authUser?.name || "";
  const chapterName = (authUser as any)?.basicInfo?.chapterName || "";
  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState<string>(getLastDayOfMonth());
  const [appliedStartDate, setAppliedStartDate] = useState<string>(getFirstDayOfMonth());
  const [appliedEndDate, setAppliedEndDate] = useState<string>(getLastDayOfMonth());
  const [memberId, setMemberId] = useState<string>("");
  const [memberOptions, setMemberOptions] = useState<{ label: string; value: string }[]>([{ label: "All Members", value: "" }]);
  const [selectedMemberName, setSelectedMemberName] = useState<string>("");
  const [appliedMemberName, setAppliedMemberName] = useState<string>("All Members");
  const [columnSearches] = useState<{ [key: string]: string }>({});
  
  // State for search term with debounce
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Check authentication
  const isLoggedIn = localStorage.getItem("isLoggedIn");

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const handleSearch = () => {
    triggerReport({ from: fromISO, to: toISO, memberId: memberId || undefined } as any);
    setAppliedMemberName(selectedMemberName || "All Members");
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleColumnSearchChange = () => {
    // Not needed for this report
  };

  // Build ISO params (start/end of day) and load report
  const fromISO = React.useMemo(() => toStartOfDayISO(startDate)!, [startDate]);
  const toISO = React.useMemo(() => toEndOfDayISO(endDate)!, [endDate]);

  const [triggerReport, reportState] = useLazyGetReceivedOpportunitiesReportQuery();

  // Debounce search term
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);
  
  // Load members for dropdown using chapter members API with search
  const myChapterId = String((authUser as any)?.basicInfo?.chapter || "");
  const { data: chapterUsersRes } = useGetChapterMembersListQuery(
    { 
      chapterId: myChapterId, 
      limit: 20,
      search: debouncedSearchTerm || ''
    },
    { 
      skip: !myChapterId,
      refetchOnMountOrArgChange: true
    }
  );

  // Process members data - only include names
  React.useEffect(() => {
    const members = (chapterUsersRes as any)?.data?.members || [];
    const opts = [
      { label: "All Members", value: "" },
      ...members.map((member: any) => ({
        label: member.label || member.name || '',
        value: member.value || member._id || member.id || ''
      }))
    ];
    
    setMemberOptions(opts);
  }, [chapterUsersRes]);
  
  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // Initial fetch on mount only; subsequent fetches happen on Search
  React.useEffect(() => {
    triggerReport({ from: fromISO, to: toISO, memberId: memberId || undefined } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: reportRes, isLoading, error } = reportState;

  // Status labels (placed before usage in rows mapping)
  const STATUS_LABELS: Record<string, string> = {
    NOT_CONTACTED: "Not Contacted Yet",
    CONTACTED: "Contacted",
    NO_RESPONSE: "No Response",
    WON: "Got The Business",
    LOST: "Did Not Get The Business",
    NOT_A_GOOD_FIT: "Not a Good Fit",
  };


  const rows: OpportunityRecord[] = React.useMemo(() => {
  const raw: any = reportRes?.data;
  const items: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.rows) ? raw.rows : []);

  const toDMY = (iso: string) => {
    if (!iso) return "";

    const date = new Date(iso);

    if (isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  };

  return items.map((it: any, idx: number) => {
    const meetingISO = it.meetingDate || it.date || "";
    const updatedISO = it.lastUpdated || it.updatedAt || "";

    const rawStatus: string = String(it.status || it.derivedStatus || "").toUpperCase();

    const prettyFallback = rawStatus
      ? rawStatus.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())
      : "";

    return {
      id: it.id ?? it._id ?? idx,
      meetingDate: toDMY(meetingISO),
      name: it.name ?? it.contactName ?? "",
      phone: it.phone ?? it.contactPhone ?? "",
      email: it.email ?? it.contactEmail ?? "",
      lastUpdated: toDMY(updatedISO),
      status: STATUS_LABELS[rawStatus] || prettyFallback,
      businessClosed: Number(it.businessClosedAmount ?? it.businessClosed ?? it.amount ?? 0),
      comments: String(it.comments ?? ""),
    };
  });
}, [reportRes]);

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={displayMember} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", onClick: () => navigate("/dashboard") },
            { label: "BOR Report (Business Opportunity Received Report)" },
          ]}
        />

        {/* Filters */}
        <FilterSection
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onSearch={handleSearch}
          onPrint={handlePrint}
          allowFutureStartDate
          allowFutureEndDate
          showDropdown
          dropdownLabel="Member"
          dropdownOptions={memberOptions}
          dropdownValue={memberId}
          searchable={true}
          searchPlaceholder="Search members..."
          onSearchChange={handleSearchChange}
          disableClientSideFilter={true}
          onDropdownChange={(v) => {
            setMemberId(v);
            const opt = memberOptions.find(o => o.value === v);
            setSelectedMemberName(opt?.label || "");
          }}
          deferApply={false}
          autoSearchOnInit={false}
        />

        {/* Stats Cards - compact grid; driven by API if available */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <ReportStatCard
            title={`Total Opportunities`}
            value={`${(reportRes?.data?.cards?.total ?? rows.length).toLocaleString()}`}
          />
          <ReportStatCard
            title={`Business Closed`}
            value={`${(reportRes?.data?.cards?.businessClosed ?? rows.reduce((sum, row) => sum + (Number(row.businessClosed) || 0), 0)).toLocaleString()}`}
          />
        </div>

        {/* Table Section with Gradient */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            <ReportInfoBar
            chapter={chapterName || ""}
            member={appliedMemberName}
            fromDate={appliedStartDate.split("-").reverse().join("-")}
toDate={appliedEndDate.split("-").reverse().join("-")}
          />

            {isLoading ? (
              <div className="p-4 text-gray-300">Loading…</div>
            ) : error ? (
              <div className="p-4 text-red-400">Failed to load report</div>
            ) : (
              <DataTable
                columns={columns}
                data={rows}
                searchValues={columnSearches}
                onSearchChange={handleColumnSearchChange}
                renderCell={(column: TableColumn, row: any) => {
                  if (column.key === "businessClosed") {
                    const n = Number(row.businessClosed ?? 0);
                    return <span className="block text-right">{Number.isFinite(n) ? n.toLocaleString() : String(row.businessClosed ?? "")}</span>;
                  }
                  return null;
                }}
              />
            )}
          </div>
        </GradientContainer>
      </main>
    </div>
  );
}
