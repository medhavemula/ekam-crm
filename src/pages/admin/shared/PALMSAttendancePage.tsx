import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import FilterSection from "../../../components/common/FilterSection";
import AttendanceDataTable from "../../../components/reports/AttendanceDataTable";
import type { AttendanceColumn, AttendanceGroupedHeader } from "../../../components/reports/AttendanceDataTable";

// Date range generation function removed as it's not currently used

import GradientContainer from "../../../components/common/GradientContainer";
import { AlertTriangle, ClipboardCheck } from "lucide-react";
import { TableSkeleton } from "../../../components/common/Skeletons";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useLazyGetEdAttendanceReportQuery } from "../../../services/ed/edReportsApi";
import { useAppSelector } from "../../../app/store";
import { useGetEdChaptersQuery, useGetEdChapterQuery } from "../../../services/ed/edChaptersApi";

// Dynamic table: first column memberName, then one column per meeting date
interface AttendanceRow {
  memberName: string;
  [dateKey: string]: string;
}

// No dummy data

export default function PALMSAttendanceReportPage() {
  const navigate = useNavigate();
  const authUser = useAppSelector((s) => s.auth.user);
  // Get chapterId from URL params if available
  const { chapterId: urlChapterId } = useParams<{ chapterId?: string }>();
  
  // Set default date range to current year (Jan 1 to Dec 31)
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [appliedChapterInfo, setAppliedChapterInfo] = useState<{ name: string; region: string }>({ name: "", region: "" });
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [pendingChapterId, setPendingChapterId] = useState("");
  const [chapterSearchQuery, setChapterSearchQuery] = useState("");
  const [debouncedChapterSearchQuery, setDebouncedChapterSearchQuery] = useState("");
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [columns, setColumns] = useState<AttendanceColumn[]>([
    { key: "memberName", label: "Member Name", sortable: true, searchable: true, width: "150px" },
  ]);
  const [grouped, setGrouped] = useState<AttendanceGroupedHeader | undefined>(undefined);
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [triggerPalms] = useLazyGetEdAttendanceReportQuery();
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedChapterSearchQuery(chapterSearchQuery.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [chapterSearchQuery]);

  // Fetch all chapters for the dropdown
  const { data: chaptersRes } = useGetEdChaptersQuery({
    page: 1,
    limit: 100,
    sort: "name",
    order: "asc",
    ...(debouncedChapterSearchQuery ? { q: debouncedChapterSearchQuery } : {}),
  });
  
  // Prepare chapter options for dropdown
  const chapterOptions = React.useMemo(() => {
    const items = chaptersRes?.data?.items || [];
    const options = [
      { label: "All Chapters", value: "" },
      ...items.map(chapter => ({
        label: chapter.name,
        value: chapter.id
      }))
    ];
    
    return options;
  }, [chaptersRes, urlChapterId]);

  // If urlChapterId is present and not in list yet, fetch its name to avoid showing raw ID
  const shouldFetchSingle = Boolean(urlChapterId && !(chaptersRes?.data?.items || []).some((c: any) => c.id === urlChapterId));
  const { data: singleChapterRes } = useGetEdChapterQuery(urlChapterId || "", { skip: !shouldFetchSingle });
  
  // Get the selected chapter info for display
  const selectedChapterInfo = React.useMemo(() => {
    if (!selectedChapterId) return { name: "All Chapters", region: "" };
    const list = chaptersRes?.data?.items || [];
    let chapter = list.find((c: any) => c.id === selectedChapterId);
    if (!chapter && singleChapterRes?.data) chapter = singleChapterRes.data as any;
    return {
      name: chapter?.name || "",
      region: chapter?.regionName || ""
    };
  }, [selectedChapterId, chaptersRes, singleChapterRes]);
  // Get user info for display
  const chapterName = (authUser as any)?.basicInfo?.chapterAnswer || "";
  const displayMember = authUser?.name || "";
  const regionName = (authUser as any)?.basicInfo?.regionAnswer || "";

  // Initialize chapterId from URL or user profile
  useEffect(() => {
    if (urlChapterId) {
      setSelectedChapterId(urlChapterId);
      setPendingChapterId(urlChapterId);
    } else {
      const myChapterId = (authUser as any)?.basicInfo?.chapter || "";
      if (myChapterId) {
        const nextChapterId = String(myChapterId);
        setSelectedChapterId(nextChapterId);
        setPendingChapterId(nextChapterId);
      }
    }
  }, [authUser, urlChapterId]);

  // Check authentication
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const runSearch = async (overrides?: { from?: string; to?: string; chapterId?: string }) => {
    // Update state if overrides are provided
    if (overrides?.from) setStartDate(overrides.from);
    if (overrides?.to) setEndDate(overrides.to);
    if (overrides?.chapterId) setSelectedChapterId(overrides.chapterId);
    try {
      setLoading(true);
      setErrMsg(null);
      
      // Normalize dates
// Normalized dates not currently used
      // const normalizedStart = normalizeYmd(overrides?.from ?? startDate);
      // const normalizedEnd = normalizeYmd(overrides?.to ?? endDate);
      const params = {
        chapter_id: selectedChapterId,
        from: startDate ? `${startDate}T00:00:00` : undefined,
        to: endDate ? `${endDate}T23:59:59` : undefined,
      };

      const res = await triggerPalms(params).unwrap();
      
      if (res.success && res.data) {
        // Generate all dates in the range
        // Generate all dates in range (commented out as it's not currently used)
        // const allDates = generateAllDatesInRange(normalizedStart, normalizedEnd);
        
        // Get all months in the date range
        const allMonths = new Set<string>();
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        
        while (current <= end) {
          allMonths.add(current.toLocaleString('default', { month: 'short' }));
          current.setMonth(current.getMonth() + 1);
        }

        // Get unique dates from the API response
        const apiDates = new Set<string>();
        (res.data as any).rows.forEach((row: any) => {
          row.cells.forEach((cell: any) => {
            const date = cell.date.split('T')[0];
            apiDates.add(date);
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

        // Create month headers
        const monthHeaders: { label: string; colSpan: number; className?: string }[] = [];
        const dateColumns: AttendanceColumn[] = [];
        
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
                width: '1rem',
                minWidth: '1rem',
                maxWidth: '1rem',
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
                  padding: '0.25rem',
                  margin: '0',
                  textAlign: 'center',
                  height: '2.5rem',
                  minHeight: '2.5rem',
                  width: '1rem',
                  minWidth: '1rem',
                  maxWidth: '1rem'
                },
                render: (_: any, row: any) => {
                  const status = row[date] || "-";
                  return <span className="text-[var(--table-ink)] text-xs">{status}</span>;
                }
              });
            });
          } else {
            // For months with no data, show month in header but no dates in cells
            const monthKey = `no-data-${month}`;
            monthHeaders.push({
              label: month,  // Keep month name in header
              colSpan: 1
            });
            
            dateColumns.push({
              key: monthKey,
              label: '',  // No date label
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
                height: '2.5rem',
                minHeight: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              },
              headerStyle: {
                padding: '0',
                margin: '0',
                height: '2.5rem',
                minHeight: '2.5rem',
                width: '2.5rem',
                minWidth: '2.5rem',
                maxWidth: '2.5rem',
                textAlign: 'center',
                verticalAlign: 'middle',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transform: 'rotate(-90deg)',
                transformOrigin: 'center',
                writingMode: 'vertical-rl',
                lineHeight: '2.5rem'
              },
              render: () => (
                <div 
                  className="text-[var(--ov-ink-4)] text-xs flex items-center justify-center w-full h-full"
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '0',
                    margin: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderLeft: "1px solid var(--table-rule)",
                    borderRight: "1px solid var(--table-rule)",
                    backgroundColor: 'transparent'
                  }}
                >
                  {/* Empty cell for months with no data */}
                </div>
              )
            });
          }
        });

        // Set the columns and rows with grid layout
        setColumns([
          {
            key: 'memberName',
            label: 'Member Name',
            sortable: true,
            searchable: true,
            width: '150px',
            minWidth: '150px',
            maxWidth: '150px',
          },
          ...dateColumns
        ]);
        
        // Map the response data to table rows
        const tableRows = (res.data as any).rows.map((row: any) => {
          const rowData: any = { memberName: row.memberName };
          
          // Initialize with empty data for all dates
          Array.from(apiDates).forEach((date: string) => {
            rowData[date] = '-';
          });
          
          // Fill in the actual status for each date
          row.cells.forEach((cell: any) => {
            const date = cell.date.split('T')[0];
            if (apiDates.has(date)) {
              rowData[date] = cell.status;
            }
          });
          
          // Add empty values for months with no data
          allMonths.forEach(month => {
            if (!monthsWithData.has(month)) {
              rowData[`no-data-${month}`] = '-';
            }
          });
          
          return rowData;
        });

        // Set the rows
        if (typeof tableRows === 'undefined') {
          setRows([]);
        } else {
          setRows(tableRows);
        }
        
        setGrouped({
          groups: monthHeaders
        });
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setErrMsg('Failed to load attendance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (fromArg?: string, toArg?: string, ddValue?: string) => {
    // Update state and run search with the new values
    if (typeof fromArg === "string") setStartDate(fromArg);
    if (typeof toArg === "string") setEndDate(toArg);
    const nextChapterId = typeof ddValue === "string" ? ddValue : pendingChapterId;
    setSelectedChapterId(nextChapterId);
    setAppliedChapterInfo(selectedChapterInfo);
    runSearch({ from: fromArg, to: toArg, chapterId: nextChapterId });
  };

  // Auto-load once the initial chapter is available. After that, Search controls refreshes.
  useEffect(() => {
    if (!selectedChapterId) {
      setRows([]);
      return;
    }

    if (rows.length === 0 && (!urlChapterId || (chaptersRes?.data?.items?.some((c: any) => c.id === selectedChapterId)))) {
      setAppliedChapterInfo(selectedChapterInfo);
      runSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapterId, chaptersRes, rows.length, urlChapterId]);

  const handlePrint = () => {
    window.print();
  };

  const chapterDetailsPath = urlChapterId
    ? `/admin/regional-board/chapter/${urlChapterId}`
    : null;
  const breadcrumbs = chapterDetailsPath
    ? [
        { label: "Regional Board", onClick: () => navigate("/admin/regional-board") },
        { label: selectedChapterInfo.name || "Chapter", onClick: () => navigate(chapterDetailsPath) },
        { label: "PALMS Attendance Report" },
      ]
    : [{ label: "PALMS Attendance Report" }];
  

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar userName={displayMember} />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader breadcrumbs={breadcrumbs} className="mb-3" />

        <div className="mb-5">
          <div className="mb-2">
            <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                Attendance &amp; Participation
              </span>
            </div>
          </div>
          <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
            PALMS Attendance Report
          </h1>
          <p className="mt-2 text-[12.5px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
            Present, late, absent and excused, by member and meeting date.
          </p>
        </div>

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
          showDropdown
          dropdownLabel="Chapter"
          dropdownOptions={chapterOptions}
          dropdownValue={pendingChapterId}
          searchable
          searchPlaceholder="Search chapters"
          onSearchChange={setChapterSearchQuery}
          disableClientSideFilter
          onDropdownChange={(v) => {
            setPendingChapterId(v);
          }}
        />

        {/* The region is the one fact the filter row above does not already
            show — everything else here would just repeat it. */}
        {(appliedChapterInfo.region || regionName) && (
          <p className="mb-3 text-[12.5px] text-[var(--ov-ink-4)]">
            {appliedChapterInfo.name || chapterName || "All chapters"} ·{" "}
            <span className="text-[var(--ov-ink-3)]">{appliedChapterInfo.region || regionName}</span>
          </p>
        )}

        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            {loading && (
              <div className="p-4">
                <TableSkeleton columns={Math.min(columns.length, 8)} rows={6} />
              </div>
            )}
            {errMsg && (
              <div className="m-4 flex items-start gap-2.5 rounded-xl bg-[var(--ov-danger-wash)] px-3.5 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ov-danger)]" aria-hidden="true" />
                <p className="text-[13px] leading-5 text-[var(--ov-danger)]">{errMsg}</p>
              </div>
            )}
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
