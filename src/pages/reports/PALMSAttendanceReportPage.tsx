import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { ReportInfoBar } from "../../components/reports";
import FilterSection from "../../components/common/FilterSection";
import AttendanceDataTable from "../../components/reports/AttendanceDataTable";
import type { AttendanceColumn, AttendanceGroupedHeader } from "../../components/reports/AttendanceDataTable";
import { ADMIN_THEME } from "../../theme/themeScope";

// Helper function to get January 1st of current year in YYYY-MM-DD format
const firstDayOfYear = () => {
  const year = new Date().getFullYear();
  return `${year}-01-01`; // January 1st
};

// Helper function to get December 31st of current year in YYYY-MM-DD format
const lastDayOfYear = () => {
  const year = new Date().getFullYear();
  return `${year}-12-31`; // December 31st
};

// Set default date range to current year
const defaultStartDate = firstDayOfYear();
const defaultEndDate = lastDayOfYear();
import GradientContainer from "../../components/common/GradientContainer";
import { useLazyGetPalmsAttendanceReportQuery } from "../../services/dashboardApi";
import { useAppSelector } from "../../app/store";
import { useGetChapterMembersListQuery } from "../../services/ed/edChaptersApi";

// Dynamic table: first column memberName, then one column per meeting date
interface AttendanceRow {
  memberName: string;
  [dateKey: string]: string;
}

// No dummy data

export default function PALMSAttendanceReportPage() {
  const navigate = useNavigate();
  const authUser = useAppSelector((s) => s.auth.user);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [appliedStartDate, setAppliedStartDate] = useState(defaultStartDate);
  const [appliedEndDate, setAppliedEndDate] = useState(defaultEndDate);
  const [chapterId, setChapterId] = useState("");
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Debounce search term
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const fmtDisplay = (ymd: string) => {
    try {
      const [y, m, d] = ymd.split("-");
      if (y && m && d) return `${d}-${m}-${y}`;
      const dt = new Date(ymd);
      return dt.toLocaleDateString("en-GB").replace(/\//g, "-");
    } catch { return ymd; }
  };
  
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
  
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };
  
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [columns, setColumns] = useState<AttendanceColumn[]>([
    { key: "memberName", label: "Member Name", sortable: true, searchable: true, width: "150px" },
  ]);
  const [grouped, setGrouped] = useState<AttendanceGroupedHeader | undefined>(undefined);
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});
  const [memberOptions, setMemberOptions] = useState<{ label: string; value: string }[]>([{ label: "All Members", value: "" }]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [appliedMemberName, setAppliedMemberName] = useState<string>("All Members");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [triggerPalms] = useLazyGetPalmsAttendanceReportQuery();
  
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
  
  // Derive chapter and member display from store (users/me should load at login)
  const chapterName = (authUser as any)?.basicInfo?.chapterName || "";
  const displayMember = authUser?.name || "";
  const regionName = (authUser as any)?.basicInfo?.regionName || "";
  const countryName = (authUser as any)?.basicInfo?.countryName || "";

  // Initialize chapterId from user profile when available
  React.useEffect(() => {
    // Initialize chapterId from user profile
    if (!chapterId && myChapterId) setChapterId(String(myChapterId));
  }, [myChapterId, chapterId]);

  // Check authentication
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const toIso = (d: any, isEnd?: boolean) => {
    const ymd = (() => {
      if (typeof d === "string") return d;
      try {
        if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        const maybe = new Date(d);
        if (!isNaN(maybe.getTime())) return maybe.toISOString().slice(0, 10);
      } catch {}
      return String(d);
    })();
    return isEnd ? `${ymd}T23:59:59.999Z` : `${ymd}T00:00:00.000Z`;
  };
  const normalizeYmd = (val: any): string => {
    if (typeof val === "string") return val;
    try {
      if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString().slice(0, 10);
      const maybe = new Date(val);
      if (!isNaN(maybe.getTime())) return maybe.toISOString().slice(0, 10);
    } catch {}
    return String(val);
  };
  const runSearch = async (overrides?: { from?: string; to?: string; memberId?: string }) => {
    try {
      setLoading(true);
      setErrMsg(null);
      if (!chapterId) return; // require chapterId
      const fromStr = normalizeYmd(overrides?.from ?? startDate);
      const toStr = normalizeYmd(overrides?.to ?? endDate);
      const memberId = overrides?.memberId ?? selectedMemberId;
      
      const res = await triggerPalms({ 
        chapterId, 
        from: toIso(fromStr, false), 
        to: toIso(toStr, true), 
        memberId: memberId || undefined 
      } as any).unwrap();
      
      // Get unique dates from the API response
      const items: any[] = Array.isArray((res as any)?.data?.rows) ? (res as any).data.rows : [];

      // Get all months in the date range
      const allMonths = new Set<string>();
      const start = new Date(fromStr);
      const end = new Date(toStr);
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      
      while (current <= end) {
        allMonths.add(current.toLocaleString('default', { month: 'short' }));
        current.setMonth(current.getMonth() + 1);
      }

      // Get unique dates from the API response
      const apiDates = new Set<string>();
      items.forEach((row: any) => {
        const cells = Array.isArray(row.cells) ? row.cells : [];
        cells.forEach((cell: any) => {
          const date = String(cell.date || cell.meetingDate || "").split('T')[0];
          if (date) apiDates.add(date);
        });
      });

      // Group dates by month and track which months have data
      const monthsMap = new Map<string, {dates: string[], hasData: boolean}>();
      const monthsWithData = new Set<string>();
      
      // Track which months have data
      Array.from(apiDates).forEach(date => {
        const monthKey = new Date(date).toLocaleString('default', { month: 'short' });
        monthsWithData.add(monthKey);
      });
      
      // Initialize all months with their dates or empty state
      allMonths.forEach(month => {
        monthsMap.set(month, {
          dates: Array.from(apiDates)
            .filter(date => new Date(date).toLocaleString('default', { month: 'short' }) === month)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
          hasData: monthsWithData.has(month)
        });
      });

      // Create month headers and date columns
      const monthHeaders: { label: string; colSpan: number; className?: string }[] = [];
      const dateColumns: AttendanceColumn[] = [];
      
      // Add member name column first
      dateColumns.push({
        key: "memberName",
        label: "Member Name",
        sortable: true,
        searchable: true,
        width: '150px',
        minWidth: '150px',
        maxWidth: '150px',
        headerStyle: {
          position: 'sticky',
          left: 0,
          zIndex: 10,
          backgroundColor: '#f8fafc',
          padding: '0.5rem',
          height: '2.5rem',
          minHeight: '2.5rem'
        },
        cellStyle: {
          position: 'sticky',
          left: 0,
          zIndex: 9,
          backgroundColor: '#ffffff',
          padding: '0.5rem',
          height: '2.5rem',
          minHeight: '2.5rem'
        }
      });
      
      // Process each month
      monthsMap.forEach(({dates, hasData}, month) => {
        if (hasData && dates.length > 0) {
          // For months with data, show date columns
          monthHeaders.push({
            label: month,
            colSpan: dates.length,
            className: 'px-0.5 text-xs'
          });
          
          // Add date columns for this month
          dates.forEach(date => {
            const dateObj = new Date(date);
            dateColumns.push({
              key: date,
              label: dateObj.getDate().toString(),
              sortable: true,
              searchable: false,
              width: '1.5rem',
              minWidth: '1.5rem',
              maxWidth: '1.5rem',
              className: 'p-0 m-0',
              headerClassName: 'p-0 m-0',
              cellClassName: 'p-0 m-0',
              style: {
                padding: '0',
                margin: '0',
                border: 'none',
                height: '2.5rem',
                minHeight: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              },
              headerStyle: {
                padding: '0.125rem',
                margin: '0',
                textAlign: 'center',
                height: '2.5rem',
                minHeight: '2.5rem',
                width: '0.625rem',
                minWidth: '0.625rem',
                maxWidth: '0.625rem'
              },
              render: (_: any, row: any) => {
                const status = row[date];
                const isEmpty = status === undefined || status === null || status === '' || !String(status).trim();
                const finalStatus = isEmpty ? "-" : String(status);
                return (
                  <span className="text-white text-xs">{finalStatus}</span>
                );
              }
            });
          });
        } else {
          // For months with no data, show month in header but no dates in cells
          const monthKey = `no-data-${month}`;
          monthHeaders.push({
            label: month,
            colSpan: 1,
            className: 'px-0.5 text-xs'
          });
          
          dateColumns.push({
            key: monthKey,
            label: '',
            sortable: false,
            searchable: false,
            width: '2.5rem',
            minWidth: '2.5rem',
            maxWidth: '2.5rem',
            className: 'p-0 m-0',
            headerClassName: 'p-0 m-0',
            cellClassName: 'p-0 m-0',
            style: {
              padding: '0',
              margin: '0',
              border: 'none',
              height: '2.5rem',
              minHeight: '2.5rem',
              backgroundColor: 'transparent'
            },
            headerStyle: {
              padding: '0',
              margin: '0',
              textAlign: 'center',
              height: '2.5rem',
              minHeight: '2.5rem',
              width: '2.5rem',
              minWidth: '2.5rem',
              maxWidth: '2.5rem',
              backgroundColor: '#f8fafc',
              position: 'relative'
            },
            render: () => (
              <div 
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  fontSize: '0.75rem',
                  lineHeight: '1rem'
                }}
              >
                -
              </div>
            )
          });
        }
      });

      // Set the grouped headers
      setGrouped({ groups: monthHeaders });
      setColumns(dateColumns);

      // Build rows keyed by member, filling statuses per date
      const mapped: AttendanceRow[] = items.map((row) => {
        const out: AttendanceRow = { 
          memberName: String(row.memberName || row.member?.name || "-") 
        };
        
        // Index statuses by date for quick lookup
        const byDate = new Map<string, string>();
        const cells: any[] = Array.isArray(row.cells) ? row.cells : [];
        
        for (const c of cells) {
          const key = String(c.date || c.meetingDate || "").split('T')[0];
          if (key) {
            const status = String(c.status ?? c.attendance ?? "");
            // Ensure empty/null/undefined status becomes "-"
            byDate.set(key, status && status.trim() ? status : "-");
          }
        }
        
        // Set values for all dates (including those with no data)
        Array.from(apiDates).forEach(date => {
          const status = byDate.get(date);
          // Explicitly set to "-" if status is undefined, null, empty string, or only whitespace
          out[date] = (status === undefined || status === null || status === '' || !status.trim()) ? "-" : status;
        });
        
        // Set values for no-data month columns
        monthsMap.forEach(({hasData}, month) => {
          if (!hasData) {
            const monthKey = `no-data-${month}`;
            out[monthKey] = "-";
          }
        });
        
        return out;
      });
      
      setRows(mapped);
    } catch (e: any) {
      console.error('Error in runSearch:', e);
      setErrMsg(e?.message || "Failed to load attendance report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (fromArg?: string, toArg?: string, ddValue?: string) => {
    if (typeof fromArg === "string") setStartDate(fromArg);
    if (typeof toArg === "string") setEndDate(toArg);
    // Use ddValue if provided by FilterSection, otherwise fall back to current selectedMemberId
    const resolvedMemberId = typeof ddValue === "string" ? ddValue : selectedMemberId;
    await runSearch({ from: fromArg, to: toArg, memberId: resolvedMemberId });
    const label = memberOptions.find(o => o.value === resolvedMemberId)?.label || "All Members";
    setAppliedMemberName(label);
    setAppliedStartDate(typeof fromArg === "string" ? fromArg : startDate);
    setAppliedEndDate(typeof toArg === "string" ? toArg : endDate);
  };

  // Auto-load only when chapterId becomes available (initial load). For other filter changes, user must click Search.
  React.useEffect(() => {
    if (!chapterId) return;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  const handlePrint = () => {
    window.print();
  };
  

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar userName={displayMember} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", onClick: () => navigate("/dashboard") },
            { label: "PALMS Attendance Report" },
          ]}
        />
        {/* Filters */}
        <FilterSection
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onSearch={handleSearch}
          showDropdown={true}
          dropdownLabel="Member"
          dropdownOptions={memberOptions}
          dropdownValue={selectedMemberId}
          onDropdownChange={(v) => {
            setSelectedMemberId(v);
          }}
          searchable={true}
          searchPlaceholder="Search members..."
          onSearchChange={handleSearchChange}
          disableClientSideFilter={true}
          showSearchButton={true}
          onPrint={handlePrint}
          skipAutoInit={true}
          autoSearchOnInit={false}
          deferApply={false}
        />

        {/* Attendance Section with Gradient */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            <ReportInfoBar
              chapter={chapterName || ""}
              member={appliedMemberName}
              region={regionName || ""}
              country={countryName || ""}
              fromDate={fmtDisplay(appliedStartDate)}
              toDate={fmtDisplay(appliedEndDate)}
            />
            {loading && <div className="p-4 text-white">Loading…</div>}
            {errMsg && <div className="p-4 text-red-400">{errMsg}</div>}
            {!loading && (
              <AttendanceDataTable
                columns={columns}
                data={rows.filter(r => {
                  const q = (columnSearches["memberName"] || "").toLowerCase();
                  if (!q) return true;
                  return String(r.memberName || "").toLowerCase().includes(q);
                })}
                searchValues={columnSearches}
                onSearchChange={(key, value) => setColumnSearches(prev => ({ ...prev, [key]: value }))}
                groupedHeaders={grouped}
              />)
            }
          </div>
        </GradientContainer>
      </main>
    </div>
  );
}
