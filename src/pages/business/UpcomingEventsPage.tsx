import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { EventCard } from "../../components/admin";
import { useUpcomingEventsQuery, useEventRsvpMutation } from "../../services/eventsApi";
import { useToast } from "../../components/toast/ToastProvider";

export default function UpcomingEventsPage() {
  const navigate = useNavigate();
  const [userName] = useState("");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Upper bound only. Passing the start of the year as `from` overrode the API's
  // own "from now" default, so every event that had already happened this year
  // was listed on a page titled Upcoming Events. Leaving `from` off keeps that
  // default, and an event drops off the list once it has taken place.
  const currentYear = new Date().getFullYear();
  const toDate = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999)).toISOString();   // YYYY-12-31T23:59:59.999Z

  const { data: upcomingRes, isLoading, error } = useUpcomingEventsQuery({
    page,
    limit: 6,
    search: searchQuery || undefined,
    to: toDate
  });

  // Check authentication
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  // Helper function to format date in DD/MM/YYYY, HH:MM format (24h)
  const formatUTCDateTime = (
    dateString: string
  ): { date: string; time: string } => {
    const date = new Date(dateString);
  
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
  
    let hours = date.getUTCHours();
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // convert 0 -> 12
  
    return {
      date: `${day}/${month}/${year}`,
      time: `${hours}:${minutes} ${ampm}`,
    };
  };
  
  

  const events = useMemo(() => {
    const items = upcomingRes?.data || [];
  
    return items.map((e: any) => {
      const start = e.startsAt ? formatUTCDateTime(e.startsAt) : null;
      const end = e.endsAt ? formatUTCDateTime(e.endsAt) : null;
  
      return {
        id: e.id,
        title: e.title,
        category: e.category || "Event",
        date: start?.date || "",
        startTime: start?.time,
        endTime: end?.time,
        description: e.description || "No description available",
        imageUrl: e.imageUrl || "",
        isFull: e.isFull === true,
        youJoined: e.youJoined === true,
        spotsLeft: typeof e.spotsLeft === "number" ? e.spotsLeft : null,
        raw: e,
      };
    });
  }, [upcomingRes?.data]);
  

  const [rsvp] = useEventRsvpMutation();
  const { showToast } = useToast();
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Join is an advance RSVP against the event's maximum attendance. The server is
  // the authority on capacity, so a 409 here means someone took the last seat
  // between the page loading and the tap - say so rather than failing silently.
  const handleJoin = async (eventId: string) => {
    setJoiningId(eventId);
    try {
      await rsvp({ eventId }).unwrap();
      showToast({ title: "You're going", description: "You've been added to the attendee list.", kind: "success" });
    } catch (err: any) {
      const full = err?.data?.code === "EVENT_FULL" || err?.status === 409;
      showToast({
        title: full ? "This event is full" : "Could not join",
        description: full
          ? "It reached its maximum attendance. No places are left."
          : "Please try again.",
        kind: "error",
      });
    } finally {
      setJoiningId(null);
    }
  };

  const total = upcomingRes?.total ?? 0;
  const pageSize = upcomingRes?.pageSize ?? 6;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleReadMore = (ev: any) => {
    navigate(`/business/upcoming-events/${ev.id}`, { state: { event: ev.raw } });
  };


  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Events" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader breadcrumbs={breadcrumbs} />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 w-full">
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchQuery(searchTerm);
                  setPage(1);
                }
              }}
              className="w-full md:w-80 h-10 px-3 rounded-md bg-[#161b22] border border-gray-700 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-orange-500"
            />
            <button
              type="button"
              onClick={() => {
                setSearchQuery(searchTerm);
                setPage(1);
              }}
              className="h-10 px-5 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              Search
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="text-gray-300">Loading upcoming events...</div>
        )}

        {error && (
          <div className="text-red-400">Failed to load upcoming events</div>
        )}

        {!isLoading && !error && (
          <>
            
              <div className="rounded-2xl p-4 md:p-6">
                {events.length === 0 ? (
                  <div className="text-center text-gray-400 py-10">No upcoming events found.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((ev: any) => (
                      <EventCard
                        // `actualId` is not a field on these rows, so every card
                        // was keyed `undefined`. React then matched siblings by
                        // position, which is how a card could repeat or show the
                        // wrong event after paging or searching.
                        key={ev.id}
                        id={ev.id}
                        title={ev.title}
                        category={ev.category}
                        date={ev.date}
                        startTime={ev.startTime}
                        endTime={ev.endTime}
                        description={ev.description}
                        imageUrl={ev.imageUrl}
                        onReadMore={() => handleReadMore(ev)}
                        onJoin={() => handleJoin(String(ev.id))}
                        isFull={ev.isFull}
                        youJoined={ev.youJoined}
                        spotsLeft={ev.spotsLeft}
                        joining={joiningId === String(ev.id)}
                      
                      />
                    ))}
                  </div>
                )}
              </div>
            

            <div className="mt-6 flex items-center justify-between">
              <div className="text-gray-300 text-sm">
                Page {page} of {totalPages} {total ? `(Total: ${total})` : ""}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="h-9 px-4 rounded-md border border-gray-600 text-gray-200 disabled:opacity-50 hover:bg-gray-700"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="h-9 px-4 rounded-md border border-gray-600 text-gray-200 disabled:opacity-50 hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
