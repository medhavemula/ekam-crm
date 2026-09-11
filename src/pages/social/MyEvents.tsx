import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "../../components/common/DatePicker";
import GradientContainer from "../../components/common/GradientContainer";
import { StatCard } from "../../components/dashboard";
import { SocialLayout, EventCard } from "../../components/social";
import CalendarIcon from "../../assets/icons/calendar.svg";
import {
  useGetUserSocialEventsQuery,
  useGetMyEventsOverviewQuery,
} from "../../services/social";
import { getFirstDayOfMonth, getLastDayOfMonth } from "../../utils/date";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?:
  | "exchange"
  | "users"
  | "dot-calender"
  | "tick-calender"
  | "funds-donated"
  | "funds-raised"
  | "social-users"
  | "on-going-calender"
  | "up-coming-calender";
  className?: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  chapter: string;
  location: string;
  description: string;
  category: string;
  status: "joined" | "ongoing" | "upcoming" | "pending" | "completed" | "approved" | "rejected";
  categoryBadgeColor?: string;
  imageUrl?: string;
  joinedCountText?: string;
  isCreatedByMe?: boolean;
}

export default function MyEvents() {
  const navigate = useNavigate();

  // UI state for date pickers
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getLastDayOfMonth());

  // API state - only updated when Search is clicked
  const [apiParams, setApiParams] = useState({
    from: getFirstDayOfMonth(),
    to: getLastDayOfMonth(),
  });

  const withTime = (params: { from: string; to: string }) => ({
    from: params.from ? `${params.from.slice(0, 10)}T00:00:00` : params.from,
    to: params.to ? `${params.to.slice(0, 10)}T23:59:59` : params.to,
  });

  // Control when to fetch
  const [shouldFetch, setShouldFetch] = useState(true);

  // Handle search button click
  const handleSearch = useCallback(() => {
    setApiParams({
      from: fromDate,
      to: toDate,
    });
    setShouldFetch(true);
  }, [fromDate, toDate]);

  // Fetch my events
  const { data, isLoading } = useGetUserSocialEventsQuery(
    {
      ...withTime(apiParams),
      tab: "mine",
      page: 1,
      limit: 20,
    },
    {
      skip: !shouldFetch,
    }
  );

  // Fetch my KPI overview (events count, attended, donations, upcoming, voluntaries)
  const { data: overview } = useGetMyEventsOverviewQuery(
    withTime(apiParams),
    { skip: !shouldFetch },
  );

  const events: Event[] = useMemo(() => {
    if (!data?.data?.items) return [];

    const now = Date.now();

    return data.data.items.map((item) => {
      const starts = new Date(item.startsAt);
      const ends = item.endsAt ? new Date(item.endsAt) : null;

      const date = `${String(starts.getUTCDate()).padStart(2, "0")}/${String(
        starts.getUTCMonth() + 1
      ).padStart(2, "0")}/${starts.getUTCFullYear()}`;

      let hours = starts.getUTCHours();
      const minutes = String(starts.getUTCMinutes()).padStart(2, "0");

      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;

      const time = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;

      const hasEnded = ends ? ends.getTime() < now : starts.getTime() < now;
      const approval = (item.approvalStatus || "").toUpperCase();

      // Rejected creator-events keep the Rejected badge regardless of date.
      // Otherwise: completed (past) > pending/approved/joined.
      let status: Event["status"];
      if (item.isCreatedByMe && approval === "REJECTED") {
        status = "rejected";
      } else if (item.status === "COMPLETED" || hasEnded) {
        status = "completed";
      } else if (item.isCreatedByMe) {
        if (approval === "PENDING") status = "pending";
        else if (approval === "APPROVED") status = "approved";
        else if (item.status === "PUBLISHED") status = "approved";
        else status = "pending";
      } else if (item.isJoined) {
        status = "joined";
      } else if (item.status === "PUBLISHED") {
        status = "approved";
      } else {
        status = "pending";
      }

      return {
        id: item.id,
        title: item.title,
        date,
        time,
        chapter: item.chapterName || "Social Chapter",
        location: item.location,
        description: item.description,
        category: item.badge || "event",
        status,
        imageUrl: item.imageUrl || undefined,
        joinedCountText: item.joinedCount ? `${item.joinedCount}+ Joined` : undefined,
        isCreatedByMe: item.isCreatedByMe,
      };
    });
  }, [data]);

  const stats: StatCardProps[] = useMemo(() => {
    const kpis = overview?.data?.kpis;
    const totalEvents = kpis?.noOfEvents ?? data?.data?.total ?? 0;
    const attended = kpis?.noOfAttendedEvents ?? 0;
    const fundsDonated = kpis?.totalFundsDonated ?? 0;
    const upcoming = kpis?.upcomingEvents ?? 0;
    const voluntary = kpis?.noOfVoluntary ?? 0;

    return [
      { title: "No of Events", value: String(totalEvents), icon: "dot-calender" },
      { title: "No of Attended Events", value: String(attended), icon: "tick-calender" },
      {
        title: "Total Funds Donated",
        value: `₹ ${Number(fundsDonated).toLocaleString("en-IN")}`,
        icon: "funds-donated",
      },
      { title: "Upcoming Events", value: String(upcoming), icon: "up-coming-calender" },
      { title: "No of Voluntary", value: String(voluntary), icon: "users" },
    ];
  }, [data, overview]);

  return (
    <SocialLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Filters */}
        <div className="py-1">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="w-full sm:min-w-[140px] sm:w-auto">
                <label className="block text-xs text-gray-400 mb-2">From Date</label>
                <DatePicker
                  value={fromDate}
                  onChange={setFromDate}
                  iconSrc={CalendarIcon}
                  placeholder="06/06/2025"
                  className="h-10"
                />
              </div>

              <div className="w-full sm:min-w-[140px] sm:w-auto">
                <label className="block text-xs text-gray-400 mb-2">To Date</label>
                <DatePicker
                  value={toDate}
                  onChange={setToDate}
                  iconSrc={CalendarIcon}
                  placeholder="08/08/2025"
                  className="h-10"
                />
              </div>

              <button
                onClick={handleSearch}
                className="bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors h-10 flex items-center justify-center w-full sm:w-auto"
              >
                Search
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate("/social/add-event")}
                className="bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors h-10 flex items-center justify-center w-full sm:w-auto"
              >
                Add Event +
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-6">
          {stats.map((stat) => (
            <GradientContainer key={stat.title}>
              <StatCard title={stat.title} value={stat.value} icon={stat.icon} />
            </GradientContainer>
          ))}
        </div>

        {/* Event Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-stretch">
            {events.map((event) => (
              <div key={event.id} className="h-full">
                <EventCard
                  id={event.id}
                  title={event.title}
                  date={event.date}
                  time={event.time}
                  chapter={event.chapter}
                  location={event.location}
                  description={event.description}
                  category={event.category}
                  status={event.status}
                  categoryBadgeColor={event.categoryBadgeColor}
                  imageUrl={event.imageUrl}
                  showJoinedCount={false}
                  rightActionLabel={
                    event.isCreatedByMe && event.status === "pending" ? "Edit" : undefined
                  }
                  rightActionPlacement="content"
                  onRightActionClick={(e) => {
                    e.stopPropagation();
                    navigate(`/social/event/${event.id}/edit`, {
                      state: {
                        event,
                        from: "my-events",
                      },
                    });
                  }}
                  onCardClick={() => {
                    navigate(`/social/event-details/${event.id}`, { state: { from: "my-events" } });
                  }}
                  source="my-events"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </SocialLayout>
  );
}