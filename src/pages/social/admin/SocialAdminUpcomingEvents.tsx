import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SocialLayout } from "../../../components/social";
import DatePicker from "../../../components/common/DatePicker";
import { FormSelect } from "../../../components/forms";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import { useGetSocialEventsQuery } from "../../../services/social/socialAdminDashboardApi";
import { useJoinUserEventMutation, useGetSocialRegionalBoardQuery } from "../../../services/social";
import type { SocialChapterItem } from "../../../services/social/types";
import { AdminEventCard } from "../../../components/admin";
import { getFirstDayOfMonth, getLastDayOfMonth, toStartOfDayISO, toEndOfDayISO } from "../../../utils/date";

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  chapter: string;
  location: string;
  description: string;
  category: string;
  categoryColor: string;
  joinedCount: string;
  imageUrl: string;
}

export default function SocialAdminUpcomingEvents() {
  const navigate = useNavigate();
  // Filter inputs (what user is currently selecting)
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getLastDayOfMonth());
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");

  // Applied filters (only updated on Search button click)
  const [appliedFromDate, setAppliedFromDate] = useState(toStartOfDayISO(getFirstDayOfMonth())!);
  const [appliedToDate, setAppliedToDate] = useState(toEndOfDayISO(getLastDayOfMonth())!);
  const [appliedChapter, setAppliedChapter] = useState("");
  const [appliedEventType, setAppliedEventType] = useState("");

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [joinUserEvent, { isLoading: isJoining }] = useJoinUserEventMutation();
  const [joiningEventId, setJoiningEventId] = useState<string | null>(null);
  const [joinedEventIds, setJoinedEventIds] = useState<Record<string, true>>({});

  const { data: chaptersRes } = useGetSocialRegionalBoardQuery({});
  const chapters: SocialChapterItem[] = chaptersRes?.data?.items || [];
  const filteredChapters = chapters;
  
  // Create chapter name lookup for display
  const chapterNameLookup = filteredChapters.reduce((acc, ch) => {
    acc[ch.id] = ch.name;
    return acc;
  }, {} as Record<string, string>);

  const handleJoinEvent = async (eventId: string) => {
    if (isJoining) return;
    setJoiningEventId(eventId);
    try {
      await joinUserEvent(eventId).unwrap();
      setJoinedEventIds((prev) => ({ ...prev, [eventId]: true }));
      setActionMessage("Joined event successfully.");
      refetch();
    } catch (error: any) {
      const message = (error && (error.data?.message || error.error || String(error))) || "";
      const msg = String(message);
      const isDuplicate =
        msg.toLowerCase().includes("already joined") ||
        msg.toLowerCase().includes("duplicate") ||
        msg.toLowerCase().includes("e11000");

      if (error?.status === 409 || isDuplicate) {
        setJoinedEventIds((prev) => ({ ...prev, [eventId]: true }));
        setActionMessage("You have already joined this event.");
        refetch();
      } else {
        setActionMessage(msg || "Failed to join event. Please try again.");
        console.error("Join event failed:", error);
      }
    } finally {
      setJoiningEventId(null);
    }
  };

  const handleViewMembers = (eventId: string) => {
    navigate(`/social/admin/upcoming-events/${eventId}/members`);
  };

  // Handle search button click
  const handleSearch = () => {
    setAppliedFromDate(toStartOfDayISO(fromDate)!);
    setAppliedToDate(toEndOfDayISO(toDate)!);
    setAppliedChapter(selectedChapter);
    setAppliedEventType(selectedEventType);
  };

  const chapterOptions = [
    { value: "", label: "Select chapter name" },
    ...filteredChapters.map((ch: SocialChapterItem) => ({ label: ch.name, value: ch.id })),
  ];

  const eventTypeOptions = [
    { value: "", label: "Select event type" },
    { value: "All", label: "All" },
    { value: "Donation", label: "Donation" },
    { value: "Fundraiser", label: "Fundraiser" },
    { value: "Meeting", label: "Meeting" },
  ];

  // Build API query params for upcoming events (using applied filters)
  const queryParams = useMemo(
    () => ({
      from: appliedFromDate || undefined,
      to: appliedToDate || undefined,
      socialChapterId: appliedChapter && appliedChapter !== "" ? appliedChapter : undefined,
      eventType:
        appliedEventType && appliedEventType !== "All"
          ? (appliedEventType.toUpperCase() as "DONATION" | "FUNDRAISER" | "MEETING" | "OTHER")
          : undefined,
      tab: "upcoming" as const,
      page: 1,
      limit: 12,
    }),
    [appliedFromDate, appliedToDate, appliedChapter, appliedEventType]
  );

  const { data, isLoading, refetch } = useGetSocialEventsQuery(queryParams);

  const upcomingEvents: UpcomingEvent[] = useMemo(() => {
    if (!data?.data?.items) return [];

    const formatDate = (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      
      // Use UTC methods to match the detail page
      const day = String(d.getUTCDate()).padStart(2, "0");
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const year = d.getUTCFullYear();
      let hours = d.getUTCHours();
      const minutes = String(d.getUTCMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const hh = String(hours).padStart(2, "0");
      
      return `${day}/${month}/${year} ${hh}:${minutes}${ampm}`;
    };

    const getCategoryColor = (badge: string) => {
      const b = (badge || "").toLowerCase();
      if (b.includes("donation") || b.includes("fundraiser")) return "bg-orange-500";
      if (b.includes("meeting")) return "bg-blue-500";
      return "bg-green-600";
    };

    return data.data.items.map((item) => ({
      id: item.id,
      title: item.title,
      date: formatDate(item.startsAt),
      chapter:
        item.chapterName ||
        (item.chapterId ? chapterNameLookup[item.chapterId] || "Unknown Chapter" : "No Chapter"),
      location: item.location,
      description: item.description,
      category: item.badge,
      categoryColor: getCategoryColor(item.badge),
      joinedCount: item.joinedCount ? `${Math.round(item.joinedCount)} joined` : "",
      imageUrl: item.imageUrl || "",
    }));
  }, [data, chapterNameLookup]);

  return (
    <SocialLayout>
      {/* Page Title */}
      <h1 className="text-xl font-semibold text-white mb-4">Upcoming Events</h1>

      {actionMessage && (
        <div className="mb-4 rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-xs text-gray-200 flex items-start justify-between gap-2">
          <span>{actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-gray-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters Row */}
      <div className="py-1 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">From Date</label>
            <DatePicker value={fromDate} onChange={setFromDate} iconSrc={CalendarIcon} placeholder="09/06/2025" />
          </div>
          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">To Date</label>
            <DatePicker value={toDate} onChange={setToDate} iconSrc={CalendarIcon} placeholder="09/06/2025" />
          </div>
          <FormSelect label="Chapter" options={chapterOptions} value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)} />
          <FormSelect label="Event Type" options={eventTypeOptions} value={selectedEventType} onChange={(e) => setSelectedEventType(e.target.value)} />
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

      {/* Upcoming Events Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : upcomingEvents.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No upcoming events found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {upcomingEvents.map((event) => (
            <div key={event.id} className="h-full">
              <AdminEventCard
                id={event.id}
                title={event.title}
                date={event.date}
                chapter={event.chapter}
                location={event.location}
                description={event.description}
                category={event.category}
                imageUrl={event.imageUrl}
                pageType="upcoming-events"
                joinedCount={event.joinedCount}
                showJoinedCount={!!event.joinedCount}
                onJoin={
                  isJoining || joinedEventIds[event.id] || joiningEventId === event.id
                    ? undefined
                    : handleJoinEvent
                }
                onViewMembers={handleViewMembers}
              />
            </div>
          ))}
        </div>
      )}
    </SocialLayout>
  );
}
