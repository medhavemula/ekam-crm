import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { ReportInfoBar } from "../../components/reports";
import FilterSection from "../../components/common/FilterSection";
import DataTable from "../../components/common/DataTable";
import GradientContainer from "../../components/common/GradientContainer";
import type { TableColumn } from "../../components/common/DataTable";
import { useLazyGetSponsorsReportQuery } from "../../services/dashboardApi";
import { useAppSelector } from "../../app/store";
import { useGetChapterMembersListQuery } from "../../services/ed/edChaptersApi";
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

export default function UserInductedByReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAppSelector((s) => s.auth.user);
  const { role: userRole } = useRole();

  // Check if user is a director role (admin view) - redirect to admin page if so
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
  const [displayChapterName, setDisplayChapterName] = useState<string>("");
  const [apiChapterName, setApiChapterName] = useState<string>("");
  const displayMember = authUser?.name || "";

  // General users services
  const [triggerSponsors] = useLazyGetSponsorsReportQuery();

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

      // Extract chapter name from API response header
      if (res && typeof res === 'object' && !Array.isArray(res) && res.data?.header?.chapter?.name) {
        setApiChapterName(res.data.header.chapter.name);
      }

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
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Check authentication
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  // Redirect admin users to admin page
  React.useEffect(() => {
    if (isAdminRole) {
      navigate("/reports/admin/inducted-by-report");
    }
  }, [isAdminRole, navigate]);

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

  // Update display chapter name when selected chapter changes or API data changes
  React.useEffect(() => {
    // Priority: API chapter name > user's chapterName > fallback
    if (apiChapterName) {
      setDisplayChapterName(apiChapterName);
    } else if (selectedChapter) {
      const chapterName = (authUser as any)?.basicInfo?.chapterName || `Chapter ${selectedChapter}`;
      setDisplayChapterName(chapterName);
    }
  }, [selectedChapter, authUser, apiChapterName]);

  const handleSearch = () => {
    // Unified behavior: just reset page; effects/hooks will refetch (only when chapterId present)
    setPage(1);
    setAppliedMemberName(selectedMemberLabel || "All Members");
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    if (!isAdminRole) fetchReport();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleColumnSearchChange = () => {
    // Not needed for this report
  };

  // Render General User View (for all other roles)
  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={displayMember} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", onClick: () => navigate("/dashboard") },
            { label: "Inducted By Report" },
          ]}
        />

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
          }}
          searchable={true}
          searchPlaceholder="Search members..."
          onSearchChange={setMemberSearch}
          disableClientSideFilter={true}
        />

        {!loading && (
          <GradientContainer>
            <div className="rounded-2xl overflow-hidden">
              <ReportInfoBar
  chapter={displayChapterName || "Current Chapter"}
  member={appliedMemberName}
  fromDate={formatDate(appliedStartDate)}
  toDate={formatDate(appliedEndDate)}
/>

              <DataTable
                columns={columns}
                data={rows}
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
