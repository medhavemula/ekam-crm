import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import GradientContainer from "../../../components/common/GradientContainer";
import { ChapterInfoCard } from "../../../components/admin";
import AdminStatCard from "../../../components/admin/AdminStatCard";
import { useGetSocialChapterOverviewQuery } from "../../../services/social/socialAdminDashboardApi";
import { useGetSocialEventsQuery } from "../../../services/social/eventsApi";
import { useGetSocialChapterMembersQuery } from "../../../services/social/chaptersApi";

export default function SocialAdminChapterDetailsPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();

  // API query
  const { data, isLoading, error } = useGetSocialChapterOverviewQuery(chapterId || "", {
    skip: !chapterId,
  });

  // Get events requests count (pending events)
  const { data: eventsData } = useGetSocialEventsQuery(
    {
      socialChapterId: chapterId || "",
      approvalStatus: "PENDING",
      limit: 1, // Only need count
    },
    { skip: !chapterId, refetchOnMountOrArgChange: true }
  );

  // Get upcoming events count
  const { data: upcomingEventsData } = useGetSocialEventsQuery(
    {
      socialChapterId: chapterId || "",
      tab: "upcoming",
      limit: 1, // Only need count
    },
    { skip: !chapterId }
  );

  // Get members count from the same chapter-members source used by the members page
  const { data: chapterMembersData } = useGetSocialChapterMembersQuery(
    {
      socialChapterId: chapterId || "",
      page: 1,
      limit: 1,
    },
    { skip: !chapterId }
  );

  // Detect 403 scope violation from backend
  const isScopeError =
    error &&
    typeof error === "object" &&
    "status" in error &&
    (error as any).status === 403;

  const chapterData = !isScopeError ? data?.data : undefined;
  const chapterName = chapterData?.chapter?.name || "Social Chapter";
  const chapterArea = chapterData?.chapter?.area || "Hyderabad";

  const members = chapterMembersData?.data?.total ?? chapterData?.members?.total ?? 0;
  const eventRequests = eventsData?.data?.total ?? 0;
  const memberRequests = chapterData?.kpis?.pendingApprovals ?? 0;
  const noOfEvents = chapterData?.kpis?.noOfEvents ?? 0;
  const totalFundsRaised = chapterData?.kpis?.totalFundsRaised ?? 0;
  const upcomingEvents = chapterData?.kpis?.upcomingEvents ?? upcomingEventsData?.data?.total ?? 0;
  const ongoingEvents = chapterData?.kpis?.ongoingEvents ?? 0;
  const leadershipTeamCount = chapterData?.executiveTeam?.total ?? 0;

  const formatCurrency = (value: number) => {
    if (!value || isNaN(value)) return "₹ 0";
    return `₹ ${Math.round(value).toLocaleString("en-IN")}`;
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <button
            onClick={() => navigate("/social/admin/regional-board")}
            className="hover:text-white transition-colors"
          >
            Regional Board
          </button>
          <span>›</span>
          <span className="text-white">{chapterName}</span>
        </div>

        {/* Top Info Cards - match screenshot layout using ChapterInfoCard + GradientContainer */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-4 mb-6">
          {/* Chapter Details */}
          <div className="col-span-2 md:col-span-2 lg:col-span-4">
            <ChapterInfoCard
              title="Chapter Details"
              content={chapterName}
              subtitle={chapterArea}
              headerSize="md"
              titleSize="md"
              subtitleSize="sm"
              className="h-full flex flex-col"
            />
          </div>

          {/* Executive Team */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <ChapterInfoCard
              title="Executive Team"
              content={leadershipTeamCount}
              headerSize="md"
              titleSize="md"
              buttonText="View Team"
              onButtonClick={() =>
                chapterId && navigate(`/social/admin/regional-board/chapter/${chapterId}/leadership-team`)
              }
              className="h-full flex flex-col"
            />
          </div>

          {/* Event Requests */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <ChapterInfoCard
              title="Event Requests"
              content={eventRequests}
              headerSize="md"
              titleSize="md"
              buttonText="View Requests"
              onButtonClick={() =>
                chapterId && navigate(`/social/admin/regional-board/chapter/${chapterId}/event-requests?hideNavbar=true`)
              }
              className="h-full flex flex-col"
            />
          </div>

          {/* Upcoming Events */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <ChapterInfoCard
              title="Upcoming Events"
              content={upcomingEvents}
              headerSize="md"
              titleSize="md"
              buttonText="View Events"
              onButtonClick={() =>
                chapterId && navigate(`/social/admin/regional-board/chapter/${chapterId}/events?hideNavbar=true`)
              }
              className="h-full flex flex-col"
            />
          </div>
          {/* Members */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <ChapterInfoCard
              title="Members"
              content={members}
              headerSize="md"
              titleSize="md"
              buttonText="View Members"
              onButtonClick={() =>
                chapterId && navigate(`/social/admin/regional-board/chapter/${chapterId}/members?chapterId=${chapterId}&hideNavbar=true`)
              }
              className="h-full flex flex-col"
            />
          </div>
        </div>

        {/* Loading state */}
        {isLoading && !isScopeError && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Scope error state */}
        {isScopeError && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-gray-300">
            <h2 className="text-xl font-semibold mb-2">You don&apos;t have access to this chapter</h2>
            <p className="text-sm mb-4 max-w-md">
              This social chapter is outside your assigned region or country scope. Please select a chapter from your
              Regional Board list.
            </p>
            <button
              onClick={() => navigate("/social/admin/regional-board")}
              className="px-5 py-2.5 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white text-sm font-medium transition-colors"
            >
              Go to Regional Board
            </button>
          </div>
        )}

        {/* Bottom stats row */}
        {!isLoading && !isScopeError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-6">
            <GradientContainer>
              <AdminStatCard
                title="No of Events"
                value={noOfEvents}
                icon="none"
              />
            </GradientContainer>
            <GradientContainer>
              <AdminStatCard
                title="Ongoing Events"
                value={ongoingEvents}
                icon="users"
              />
            </GradientContainer>
            <GradientContainer>
              <AdminStatCard
                title="Total funds raised"
                value={formatCurrency(totalFundsRaised)}
                icon="none"
              />
            </GradientContainer>
            <GradientContainer>
              <AdminStatCard
                title="Upcoming Events"
                value={upcomingEvents}
                icon="none"
              />
            </GradientContainer>
            <GradientContainer>
              <AdminStatCard
                title="Pending Approvals"
                value={memberRequests}
                icon="users"
              />
            </GradientContainer>
          </div>
        )}
      </main>
    </div>
  );
}
