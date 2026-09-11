import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "../../components/common/DatePicker";
import { SocialLayout } from "../../components/social";
import CalendarIcon from "../../assets/icons/calendar.svg";
import GradientContainer from "../../components/common/GradientContainer";
import { useGetUserSocialEventsQuery } from "../../services/social";
import { getFirstDayOfMonth, getLastDayOfMonth } from "../../utils/date";

interface EventItem {
  id: string;
  title: string;
  dateTime: string;
  chapter: string;
  location: string;
  category: string;
  imageUrl: string;
}

interface DateGroup {
  day: string;
  date: string;
  dayName: string;
  events: EventItem[];
}

export default function AllEvents() {
  const navigate = useNavigate();
  
  // UI state for date pickers
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getLastDayOfMonth());
  const [selectedEventType, setSelectedEventType] = useState("");
  
  // Applied filter state
  const [appliedFromDate, setAppliedFromDate] = useState(getFirstDayOfMonth());
  const [appliedToDate, setAppliedToDate] = useState(getLastDayOfMonth());
  const [appliedEventType, setAppliedEventType] = useState("");
  
  const eventTypeOptions = [
    { value: "", label: "Select event type" },
    { value: "All", label: "All" },
    { value: "Donation", label: "Donation" },
    { value: "Fundraiser", label: "Fundraiser" },
    { value: "Meeting", label: "Meeting" },
  ];
  
  const handleSearch = () => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setAppliedEventType(selectedEventType);
  };
  
  const queryParams = React.useMemo(
    () => ({
      from: appliedFromDate ? `${appliedFromDate.slice(0, 10)}T00:00:00` : undefined,
      to: appliedToDate ? `${appliedToDate.slice(0, 10)}T23:59:59` : undefined,
      eventType:
        appliedEventType && appliedEventType !== "All"
          ? (appliedEventType.toUpperCase() as any)
          : undefined,
      tab: "all" as const,
      page: 1,
      limit: 50,
    }),
    [appliedFromDate, appliedToDate, appliedEventType]
  );
  
  const { data, isLoading } = useGetUserSocialEventsQuery(queryParams);
  
  // Group events by date
  const dateGroups: DateGroup[] = React.useMemo(() => {
    if (!data?.data?.items) return [];
    
    const groups: Record<string, DateGroup> = {};
    
    data.data.items.forEach((item: any) => {
      const start = new Date(item.startsAt);
      if (Number.isNaN(start.getTime())) return;
      
      // Get day, month, and day name for grouping (use UTC methods)
      const day = String(start.getUTCDate()).padStart(2, "0");
      const monthShort = start.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
      const dayName = start.toLocaleString("en-US", { weekday: "short", timeZone: "UTC" });
      
      // Format the full dateTime using UTC
      const month = String(start.getUTCMonth() + 1).padStart(2, "0");
      const year = start.getUTCFullYear();
      let hours = start.getUTCHours();
      const minutes = String(start.getUTCMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const hh = String(hours).padStart(2, "0");
      const startStr = `${day}/${month}/${year} ${hh}:${minutes} ${ampm}`;
      
      const location = item.location || "";
      const chapter = item.chapterName || "Social Chapter";
      
      const key = `${start.getUTCFullYear()}-${monthShort}-${day}`;
      if (!groups[key]) {
        groups[key] = { day, date: monthShort, dayName, events: [] };
      }
      
      groups[key].events.push({
        id: item.id,
        title: item.title,
        dateTime: startStr,
        chapter,
        location,
        category: item.badge || "event",
        imageUrl: item.imageUrl,
      });
    });
    
    return Object.values(groups).sort((a, b) => Number(a.day) - Number(b.day));
  }, [data]);
  
  return (
    <SocialLayout>
      {/* Filters Row */}
      <div className="py-1 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">From Date</label>
            <DatePicker value={fromDate} onChange={setFromDate} iconSrc={CalendarIcon} placeholder="09/06/2025" />
          </div>
          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">To Date</label>
            <DatePicker value={toDate} onChange={setToDate} iconSrc={CalendarIcon} placeholder="09/06/2025" />
          </div>
          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">Event Type</label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full h-10 bg-[#1e2630] border border-gray-600 rounded-lg px-3 text-white text-sm focus:outline-none focus:border-[#D85D27]"
            >
              {eventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
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

      {/* Date grouped events list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : dateGroups.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No events found.</div>
      ) : (
        <div className="space-y-4">
          {dateGroups.map((group) => (
            <div key={`${group.date}-${group.day}`} className="flex gap-4 items-stretch">
              {/* Date container column */}
              <div className="flex-shrink-0 w-16">
                <div className="h-full rounded-lg bg-[#1e2630] flex flex-col items-center pt-2 pb-4">
                  {/* Date badge at top - calendar style */}
                  <div className="w-14 rounded-lg overflow-hidden shadow-lg shadow-[#D85D27]/30 bg-white">
                    {/* Month header */}
                    <div className="bg-[#D85D27] px-2 py-1 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold uppercase truncate">{group.date}</span>
                    </div>
                    {/* Day + weekday */}
                    <div className="px-2 py-1.5 flex flex-col items-center justify-center bg-white">
                      <span className="text-[#D85D27] text-xl font-bold leading-none">{group.day}</span>
                      <span className="text-gray-800 text-xs mt-1 leading-none">{group.dayName}</span>
                    </div>
                  </div>
                  {/* Spacer to push container height */}
                  <div className="flex-1" />
                </div>
              </div>

              {/* Events list */}
              <div className="flex-1 space-y-2">
                {group.events.map((event) => (
                  <GradientContainer key={event.id} className="p-0">
                    <div
                      className="flex items-center gap-4 p-3 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => {
                        navigate(`/social/event-details/${event.id}`, {
                          state: { from: "all-events" },
                        });
                      }}
                    >
                      {/* Event image */}
                      <div className="flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-gradient-to-br from-[#2B2B2B] to-[#111722]">
                        {event.imageUrl ? (
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-white/50 text-[10px] font-medium uppercase tracking-wider text-center px-1">
                              {event.category || "Event"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Event details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium text-sm mb-1">{event.title}</h3>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {event.dateTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            {event.chapter}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                            {event.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  </GradientContainer>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SocialLayout>
  );
}
