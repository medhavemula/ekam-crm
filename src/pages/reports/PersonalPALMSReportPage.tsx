import React, { useState } from "react";
import { useAppSelector } from "../../app/store";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { ReportStatCard, ReportInfoBar } from "../../components/reports";
import FilterSection from "../../components/common/FilterSection";
import { getFirstDayOfMonth , getLastDayOfMonth } from "../../utils/date";

import DataTable from "../../components/common/DataTable";
import GradientContainer from "../../components/common/GradientContainer";
import type { TableColumn } from "../../components/common/DataTable";
import { useGetPersonalPalmsReportQuery } from "../../services/dashboardApi";

interface PALMSRecord {
  id: number;
  meetingDate: string;
  attendance: string;
  bor: number;
  bog: number;
  visitors: number;
  p2p: number;
  businessClosed: number;
  testimonials: number;
}

// Table columns configuration
const columns: TableColumn[] = [
  { key: "meetingDate", label: "Meeting Date", sortable: true, searchable: false },
  { key: "attendance", label: "Attendance", sortable: true, searchable: false },
  { key: "bog", label: "BOG",sublabel:"Business Opportunity Given", sortable: true, searchable: false },
  { key: "bor", label: "BOR",sublabel:"Business Opportunity Received", sortable: true, searchable: false },
  { key: "visitors", label: "Visitors", sortable: true, searchable: false },
  { key: "p2p", label: "P2P", sortable: true, searchable: false },
  { key: "businessClosed", label: "Business Closed", sortable: true, searchable: false },
  { key: "testimonials", label: "Testimonials", sortable: true, searchable: false },
];

// API-driven data below

export default function PersonalPALMSReportPage() {
  const navigate = useNavigate();
  const authUser = useAppSelector((s) => s.auth.user);
  const displayMember = authUser?.name || "";
  const chapterName = (authUser as any)?.basicInfo?.chapterName || "";
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());
  const [columnSearches] = useState<{ [key: string]: string }>({});

  // Check authentication
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const handleSearch = () => {
    // No-op: FilterSection applies dates to state; RTK Query refetches on args change
  };

  const handlePrint = () => {
    window.print();
  };

  const handleColumnSearchChange = () => {
    // Not needed for this report
  };

  const fromISO = React.useMemo(() => {
    return `${startDate}T00:00:00.000Z`;
  }, [startDate]);

  const toISO = React.useMemo(() => {
    return `${endDate}T23:59:59.999Z`;
  }, [endDate]);

  const { data: reportRes, isLoading, error } = useGetPersonalPalmsReportQuery({ from: fromISO, to: toISO });

  const toDisplayDate = (s: string) => {
    try {
      if (!s) return "";
      const d = new Date(s);
      if (isNaN(d.getTime())) return String(s);
      // Format as DD/MM/YYYY to match expected display
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return String(s || "");
    }
  };

  const palmsRows: PALMSRecord[] = React.useMemo(() => {
    const d: any = reportRes?.data;
    const items: any[] = Array.isArray(d?.rows) ? d.rows : [];
    return items.map((it: any, idx: number) => ({
      id: it.id ?? it._id ?? idx,
      meetingDate: toDisplayDate(it.meetingDate ?? it.date ?? ""),
      attendance: (it.attendance ?? it.attd) || "-",
      bor: Number(it.bor ?? 0),
      bog: Number(it.bog ?? 0),
      visitors: Number(it.noOfVisitors ?? it.visitors ?? 0),
      p2p: Number(it.p2p ?? 0),
      businessClosed: Number(it.businessClosed ?? 0),
      testimonials: Number(it.testimonials ?? 0),
    }));
  }, [reportRes]);

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={displayMember} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", onClick: () => navigate("/dashboard") },
            { label: "Personal PALMS Report" },
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
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <ReportStatCard
            title="Total Meetings"
            value={`${(reportRes?.data?.cards?.totalMeetings ?? 0).toLocaleString()}`}
          />
          <ReportStatCard
            title="Present"
            value={`${(reportRes?.data?.cards?.present ?? 0).toLocaleString()}`}
          />
          <ReportStatCard
            title="No of Visitors"
            value={`${(reportRes?.data?.cards?.noOfVisitors ?? 0).toLocaleString()}`}
          />
          <ReportStatCard
            title="Business Closed"
            value={`${(reportRes?.data?.cards?.businessClosed ?? 0).toLocaleString()}`}
          />
          <ReportStatCard
            title="P2P"
            value={`${(reportRes?.data?.cards?.p2p ?? 0).toLocaleString()}`}
          />
        </div>

        {/* Table Section with Gradient */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            <ReportInfoBar
              chapter={chapterName || ""}
              member={displayMember}
              fromDate={toDisplayDate(startDate)}
              toDate={toDisplayDate(endDate)}
            />
            {isLoading ? (
              <div className="p-4 text-gray-300">Loading…</div>
            ) : error ? (
              <div className="p-4 text-red-400">Failed to load report</div>
            ) : (
              <DataTable
                columns={columns}
                data={palmsRows}
                searchValues={columnSearches}
                onSearchChange={handleColumnSearchChange}
              />
            )}
          </div>
        </GradientContainer>
      </main>
    </div>
  );
}
