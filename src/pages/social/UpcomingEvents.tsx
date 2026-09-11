import { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "../../components/common/DatePicker";
import { FormSelect } from "../../components/forms";
import { EventCard, SocialLayout } from "../../components/social";
import CalendarIcon from "../../assets/icons/calendar.svg";
import { useGetUserSocialEventsQuery, useJoinUserEventMutation } from "../../services/social";
import { getLastDayOfMonth } from "../../utils/date";
import { useToast } from "../../components/toast/ToastProvider";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  chapter: string;
  location: string;
  description: string;
  category: string;
  status: "joined" | "ongoing" | "upcoming";
  imageUrl?: string;
  categoryBadgeColor?: string;
  joinedCount: number;
  joinedCountText: string;
}

function formatJoinedCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 Joined";
  if (n >= 1000) {
    const k = n / 1000;
    const rounded = k >= 10 ? Math.floor(k) : Math.round(k * 10) / 10;
    return `${rounded}k+ Joined`;
  }
  return `${n} Joined`;
}

export default function UpcomingEvents() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Initialize with "this month" date range
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(getLastDayOfMonth());


  // Filter state for API params - only updated when Search is clicked
  const [filterParams, setFilterParams] = useState<{
    from?: string;
    to?: string;
    eventType?: string;
  }>({
    from: `${today}T00:00:00`,       // 👈 today instead of first day of month
    to: `${getLastDayOfMonth()}T23:59:59`,
  });

  const [selectedEventType, setSelectedEventType] = useState("");

  // Control when to skip the API query
  const [shouldFetch, setShouldFetch] = useState(true);


  const eventTypeOptions = [
    { value: "All", label: "All" },
    { value: "Donation", label: "Donation" },
    { value: "Fundraiser", label: "Fundraiser" },
    { value: "Meeting", label: "Meeting" },
  ];

  // Handle search with filters - THIS NOW TRIGGERS THE API CALL
  // Handle search with filters - THIS NOW TRIGGERS THE API CALL
  const handleSearch = useCallback(() => {
    const params: any = {
      from: fromDate ? `${fromDate}T00:00:00` : undefined,
      to: toDate ? `${toDate}T23:59:59` : undefined,
    };

    if (selectedEventType && selectedEventType !== "All") {
      params.eventType = selectedEventType.toUpperCase();
    }

    setFilterParams(params);
    setShouldFetch(true);
  }, [fromDate, toDate, selectedEventType]);

  // API query with skip option
  const { data, isLoading, refetch } = useGetUserSocialEventsQuery({
    from: filterParams.from || fromDate,
    to: filterParams.to || toDate,
    eventType: filterParams.eventType,
    tab: "upcoming",
    page: 1,
    limit: 20,
  }, {
    skip: !shouldFetch,
  });

  const [joiningEventId, setJoiningEventId] = useState<string | null>(null);
  const [joinedEventIds, setJoinedEventIds] = useState<Record<string, true>>({});

  const [joinUserEvent, { isLoading: isJoining }] = useJoinUserEventMutation();

  useEffect(() => {
    if (!data?.data?.items) return;

    const joinedMap: Record<string, true> = {};

    data.data.items.forEach((item: any) => {
      if (
        item.status?.toLowerCase() === "joined" ||
        item.isJoined === true ||
        item.userJoined === true ||
        item.isCreatedByMe === true
      ) {
        joinedMap[item.id] = true;
      }
    });

    setJoinedEventIds(joinedMap);
  }, [data]);



  const handleJoinNow = async (eventId: string) => {
    if (isJoining) return;
    setJoiningEventId(eventId);
    try {
      await joinUserEvent(eventId).unwrap();
      setJoinedEventIds((prev) => ({ ...prev, [eventId]: true }));
      showToast({ title: "Joined", description: "You have joined this event.", kind: "success" });
      refetch();
    } catch (e: any) {
      const msg = String(e?.data?.message || "");
      const isDuplicate = msg.toLowerCase().includes("already joined") || msg.toLowerCase().includes("duplicate");
      if (e?.status === 409 || isDuplicate) {
        setJoinedEventIds((prev) => ({ ...prev, [eventId]: true }));
        showToast({ title: "Already joined", description: "You have already joined this event.", kind: "success" });
        refetch();
      } else {
        showToast({
          title: "Failed to join",
          description: e?.data?.message || "Something went wrong",
          kind: "error",
        });
      }
    } finally {
      setJoiningEventId(null);
    }
  };

  // Handle clicking on event card to view details

  const handleEventClick = (eventId: string) => {
    navigate(`/social/event-details/${eventId}`, {
      state: { from: "upcoming-events" },
    });
  };

  const events: Event[] = useMemo(() => {
    if (!data?.data?.items) return [];

    return data.data.items.map((item) => {
      const starts = new Date(item.startsAt);

      const day = String(starts.getUTCDate()).padStart(2, "0");
      const month = String(starts.getUTCMonth() + 1).padStart(2, "0");
      const year = starts.getUTCFullYear();
      let hours = starts.getUTCHours();
      const minutes = String(starts.getUTCMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;

      const date = `${day}/${month}/${year}`;
      const time = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;

      const isJoined =
        joinedEventIds[item.id] ||
        item.status?.toLowerCase() === "joined" ||
        item.isJoined === true ||
        item.isCreatedByMe === true;

      const status: Event["status"] = isJoined ? "joined" : "upcoming";
      const joinedCount = Number(item.joinedCount ?? 0);

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
        joinedCount,
        joinedCountText: formatJoinedCount(joinedCount),
      };
    });
  }, [data, joinedEventIds]);


  return (
    <SocialLayout>
      {/* Filters */}
      <div className="py-1 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">
              From Date <span className="text-red-400">*</span>
            </label>
            <DatePicker value={fromDate} onChange={setFromDate} iconSrc={CalendarIcon} placeholder="Select From Date" minDate={today} />
          </div>

          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">
              To Date <span className="text-red-400">*</span>
            </label>
            <DatePicker value={toDate} onChange={setToDate} iconSrc={CalendarIcon} placeholder="Select To Date" minDate={today} />
          </div>

          <FormSelect
            label="Event Type"
            options={eventTypeOptions}
            placeholder="Select event type"
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
          />

          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="w-full bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Event Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
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
                imageUrl={event.imageUrl}
                categoryBadgeColor={event.categoryBadgeColor}
                joinedCountText={event.joinedCountText}
                showJoinedCount
                source="upcoming-events"
                onCardClick={() => handleEventClick(event.id)}
                onButtonClick={
                  event.status !== "upcoming" ||
                    joinedEventIds[event.id] ||
                    isJoining ||
                    joiningEventId === event.id
                    ? undefined
                    : () => handleJoinNow(event.id)
                }
              />
              {joiningEventId === event.id && isJoining && (
                <div className="text-xs text-gray-400 mt-2">Joining...</div>
              )}
            </div>
          ))}
        </div>
      )}
    </SocialLayout>
  );
}