import React, { useState } from "react";
import { useAppSelector } from "../../app/store";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { ReportInfoBar } from "../../components/reports";
import FilterSection from "../../components/common/FilterSection";
import { toStartOfDayISO, toEndOfDayISO } from "../../utils/date";
import GradientContainer from "../../components/common/GradientContainer";
import DataTable from "../../components/common/DataTable";
import type { TableColumn } from "../../components/common/DataTable";
import { useLazyGetWeeklyReportQuery } from "../../services/dashboardApi";
import { getFirstDayOfWeek, getLastDayOfWeek } from "../../utils/date";
import { ADMIN_THEME } from "../../theme/themeScope";

// Data structures for each section
interface BusinessOpportunityItem {
  referralTo: string;
  referralName: string;
}

interface BusinessClosedItem {
  name: string;
  closedAmount: number;
}

interface P2PItem {
  withName: string;
}

interface VisitorItem {
  details: string;
}

export default function YourWeeklyReportPage() {
  const navigate = useNavigate();
  const authUser = useAppSelector((s) => s.auth.user);
  const displayMember = authUser?.name || "";
  const chapterName = (authUser as any)?.basicInfo?.chapterName || "";
  const [startDate, setStartDate] = useState(getFirstDayOfWeek());
  const [endDate, setEndDate] = useState(getLastDayOfWeek());
  const [appliedStartDate, setAppliedStartDate] = useState(getFirstDayOfWeek());
  const [appliedEndDate, setAppliedEndDate] = useState(getLastDayOfWeek());
  const [searchValues, setSearchValues] = useState<{ [key: string]: string }>({});

  // Check authentication
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const handleSearch = () => {
    trigger({ from: fromISO, to: toISO });
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };


  const handlePrint = () => {
    window.print();
  };

  // Build ISO params (start/end of day)
  const fromISO = React.useMemo(() => toStartOfDayISO(startDate)!, [startDate]);
  const toISO = React.useMemo(() => toEndOfDayISO(endDate)!, [endDate]);

  // Weekly report query (lazy) - no auto-trigger, only manual search
  const [trigger, weeklyState] = useLazyGetWeeklyReportQuery();

  const { data: weeklyRes, isLoading, error } = weeklyState;

  // Auto-trigger search once after component mounts to get initial data
  React.useEffect(() => {
    trigger({ from: fromISO, to: toISO });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - runs only once on mount

  // Persist memberId for other report exports
  React.useEffect(() => {
    const id = (weeklyRes as any)?.data?.member?.id;
    if (id && typeof localStorage !== "undefined") {
      try { localStorage.setItem("reportMemberId", String(id)); } catch {}
    }
  }, [weeklyRes]);

  // Columns for DataTables
  const columnsOpportunity: TableColumn[] = [
    { key: "referralTo", label: "From", sortable: true, searchable: false },
    { key: "referralName", label: "Ref.to", sortable: true, searchable: false },
  ];
  const columnsClosed: TableColumn[] = [
    { key: "name", label: "TQ To", sortable: true, searchable: false },
    { key: "closedAmount", label: "Closed amount", sortable: true, searchable: false },
  ];
  const columnsP2P: TableColumn[] = [
    { key: "withName", label: "With Name", sortable: true, searchable: false },
  ];
  const columnsVisitors: TableColumn[] = [
    { key: "details", label: "Details", sortable: true, searchable: false },
  ];

  const onSearchChange = (key: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [key]: value }));
  };

  const businessOpportunity: BusinessOpportunityItem[] = React.useMemo(() => {
    const items = weeklyRes?.data?.tables?.oppReceived ?? [];
    return (items as any[]).map((it: any) => ({
      referralTo: it.name ?? "",
      referralName: it.contactName ?? "",
    }));
  }, [weeklyRes]);

  const businessClosed: BusinessClosedItem[] = React.useMemo(() => {
    const items = weeklyRes?.data?.tables?.tyfcb ?? [];
    return (items as any[]).map((it: any) => ({
      name: it.tqTo ?? it.name ?? "",
      closedAmount: Number(it.closedAmount ?? 0),
    }));
  }, [weeklyRes]);

  const p2p: P2PItem[] = React.useMemo(() => {
    const items = weeklyRes?.data?.tables?.one2one ?? [];
    return (items as any[]).map((it: any) => ({
      withName: it.withName ?? it.name ?? "",
    }));
  }, [weeklyRes]);

  const visitors: VisitorItem[] = React.useMemo(() => {
    const items = weeklyRes?.data?.tables?.visitors ?? [];
    return (items as any[]).map((it: any) => ({
      details: it.details ?? it.name ?? it.withName ?? "",
    }));
  }, [weeklyRes]);

  // Format date to DD-MM-YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar userName={displayMember} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", onClick: () => navigate("/dashboard") },
            { label: "Your Weekly Report" },
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
          skipAutoInit
          deferApply={false}
        />

        {/* Weekly Summary Section with Gradient */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            <ReportInfoBar
              chapter={chapterName || ""}
              member={weeklyRes?.data?.member?.name || displayMember}
              fromDate={formatDate(appliedStartDate)}
              toDate={formatDate(appliedEndDate)}
            />

            {/* Four Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
              {/* Business Opportunity */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                  <h3 className="text-slate-800 font-semibold text-sm">Business Opportunity Received</h3>
                </div>
                {isLoading ? (
                  <div className="p-4 text-slate-500 text-sm">Loading…</div>
                ) : error ? (
                  <div className="p-4 text-red-500 text-sm">Failed to load</div>
                ) : (
                  <DataTable
                  columns={columnsOpportunity}
                  data={businessOpportunity.map((r, i) => ({ id: i + 1, ...r }))}
                  searchValues={searchValues}
                  onSearchChange={onSearchChange}
                  showSearchRow={false}
                  noOverflow
                  noMinWidth
                />
                )}
              </div>

              {/* Business Closed */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                  <h3 className="text-slate-800 font-semibold text-sm">Business Closed</h3>
                </div>
                {isLoading ? (
                  <div className="p-4 text-slate-500 text-sm">Loading…</div>
                ) : error ? (
                  <div className="p-4 text-red-500 text-sm">Failed to load</div>
                ) : (
                  <DataTable
                  columns={columnsClosed}
                  data={businessClosed.map((r, i) => ({ id: i + 1, ...r }))}
                  searchValues={searchValues}
                  onSearchChange={onSearchChange}
                  showSearchRow={false}
                  noOverflow
                  noMinWidth
                />
                )}
              </div>

              {/* P2P */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                  <h3 className="text-slate-800 font-semibold text-sm">P2P</h3>
                </div>
                {isLoading ? (
                  <div className="p-4 text-slate-500 text-sm">Loading…</div>
                ) : error ? (
                  <div className="p-4 text-red-500 text-sm">Failed to load</div>
                ) : (
                  <DataTable
                  columns={columnsP2P}
                  data={p2p.map((r, i) => ({ id: i + 1, ...r }))}
                  searchValues={searchValues}
                  onSearchChange={onSearchChange}
                  showSearchRow={false}
                  noOverflow
                  noMinWidth
                />
                )}
              </div>

              {/* Visitors */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                  <h3 className="text-slate-800 font-semibold text-sm">Visitors</h3>
                </div>
                {isLoading ? (
                  <div className="p-4 text-slate-500 text-sm">Loading…</div>
                ) : error ? (
                  <div className="p-4 text-red-500 text-sm">Failed to load</div>
                ) : (
                  <DataTable
                  columns={columnsVisitors}
                  data={visitors.map((r, i) => ({ id: i + 1, ...r }))}
                  searchValues={searchValues}
                  onSearchChange={onSearchChange}
                  showSearchRow={false}
                  noOverflow
                  noMinWidth
                />
                )}
              </div>
            </div>
      </div>
    </GradientContainer>
      </main>
    </div>
  );
}
