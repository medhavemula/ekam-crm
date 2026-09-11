import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { ReportInfoBar } from "../../components/reports";
import FilterSection from "../../components/common/FilterSection";
import DataTable from "../../components/common/DataTable";
import GradientContainer from "../../components/common/GradientContainer";
import type { TableColumn } from "../../components/common/DataTable";
import { useGetEdSponsorsReportQuery } from "../../services/ed";
import { useLazyGetSponsorsReportQuery } from "../../services/dashboardApi";
import { useGetChapterMembersListQuery } from "../../services/ed/edChaptersApi";
import { useAppSelector } from "../../app/store";
import { useGetEdRegionalBoardQuery } from "../../services/ed/edRegionalApi";

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

// No dummy data

export default function SponsorReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAppSelector((s) => s.auth.user);
  const userRole = useSelector((state: RootState) => state.auth.role);

  // Check if user is a director role (admin view)
  const isAdminRole = ["EXECUTIVE_DIRECTOR","ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"].includes(
    userRole || "",
  );

  // Default to current week
  const firstDayOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(d.setDate(diff));
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(monday.getDate()).padStart(2, "0");
    return `${y}-${m}-${dayOfMonth}`;
  };
  const lastDayOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Adjust for Sunday end
    const sunday = new Date(d.setDate(diff));
    const y = sunday.getFullYear();
    const m = String(sunday.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(sunday.getDate()).padStart(2, "0");
    return `${y}-${m}-${dayOfMonth}`;
  };
  const [startDate, setStartDate] = useState(firstDayOfWeek());
  const [endDate, setEndDate] = useState(lastDayOfWeek());
  const [selectedChapter, setSelectedChapter] = useState<string>(() => {
    const st: any = location.state;
    const fromNav = st?.chapterId ? String(st.chapterId) : "";
    if (fromNav) return fromNav;
    const init = (authUser as any)?.basicInfo?.chapter || "";
    return String(init || "");
  });
  const [columnSearches] = useState<{ [key: string]: string }>({});
  const [rows, setRows] = useState<SponsorRecord[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [selectedMemberLabel, setSelectedMemberLabel] = useState<string>("");
  const [appliedMemberName, setAppliedMemberName] = useState<string>("All Members");
  const [memberSearch, setMemberSearch] = useState<string>("");
  const myChapterId = (authUser as any)?.basicInfo?.chapter || "";
  
  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (myChapterId || selectedChapter) {
        // The query will automatically refetch when memberSearch changes
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [memberSearch, myChapterId, selectedChapter]);

  // Load members for dropdown using chapter members list API
  const { data: chapterUsersRes } = useGetChapterMembersListQuery(
    {
      chapterId: String(myChapterId || selectedChapter || ""),
      limit: 50,
      search: memberSearch || ''
    },
    {
      skip: !myChapterId && !selectedChapter,
      refetchOnMountOrArgChange: true,
    }
  );

  const memberOptionsFromUsers = React.useMemo(() => {
    const base = [{ label: "All Members", value: "" }];
    
    // Check if we have valid response data
    const responseData = chapterUsersRes as any;
    const members = responseData?.data?.members || [];
    
    if (members && Array.isArray(members)) {
      members.forEach((member: any) => {
        // Use the label and value directly from the API response
        const label = member.label || '';
        const value = member.value || '';
        
        if (label && value) {
          base.push({ 
            label: label,
            value: value
          });
        }
      });
    }
    
    return base;
  }, [chapterUsersRes]);
  const entriesPerPage = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  // const [errMsg, setErrMsg] = useState<string | null>(null);
  const chapterName = (authUser as any)?.basicInfo?.chapterName || "All Chapters";
  const displayMember = authUser?.name || "";
  const myRegionId = (authUser as any)?.basicInfo?.region || "";
  // Load chapters for admin chapter dropdown from ED Regional Board API
  const { data: edRegionalBoardRes } = useGetEdRegionalBoardQuery({ page: 1, limit: 100 });
  const chapterOptions = React.useMemo(() => {
    const base = [{ label: "Select Chapter", value: "" }];
    const items = (edRegionalBoardRes as any)?.data?.items || [];
    for (const c of items) base.push({ label: c.name, value: String(c.id) });
    return base;
  }, [edRegionalBoardRes]);
  const selectedChapterLabel = React.useMemo(() => {
    const opt = chapterOptions.find((o) => o.value === selectedChapter);
    return opt?.label || chapterName;
  }, [chapterOptions, selectedChapter, chapterName]);
  // ED services (admin only)
  const edParams =
    isAdminRole && selectedChapter
      ? {
          regionId: myRegionId || undefined,
          chapterId: selectedChapter,
          from: startDate ? `${startDate}T00:00:00` : undefined,
          to: endDate ? `${endDate}T23:59:59` : undefined,
          page: page as number,
          pageSize: entriesPerPage as number,
        }
      : undefined;
  const {
    data: edData,
    isLoading: edLoading,
    // error: edError,
  } = useGetEdSponsorsReportQuery(edParams as any, {
    skip: !isAdminRole || !selectedChapter,
  });

  // General users services
  const [triggerSponsors] = useLazyGetSponsorsReportQuery();

  // If navigated from ChapterDetailsPage with chapterId in state, preselect it (admin view)
  React.useEffect(() => {
    const st: any = location.state;
    if (st && st.chapterId) {
      setSelectedChapter(String(st.chapterId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper function to convert date string to ISO format
  const toIso = (d: string, end?: boolean) => `${d}T${end ? "23:59:59.999Z" : "00:00:00.000Z"}`;

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
  // Admin member dropdown not displayed on this page; no options needed

  // Show all members in the dropdown for all users
  const filteredMemberOptions = React.useMemo(() => {
    return memberOptionsFromUsers;
  }, [memberOptionsFromUsers]);

  // Define interface for API response
  interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    total?: number;
    count?: number;
    items?: T[];
    [key: string]: any;
  }

  const fetchReport = async () => {
    try {
      setLoading(true);
      // setErrMsg(null);
      if (!selectedChapter) return; // require chapterId
      
      const memberIdParam = selectedMember || undefined;
      const params = {
        chapterId: selectedChapter,
        from: toIso(startDate, false),
        to: toIso(endDate, true),
        ...(memberIdParam ? { memberId: memberIdParam } : {}),
        search: "",
        page,
        pageSize: entriesPerPage,
      } as const;

      const res = await triggerSponsors(params).unwrap() as ApiResponse<any> | any[];

      // Handle different response formats
      let items: any[] = [];
      
      if (Array.isArray(res)) {
        items = res;
      } else if (res && typeof res === 'object') {
        const response = res as Record<string, any>;
        
        if (Array.isArray(response.data)) {
          items = response.data;
        } else if (response.data?.items && Array.isArray(response.data.items)) {
          items = response.data.items;
        } else if (Array.isArray(response.items)) {
          items = response.items;
        } else if (response.data && typeof response.data === 'object') {
          // Handle case where data is an object with items array
          const data = response.data as Record<string, any>;
          if (Array.isArray(data.items)) {
            items = data.items;
          } else if (Array.isArray(data.members)) {
            items = data.members;
          } else if (Array.isArray(data.data)) {
            items = data.data;
          }
        }
      }


      // Map the items to the expected format
      const mapped: SponsorRecord[] = items.map((item: any, idx: number) => {
        return {
          id: item.id || idx,
          sponsorId: String(item.sponsorId || item.sponsor?._id || item.sponsor?.id || ''),
          sponsorName: (() => {
            const name = item.sponsorName || item.sponsor?.name || item.name || '';
            return String(name).trim() || 'Self';
          })(),
          noOfSponsored: Number(item.noOfSponsored || item.count || item.sponsoredCount || 0),
          sponsoredName: String(item.sponsoredName || item.sponsored?.name || item.sponsoredMember || ''),
          sponsoredRegion: String(item.sponsoredRegion || item.region || item.regionName || ''),
          sponsoredChapter: String(item.sponsoredChapter || item.chapter || item.chapterName || ''),
          applicationDate: formatDate(item.applicationDate || item.appliedAt || item.date || item.createdAt || ''),
        };
      });

      setRows(mapped);
      
      // Set total count, handling different response structures
      let totalVal = items.length;
      
      if (res && typeof res === 'object' && !Array.isArray(res)) {
        const response = res as Record<string, any>;
        
        if (response.data?.total !== undefined) {
          totalVal = Number(response.data.total);
        } else if (response.total !== undefined) {
          totalVal = Number(response.total);
        } else if (response.count !== undefined) {
          totalVal = Number(response.count);
        } else if (Array.isArray(response.data)) {
          totalVal = response.data.length;
        } else if (response.data?.items && Array.isArray(response.data.items)) {
          totalVal = response.data.items.length;
        } else if (response.data?.members && Array.isArray(response.data.members)) {
          totalVal = response.data.members.length;
        }
      }
      
      setTotal(totalVal);
    } catch (e: any) {
      // setErrMsg(e?.message || "Failed to load sponsor report");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // No chapter dropdown here; scoped by user's chapterId already

  // Check authentication
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  // Initialize chapter filter from logged-in user's chapter so chapterId is passed by default
  // General users: initial load when chapter becomes available only (avoid double calls on date changes)
  React.useEffect(() => {
    if (!selectedChapter || isAdminRole) return;
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapter]);

  // On refresh, authUser may load after initial render. When it becomes available,
  // sync selectedChapter for general users so the report auto-loads without manual input.
  React.useEffect(() => {
    if (isAdminRole) return; // admin picks chapter explicitly
    const myChap = String((authUser as any)?.basicInfo?.chapter || "");
    if (!selectedChapter && myChap) {
      setSelectedChapter(myChap);
    }
  }, [isAdminRole, authUser, selectedChapter]);

  const handleSearch = () => {
    // Unified behavior: just reset page; effects/hooks will refetch (only when chapterId present)
    setPage(1);
    setAppliedMemberName(selectedMemberLabel || "All Members");
    if (!isAdminRole) fetchReport();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleColumnSearchChange = () => {
    // Not needed for this report
  };

  // Data comes from fetched rows

  // Render Admin View (for Executive Director, Regional Director, Assistant Regional Director)
  if (isAdminRole) {
    return (
      <div className="min-h-screen bg-[#0f1419]">
        <Navbar userName={displayMember} />

        <main className="container mx-auto px-4 py-6">
          <PageHeader breadcrumbs={[{ label: "Inducted By Report" }]} />
          {/* Admin Filters */}
          <FilterSection
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            deferApply={false}
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
          {(edLoading || loading) && (
            <div className="text-center py-8 text-white">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="mt-2">Loading sponsor data...</p>
            </div>
          )}

          {/* Error State */}
          {/* {(edError || errMsg) && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-4">
              {String((edError as any)?.message || errMsg || "Failed to load sponsor report")}
            </div>
          )} */}

          {/* Admin Table Section with Gradient */}
          {!(edLoading || loading) && (
            <GradientContainer>
              <div className="rounded-2xl overflow-hidden">
                <ReportInfoBar
                  chapter={selectedChapterLabel}
                  member=""
                  fromDate={startDate}
                  toDate={endDate}
                />

                <DataTable
                  columns={columns}
                  data={adminRows.filter((r) => !selectedMember || r.sponsorId === selectedMember)}
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

  // Render General User View (for all other roles)
  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={displayMember} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader breadcrumbs={[{ label: "Inducted By Report" }]} />

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
          dropdownLabel="Member"
          dropdownOptions={filteredMemberOptions}
          dropdownValue={selectedMember}
          onDropdownChange={(v) => {
            setSelectedMember(v);
            const member = memberOptionsFromUsers.find((m) => m.value === v);
            setSelectedMemberLabel(member?.label || "");
            setAppliedMemberName(member?.label || "All Members");
          }}
          searchable={true}
          searchPlaceholder="Search members..."
          onSearchChange={setMemberSearch}
          disableClientSideFilter={true}
        />
        
        {/* {errMsg && (
          <div className="p-4 text-red-400">
            {String(errMsg)}
          </div>
        )} */}

        {!loading && (
          <GradientContainer>
            <div className="rounded-2xl overflow-hidden">
              <ReportInfoBar chapter={chapterName} member={appliedMemberName} fromDate={startDate} toDate={endDate} />

              <DataTable
                columns={columns}
                data={rows.filter((r) => {
                  // If no member selected, show all
                  if (!selectedMember) return true;
                  // Otherwise filter by sponsor name matching the selected member label
                  return r.sponsorName === appliedMemberName || appliedMemberName === "All Members";
                })}
                searchValues={columnSearches}
                onSearchChange={handleColumnSearchChange}
                total={total}
                page={page}
                pageSize={entriesPerPage}
                onPageChange={(p) => {
                  setPage(p);
                  if (!isAdminRole) fetchReport();
                }}
              />
            </div>
          </GradientContainer>
        )}
      </main>
    </div>
  );
}
