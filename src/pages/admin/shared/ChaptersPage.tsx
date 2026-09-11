import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Ban, Layers, ArrowUpRight } from "lucide-react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useBlockEdChapterMutation } from "../../../services/ed";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import GradientContainer from "../../../components/common/GradientContainer";
import DataTable from "../../../components/common/DataTable";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import type { TableColumn } from "../../../components/common/DataTable";
import FormInput from "../../../components/forms/FormInput";
import AdminStatCard from "../../../components/admin/AdminStatCard";
import { useGetEdChaptersQuery } from "../../../services/ed";

interface ChapterRecord {
  id: number;
  chapterName: string;
  launchDate: string;
  region: string;
  regionId: string;
  area: string;
  noOfMembers: number;
  meetingType?: string;
  meetingCadence?: string;
  alternate_interval_weeks?: number;
  meetingDate?: string;
  meetingTime?: string;
  meetingDay?: string;
  meetingWeekday?: number;
  actions?: string;
}

// Table columns configuration
const columns: TableColumn[] = [
  {
    key: "chapterName",
    label: "Chapter Name",
    sortable: true,
    searchable: true,
  },
  { key: "launchDate", label: "Launch Date", sortable: true, searchable: false },
  { key: "region", label: "Region", sortable: true, searchable: true },
  { key: "area", label: "Area", sortable: true, searchable: true },
  {
    key: "noOfMembers",
    label: "Members",
    sortable: true,
    searchable: true,
  },
  {
    key: "actions",
    label: "Actions",
    sortable: false,
    searchable: false,
  },
];

// Action Buttons Component
const ActionButtons = ({ row }: { row: any }) => {
  const navigate = useNavigate();
  const [showBlockDialog, setShowBlockDialog] = useState(false);

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/admin/regional-board/chapter/${row.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/admin/chapters/edit/${row.id}`, {
      state: {
        regionId: row.regionId,
        regionName: row.region,
        chapterName: row.chapterName,
        area: row.area,
        launchDate: row.launchDate,
        meetingCadence: row.meetingCadence,
        alternate_interval_weeks: row.alternate_interval_weeks,
        meetingDate: row.meetingDate,
        meetingTime: row.meetingTime || "",
        meetingDay: row.meetingDay || "",
        meetingWeekday: row.meetingWeekday || 0
      }
    });
  };

  const [blockChapter, { isLoading: isBlocking }] = useBlockEdChapterMutation();
  
  const handleBlock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBlockDialog(true);
  };

  const handleConfirmBlock = async () => {
    try {
      await blockChapter({ 
        chapterId: row.id, 
        blocked: true, 
        reason: "Blocked by administrator" 
      }).unwrap();
      setShowBlockDialog(false);
    } catch (error: any) {
      console.error('Failed to block chapter:', error);
      setShowBlockDialog(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={handleView}
          className="h-8 w-8 flex items-center justify-center rounded border border-orange-500 text-white hover:bg-orange-500/20 transition-colors"
          title="View Chapter"
          aria-label="View chapter"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleEdit}
          className="h-8 w-8 flex items-center justify-center rounded bg-gray-600 hover:bg-gray-700 text-white transition-colors"
          title="Edit Chapter"
          aria-label="Edit chapter"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleBlock}
          disabled={isBlocking}
          className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${
            isBlocking
              ? "bg-gray-500 text-gray-300 cursor-not-allowed"
              : "bg-[#D85D27] hover:bg-orange-700 text-white"
          }`}
          title="Block Chapter"
          aria-label="Block chapter"
        >
          {isBlocking ? (
            <span className="text-[9px] leading-none">...</span>
          ) : (
            <Ban className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      
      <ConfirmationDialog
        isOpen={showBlockDialog}
        onClose={() => setShowBlockDialog(false)}
        onConfirm={handleConfirmBlock}
        isSubmitting={isBlocking}
        actionType="block"
      />
    </>
  );
};

export default function ChaptersPage() {
  const navigate = useNavigate();

  // Filter states
  const [cityInput, setCityInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Column search states
  const [columnSearches, setColumnSearches] = useState<{
    [key: string]: string;
  }>({});

  // Track search type
  const [isCitySearch, setIsCitySearch] = useState(false);
  
  // Buffer for column search values (to prevent immediate API calls)
  const [bufferedColumnSearches, setBufferedColumnSearches] = useState<{
    [key: string]: string;
  }>({});
  
  // Debounce timer for column searches
  const columnSearchTimeoutRef = useRef<number | undefined>(undefined);

  // Handle search when button is clicked
  const handleSearch = () => {
    if (cityInput.trim() === "") {
      setSearchQuery("");
      setColumnSearches({});
      setPage(1);
      return;
    }
    
    if (isCitySearch) {
      // City search - use column search for area
      setColumnSearches({ area: cityInput });
      setSearchQuery("");
    } else {
      // Chapter name search - use main search query
      setSearchQuery(cityInput);
      setColumnSearches({});
    }
    setPage(1);
  };

  // Handle Enter key press in search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clean up column search timeout on unmount
  useEffect(() => {
    return () => {
      if (columnSearchTimeoutRef.current) {
        clearTimeout(columnSearchTimeoutRef.current);
      }
    };
  }, []);


  // API Integration with column-specific search parameters
  const { data, isLoading, error } = useGetEdChaptersQuery({
    q: searchQuery || undefined,  // Search by chapter name
    city: columnSearches.area || undefined,  // Search by city
    page,
    limit: 10,
  });

  // Helper function to format date to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Map API data to match table column keys
  const apiChapters =
    (data as any)?.data?.items?.map((item: any) => {
      return {
        id: item.id || item._id,
        chapterName: item.name || item.chapterName || "",
        launchDate: formatDate(item.launchDate || item.createdAt || item.launch_date || ""),
        region: item.regionName || item.region?.name || item.region || "",
        regionId: item.regionId || item.region?.id || "",
        area: item.area || item.areaName || item.city || "",
        meetingType: item.meetingType || item.meetingCadence || item.meeting_cadence || "",
        meetingCadence: item.meetingCadence || item.meetingType || item.meeting_cadence || "",
        alternate_interval_weeks: item.alternate_interval_weeks || 2,
        meetingDate: item.meetingDate ? formatDate(item.meetingDate) : "",
        meetingTime: item.meetingTime || item.meeting_time || "",
        meetingDay: item.meetingDay || item.meeting_day || "",
        meetingWeekday: item.meetingWeekday || item.meeting_weekday || 0,
        noOfMembers:
          item.totalMembers || item.membersCount || item.memberCount || item.members || 0,
      };
    }) || [];

  const chaptersData = apiChapters.length > 0 ? apiChapters : [];

  // Calculate stats from API data
  const totalMembers = (chaptersData as ChapterRecord[]).reduce((sum: number, ch: ChapterRecord) => sum + (ch.noOfMembers || 0), 0);
  const totalAreas = new Set((chaptersData as ChapterRecord[]).map((ch: ChapterRecord) => ch.area).filter(Boolean)).size;

  const handlePrint = () => {
    window.print();
  };

  const handleCreateChapter = () => {
    navigate("/admin/chapters/create");
  };

  // Handle column search changes (with buffering to prevent immediate API calls)
  const handleColumnSearchChange = (key: string, value: string) => {
    // Update buffered value immediately for UI
    setBufferedColumnSearches(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Clear existing timeout
    if (columnSearchTimeoutRef.current) {
      clearTimeout(columnSearchTimeoutRef.current);
    }
    
    // Set new timeout to apply search after 500ms
    columnSearchTimeoutRef.current = window.setTimeout(() => {
      if (key === 'area') {
        // For city/area column search, update the city parameter
        setColumnSearches({ area: value });
        setSearchQuery('');
      } else if (key === 'chapterName') {
        // For chapter name column search, update the q parameter
        setSearchQuery(value);
        setColumnSearches({});
      } else {
        // For other columns, use column search
        setColumnSearches(prev => ({
          ...prev,
          [key]: value
        }));
        setSearchQuery('');
      }
      setPage(1);
    }, 500);
  };

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Chapters" },
  ];

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} className="mb-3" />

        <div className="mb-6">
          <div className="mb-2">
            <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
              <Layers className="h-3.5 w-3.5" />
              <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                Network Hierarchy
              </span>
            </div>
          </div>
          <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
            Chapters
          </h1>
          <p className="mt-2 text-[12px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
            Manage chapters, leadership, and operational status across regions.
          </p>
        </div>

        {/* Filters Section */}
        <div className="mb-6">
          <div className="flex flex-wrap items-end gap-3">
            

            {/* City Input */}
            <div className="flex-none w-full sm:w-auto lg:w-[200px]">
              <FormInput
                label="City"
                type="text"
                placeholder="Search by city"
                value={cityInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setCityInput(value);
                }}
                onFocus={() => setIsCitySearch(true)}
                onKeyDown={handleKeyDown}
                className="w-full"
              />
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="h-[46px] w-full sm:w-auto px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors whitespace-nowrap mt-[26px]"
            >
              Search
            </button>

            {/* Create Chapter Button */}
            <div className="w-full sm:w-auto sm:ml-auto">
              <button
                onClick={handleCreateChapter}
                className="h-[46px] w-full sm:w-auto px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors whitespace-nowrap mt-[26px]"
              >
                Create Chapter +
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <AdminStatCard
              title="Total Chapters"
              value={chaptersData.length.toString()}
              icon="chapters"
            />
            <AdminStatCard
              title="Total Members"
              value={totalMembers.toString()}
              icon="users"
            />
            <AdminStatCard
              title="Total Areas"
              value={totalAreas.toString()}
              icon="globe"
            />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12 text-white mb-6">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4">Loading chapters...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
            Failed to load chapters. Please try again.
          </div>
        )}

        {/* Table Section */}
        {!isLoading && (
          <GradientContainer>
            <div className="rounded-2xl overflow-hidden">
              {/* Search and Action Buttons */}
              <div className="flex flex-nowrap items-center gap-3 p-4 bg-[#0E1319] border-b border-gray-700">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <svg
                    className="text-gray-400"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search"
                    value={!isCitySearch ? cityInput : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCityInput(value);
                      setIsCitySearch(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>
                {false && (
                  <div className="flex gap-3 ml-auto flex-none">
                    <button
                      onClick={handlePrint}
                      className="h-10 px-6 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-medium transition-colors"
                    >
                      Print
                    </button>
                  </div>
                )}
              </div>

              {/* Data Table */}
              <DataTable
                columns={columns}
                data={chaptersData}
                searchValues={bufferedColumnSearches}
                onSearchChange={handleColumnSearchChange}
                total={(data as any)?.data?.total || chaptersData.length}
                page={page}
                pageSize={20}
                onPageChange={(p) => {
                  setPage(p);
                  // refetch happens automatically because query args depend on page
                }}
                // onRowClick={handleRowClick}
                renderCell={(column, row) => {
                  if (column.key === 'actions') {
                    return <ActionButtons row={row} />;
                  }
                  if (column.key === 'chapterName') {
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/regional-board/chapter/${row.id}`);
                        }}
                        className="font-semibold text-ekam-navy hover:text-orange-500 transition-colors text-left inline-flex items-center gap-1.5 group"
                      >
                        <span>{row.chapterName}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500" />
                      </button>
                    );
                  }
                  if (column.key === 'noOfMembers') {
                    return (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {row.noOfMembers ?? 0}
                      </span>
                    );
                  }
                  return null; // Let the default rendering handle other columns
                }}
              />
            </div>
          </GradientContainer>
        )}
      </main>
    </div>
  );
}
