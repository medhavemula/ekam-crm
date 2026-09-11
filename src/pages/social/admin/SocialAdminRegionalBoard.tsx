import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import FormSelect from "../../../components/forms/FormSelect";
import { ChapterCard } from "../../../components/admin";
import { useAppSelector } from "../../../app/store";
import { useGetSocialRegionalBoardQuery } from "../../../services/social/socialAdminDashboardApi";

export default function SocialAdminRegionalBoard() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAppSelector((s) => s.auth.user);
  const [userName, setUserName] = useState("User");

  // Filters UI state
  const [pendingArea, setPendingArea] = useState<string>("");
  const [pendingChapter, setPendingChapter] = useState<string>("");
  
  // Search params (applied on Search button click)
  const [searchParams, setSearchParams] = useState<{ area?: string; chapter?: string }>({});
  const [page, setPage] = useState(1);
  const limit = 12;

  // API query
  const { data, isLoading, isFetching, refetch } = useGetSocialRegionalBoardQuery({
    area: searchParams.area || undefined,
    chapter: searchParams.chapter || undefined,
    page,
    limit,
  });

  const items = data?.data?.items || [];
  const total = data?.data?.total || 0;

  // Build filter options from API data
  const areaOptions = useMemo(() => {
    const options = [{ value: "", label: "Select Area" }];
    const uniqueAreas = new Set(items.map((ch) => ch.area).filter(Boolean));
    uniqueAreas.forEach((area) => {
      options.push({ value: area, label: area });
    });
    return options;
  }, [items]);

  const chapterOptions = useMemo(() => {
    const options = [{ value: "", label: "Select chapter" }];
    items.forEach((ch) => {
      options.push({ value: ch.id, label: ch.name });
    });
    return options;
  }, [items]);

  // Initialize navbar name
  useEffect(() => {
    const name = typeof localStorage !== "undefined" ? localStorage.getItem("userName") : null;
    if (name) setUserName(name);
    else if (authUser?.name) setUserName(authUser.name);
  }, [authUser]);

  // Check if we're returning from chapter creation and refresh data
  useEffect(() => {
    if (location.state?.chapterCreated) {
      refetch();
      // Clear the state to prevent multiple refreshes
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, refetch]);

  // Listen for navigation events to refresh data after chapter creation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if we're coming back from chapter creation
        const navigationEntries = performance.getEntriesByType('navigation');
        if (navigationEntries.length > 0) {
          const navigationType = (navigationEntries[0] as any).type;
          if (navigationType === 'reload' || navigationEntries.length === 0) {
            refetch();
          }
        }
      }
    };

    // Also check for focus events (when user returns from another tab)
    const handleFocus = () => {
      refetch();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetch]);

  const handleSearch = () => {
    setSearchParams({
      area: pendingArea || undefined,
      chapter: pendingChapter || undefined,
    });
    setPage(1);
  };

  const handleViewMembers = (chapterId: string) => {
    navigate(`/social/admin/regional-board/chapter/${chapterId}/members?chapterId=${chapterId}`);
  };

  const handleViewChapter = (chapter: { id: string; name: string; area: string; members: number; pendingApprovals?: number }) => {
    navigate(`/social/admin/regional-board/chapter/${chapter.id}`, {
      state: {
        name: chapter.name,
        area: chapter.area,
        members: chapter.members,
        pendingApprovals: chapter.pendingApprovals,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
      <Navbar
        userName={userName}
        onNotificationClick={() => navigate("/notifications")}
      />

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Header row with title and Create Chapter button */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-white">Regional Board</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => navigate("/social/admin/regional-board/platform-members")}
              className="inline-flex items-center justify-center h-10 px-5 rounded-md border border-[#D85D27] text-white hover:bg-[#D85D27]/10 font-medium text-sm transition-colors whitespace-nowrap"
            >
              Add Platform Member
            </button>
            <button
              onClick={() => navigate("/social/admin/regional-board/create-chapter")}
              className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium text-sm transition-colors whitespace-nowrap"
            >
              Create Chapter +
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div className="flex-none w-full sm:w-auto lg:w-[220px]">
            <FormSelect
              label="Area"
              value={pendingArea}
              onChange={(e) => setPendingArea(e.target.value)}
              options={areaOptions}
            />
          </div>
          <div className="flex-none w-full sm:w-auto lg:w-[220px]">
            <FormSelect
              label="Chapter"
              value={pendingChapter}
              onChange={(e) => setPendingChapter(e.target.value)}
              options={chapterOptions}
            />
          </div>
          <div className="flex-none w-full sm:w-auto lg:w-[140px]">
            <button
              onClick={handleSearch}
              className="h-[46px] w-full rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Chapters Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.length > 0 ? (
              items.map((chapter) => (
                <ChapterCard
                  key={chapter.id}
                  chapterName={chapter.name}
                  location={chapter.area}
                  memberCount={chapter.members}
                  onViewMembers={() => handleViewMembers(chapter.id)}
                  onViewChapter={() => handleViewChapter(chapter)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-400">
                <p className="text-lg mb-2">No chapters found</p>
                <p className="text-sm">Try adjusting the Area or Chapter filters.</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {items.length > 0 && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-gray-300">
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} chapters
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
                className="px-4 py-2 rounded-md bg-[#1a2332] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a3342] transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total || isFetching}
                className="px-4 py-2 rounded-md bg-[#1a2332] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a3342] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
