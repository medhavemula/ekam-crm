import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SocialLayout } from "../../../components/social";
import DatePicker from "../../../components/common/DatePicker";
import { FormSelect } from "../../../components/forms";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import GradientContainer from "../../../components/common/GradientContainer";
import { StatCard } from "../../../components/dashboard";
import { useGetSocialEventsQuery } from "../../../services/social/socialAdminDashboardApi";
import { useGetSocialRegionalBoardQuery } from "../../../services/social";
import type { SocialChapterItem } from "../../../services/social/types";
import { AdminEventCard } from "../../../components/admin";
import { getFirstDayOfMonth, getLastDayOfMonth, toStartOfDayISO, toEndOfDayISO } from "../../../utils/date";

interface MyEvent {
  id: string;
  title: string;
  date: string;
  chapter: string;
  location: string;
  description: string;
  category: string;
  imageUrl: string;
}

export default function SocialAdminMyEvents() {
  const navigate = useNavigate();
  // Initialize with "this month" date range
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getLastDayOfMonth());

  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");

  // Applied filters (only updated on Search button click)
  const [appliedFromDate, setAppliedFromDate] = useState(toStartOfDayISO(getFirstDayOfMonth())!);
  const [appliedToDate, setAppliedToDate] = useState(toEndOfDayISO(getLastDayOfMonth())!);
  const [appliedChapter, setAppliedChapter] = useState("");
  const [appliedEventType, setAppliedEventType] = useState("");
  
  const { data: chaptersRes } = useGetSocialRegionalBoardQuery({});
  const chapters: SocialChapterItem[] = chaptersRes?.data?.items || [];
  const filteredChapters = chapters;
  
  const chapterOptions = filteredChapters.map((ch: SocialChapterItem) => ({ label: ch.name, value: ch.id }));

  const eventTypeOptions = [
    { value: "", label: "Select event type" },
    { value: "All", label: "All" },
    { value: "Donation", label: "Donation" },
    { value: "Fundraiser", label: "Fundraiser" },
    { value: "Meeting", label: "Meeting" },
  ];

  // Apply filters only on Search
  const handleSearch = useCallback(() => {
    setAppliedFromDate(toStartOfDayISO(fromDate)!);
    setAppliedToDate(toEndOfDayISO(toDate)!);
    setAppliedChapter(selectedChapter);
    setAppliedEventType(selectedEventType);
  }, [fromDate, toDate, selectedChapter, selectedEventType]);
  
  // Build API query params for "My Events" (events created by current user)
  const queryParams = useMemo(
    () => ({
      from: appliedFromDate || undefined,
      to: appliedToDate || undefined,
      socialChapterId: appliedChapter || undefined,
      eventType:
        appliedEventType && appliedEventType !== "All"
          ? (appliedEventType.toUpperCase() as "DONATION" | "FUNDRAISER" | "MEETING" | "OTHER")
          : undefined,
      tab: "mine" as const,
      page: 1,
      limit: 12,
    }),
    [appliedFromDate, appliedToDate, appliedChapter, appliedEventType]
  );

  const { data, isLoading } = useGetSocialEventsQuery(queryParams);

  // Stats from API (fallback to 0 if missing)
  const stats = useMemo(() => {
    const kpis = data?.data?.kpis;
    return [
      {
        title: "No of Events",
        value: String(kpis?.noOfEvents ?? 0),
        icon: "dot-calender" as const,
      },
      {
        title: "No of Attended Events",
        value: String(kpis?.noOfAttendedEvents ?? 0),
        icon: "tick-calender" as const,
      },
      {
        title: "Total Funds Donated",
        value: `₹ ${(kpis?.totalFundsDonated ?? 0).toLocaleString("en-IN")}`,
        icon: "funds-donated" as const,
      },
      {
        title: "Total Funds Raised",
        value: `₹ ${(kpis?.totalFundsRaised ?? 0).toLocaleString("en-IN")}`,
        icon: "users" as const,
      },
    ];
  }, [data]);

  const myEvents: MyEvent[] = useMemo(() => {
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

    return data.data.items.map((item) => ({
      id: item.id,
      title: item.title,
      date: formatDate(item.startsAt),
      chapter: item.chapterName || "Social Chapter",
      location: item.location,
      description: item.description,
      category: item.badge,
      imageUrl: item.imageUrl || "",
    }));
  }, [data]);

  return (
    <SocialLayout>
      {/* Filters Row with Add Event button */}
      <div className="py-1 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">From Date</label>
            <DatePicker value={fromDate} onChange={setFromDate} iconSrc={CalendarIcon} placeholder="09/06/2025" />
          </div>
          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">To Date</label>
            <DatePicker value={toDate} onChange={setToDate} iconSrc={CalendarIcon} placeholder="09/06/2025" />
          </div>
          <FormSelect 
            label="Chapter" 
            options={[{ value: "", label: "Select chapter name" }, ...chapterOptions]} 
            value={selectedChapter} 
            onChange={(e) => setSelectedChapter(e.target.value)} 
          />
          <FormSelect label="Event Type" options={eventTypeOptions} value={selectedEventType} onChange={(e) => setSelectedEventType(e.target.value)} />
          <div className="flex items-end">
            <button 
              onClick={handleSearch}
              className="w-full bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            >
              Search
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => navigate("/social/admin/add-event")}
              className="w-full bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            >
              Add Event +
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid - 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <GradientContainer key={stat.title}>
            <StatCard title={stat.title} value={stat.value} icon={stat.icon} />
          </GradientContainer>
        ))}
      </div>

      {/* My Events Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : myEvents.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No events found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {myEvents.map((event) => (
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
                pageType="my-events"
              />
            </div>
          ))}
        </div>
      )}
    </SocialLayout>
  );
}
