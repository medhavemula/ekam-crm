import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { ReportInfoBar, ReportStatCard } from "../../components/reports";
import FilterSection from "../../components/common/FilterSection";
// Default dates: this month
import DataTable from "../../components/common/DataTable";
import GradientContainer from "../../components/common/GradientContainer";
import type { TableColumn } from "../../components/common/DataTable";
import { useLazyGetM2OReportQuery } from "../../services/dashboardApi";
import { useAppSelector } from "../../app/store";

// Member interface removed as it's not used
// PaginatedResponse type removed as it's not used

interface ManyToOneRecord {
  id: string | number;
  meetingDate: string;
  attendance: string;
  name: string;
  location: string;
  topic: string;
}

// Table columns configuration
const columns: TableColumn[] = [
  { key: "meetingDate", label: "Meeting Date", sortable: true, searchable: false },
  { key: "attendance", label: "Attendance", sortable: true, searchable: false },
  { key: "name", label: "Name", sortable: true, searchable: false },
  { key: "location", label: "Location", sortable: true, searchable: false },
  { key: "topic", label: "Topic", sortable: true, searchable: false },
];

// No dummy data

export default function PersonalManyToOneReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAppSelector((s) => s.auth.user);
  const firstDayOfMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return `${y}-${String(m).padStart(2, "0")}-01`;
  };
  const lastDayOfMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const last = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  };
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(lastDayOfMonth());
  const [appliedStartDate, setAppliedStartDate] = useState(firstDayOfMonth());
  const [appliedEndDate, setAppliedEndDate] = useState(lastDayOfMonth());
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});
  const [rows, setRows] = useState<ManyToOneRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [triggerM2O] = useLazyGetM2OReportQuery();
  const [chapterId, setChapterId] = useState<string>("");
  const chapterName = (authUser as any)?.basicInfo?.chapterName || "";
  const myChapterId = (authUser as any)?.basicInfo?.chapter || "";
  const displayMember = authUser?.name || "";
  const [presentCount, setPresentCount] = useState(0);
  const myMemberId: string | undefined = (() => {
    const id = (authUser as any)?.id || (authUser as any)?.memberId || (authUser as any)?._id || "";
    return id ? String(id) : undefined;
  })();
  const entriesPerPage = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);


  React.useEffect(() => {
    // Prefer chapterId from navigation state when opened from Chapter Details
    const st: any = location.state;
    const fromNav = st?.chapterId ? String(st.chapterId) : "";
    if (fromNav) {
      setChapterId(fromNav);
      return;
    }
    if (!chapterId && myChapterId) setChapterId(String(myChapterId));
  }, [location.state, myChapterId, chapterId]);

  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const toIso = (d: string, isEnd?: boolean) => (isEnd ? `${d}T23:59:59.999Z` : `${d}T00:00:00.000Z`);
  const runSearch = async (overrides?: { from?: string; to?: string; page?: number }) => {
    try {
      setLoading(true);
      setErrMsg(null);
      if (!chapterId && myChapterId) return; // wait until chapter is available
      const fromY = overrides?.from ?? startDate;
      const toY = overrides?.to ?? endDate;
      const pg = overrides?.page ?? page;
      const res = await triggerM2O({
        from: toIso(fromY, false),
        to: toIso(toY, true),
        chapterId: chapterId || undefined,
        targetMemberId: myMemberId,
        page: pg,
        pageSize: entriesPerPage,
      } as any).unwrap();
      const data = Array.isArray((res as any)?.data?.items)
        ? (res as any).data.items
        : [];

      setPresentCount(Number((res as any)?.data?.present ?? 0));

      const mapped: ManyToOneRecord[] = data.map((it: any, idx: number) => ({
        id: it.id ?? idx,
        meetingDate: (() => {
          const raw = it.meetingDate ?? it.date ?? "";
          if (!raw) return "";

          const d = new Date(raw);

          if (isNaN(d.getTime())) return String(raw);

          const y = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, "0");
          const dy = String(d.getDate()).padStart(2, "0");

          return `${dy}-${mo}-${y}`;
        })(),
        attendance: String(it.attendance ?? it.status ?? ""),
        name: String(it.name ?? it.targetMemberName ?? it.createdBy ?? ""),
        location: String(it.place ?? it.location ?? it.venue ?? ""),
        topic: String(it.meetingTopic ?? it.topic ?? it.subject ?? ""),
      }));
      setRows(mapped);
      setTotal(Number((res as any)?.data?.total ?? (res as any)?.total ?? data.length));
    } catch (e: any) {
      setErrMsg(e?.message || "Failed to load report");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setPage(1);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    await runSearch();
  };

  // Auto-load only when chapterId becomes available (initial load). Other filter changes are user-triggered via Search.
  React.useEffect(() => {
    if (!chapterId) return;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  const handlePrint = () => {
    console.log("Printing report");
  };

  const handleColumnSearchChange = (key: string, value: string) => {
    setColumnSearches((prev) => ({ ...prev, [key]: value }));
  };

  const filteredData = rows.filter((record) => {
    const matchesColumnSearch = columns.every((column) => {
      const searchValue = columnSearches[column.key];
      if (!searchValue) return true;
      return String(record[column.key as keyof ManyToOneRecord])
        .toLowerCase()
        .includes(searchValue.toLowerCase());
    });
    return matchesColumnSearch;
  });

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "";

    try {
      const [y, m, d] = dateString.split("-");
      if (y && m && d) {
        return `${d}-${m}-${y}`;
      }

      return new Date(dateString)
        .toLocaleDateString("en-GB")
        .replace(/\//g, "-");
    } catch {
      return dateString;
    }
  };
  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={displayMember} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", onClick: () => navigate("/dashboard") },
            { label: "Personal Many to One Report" },
          ]}
        />
        {/* Filters */}
        <FilterSection
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          deferApply={false}
          onSearch={handleSearch}
          onPrint={handlePrint}
          skipAutoInit
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <ReportStatCard
            title="Total Meetings"
            value={`${total.toLocaleString()}`}
          />
          <ReportStatCard
            title="Present"
            value={presentCount.toLocaleString()}
          />
        </div>

        {/* Table Section */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            <ReportInfoBar
              chapter={chapterName || ""}
              member="All Members"
              fromDate={formatDisplayDate(appliedStartDate)}
              toDate={formatDisplayDate(appliedEndDate)}
            />

            <DataTable
              columns={columns}
              data={filteredData}
              searchValues={columnSearches}
              onSearchChange={handleColumnSearchChange}
              total={total}
              page={page}
              pageSize={entriesPerPage}
              onPageChange={(p) => {
                setPage(p);
                runSearch({ page: p });
              }}
            />
            {loading && <div className="p-4 text-white">Loading…</div>}
            {errMsg && <div className="p-4 text-red-400">{errMsg}</div>}
          </div>
        </GradientContainer>
      </main>
    </div>
  );
}
