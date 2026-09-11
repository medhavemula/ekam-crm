import React, { useState } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import { PageHeader } from "../../../components/common/PageHeader";
import { EventCard } from "../../../components/admin";
import { useGetEdEventsQuery } from "../../../services/ed/edEventsApi";
import { useGetSaEventsQuery } from "../../../services/admin/saEventsApi";
import { useRole } from "../../../hooks/useRole";
import { toStartOfDayISO, toEndOfDayISO } from "../../../utils/date";
import { useAppSelector } from "../../../app/store";
import { FormInput } from "../../../components/forms";

export const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useRole();
  const authUser = useAppSelector((s) => s.auth.user as any);
  const routeState = location.state as { chapterId?: string } | null;
  const [page, setPage] = useState(1);
  const [limit] = useState(21);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const isSearching = Boolean(activeSearch.trim());



  // Default date range: current year
  const now = new Date();
  const year = now.getFullYear();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  // Convert to ISO format for API calls
  const fromISO = toStartOfDayISO(from) || '';
  const toISO = toEndOfDayISO(to) || '';

  // Fetch events based on role: SUPER_ADMIN and SUPER_ADMIN_TEAM use SA API, others use ED API
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'SUPER_ADMIN_TEAM';
  const edQuery = useGetEdEventsQuery({ page, limit, from: fromISO, to: toISO, ...(activeSearch.trim() ? { search: activeSearch.trim() } : {}) }, { skip: isSuperAdmin });
  const saQuery = useGetSaEventsQuery({ page, limit, from: fromISO, to: toISO, ...(activeSearch.trim() ? { search: activeSearch.trim() } : {}) }, { skip: !isSuperAdmin });
  const data = isSuperAdmin ? saQuery.data : edQuery.data;
  const isLoading = isSuperAdmin ? saQuery.isLoading : edQuery.isLoading;
  const error = isSuperAdmin ? saQuery.error : edQuery.error;

  // Map API events to card-friendly data
  // const toDate = (iso?: string) => {
  //   if (!iso) return "";
  //   const d = new Date(iso);
  //   // Use UTC methods to show the original UTC date
  //   const dd = String(d.getUTCDate()).padStart(2, "0");
  //   const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  //   const yyyy = d.getUTCFullYear();
  //   return `${dd}/${mm}/${yyyy}`;
  // };
  // const toTime = (iso?: string) => {
  //   if (!iso) return "";
  //   const d = new Date(iso);
  //   // Use UTC methods to show the original UTC time in 12-hour format
  //   let hh = d.getUTCHours();
  //   const mm = String(d.getUTCMinutes()).padStart(2, "0");
  //   const ampm = hh >= 12 ? 'PM' : 'AM';
  //   hh = hh % 12;
  //   hh = hh || 12; // 0 should be 12
  //   return `${hh}:${mm} ${ampm}`;
  // };

  // Normalize list payload across ED and SA variants
  const dataAny = data as any;
  const rawItems: any[] =
    (Array.isArray(dataAny?.data) && dataAny?.data) ||
    dataAny?.data?.items ||
    dataAny?.data?.events ||
    dataAny?.items ||
    dataAny?.events ||
    [];
  const total: number =
    dataAny?.data?.total ??
    dataAny?.total ??
    (Array.isArray(rawItems) ? rawItems.length : 0);
  const apiPage = dataAny?.data?.page ?? dataAny?.page ?? page;
  const apiLimit = dataAny?.data?.limit ?? dataAny?.limit ?? dataAny?.pageSize ?? limit;
  const totalPages = Math.max(1, Math.ceil((total || 0) / Math.max(1, apiLimit)));

  const toAbsolute = (u?: string) => {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    try { return `${window.location.origin}${u.startsWith('/') ? '' : '/'}${u}`; } catch { return u; }
  };

  const currentUserId = authUser?._id ? String(authUser._id) : authUser?.id ? String(authUser.id) : null;
  const isEdOrRegionalRole = [
    "EXECUTIVE_DIRECTOR",
    "ED_TEAM",
    "REGIONAL_DIRECTOR",
    "ASSISTANT_REGIONAL_DIRECTOR",
  ].includes(role as any);
  
  const parseDateTime = (iso?: string) => {
    if (!iso) return null;
  
    const d = new Date(iso);
  
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
  
    let hh = d.getUTCHours();
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    const ampm = hh >= 12 ? "PM" : "AM";
    hh = hh % 12 || 12;
  
    return {
      date: `${dd}/${mm}/${yyyy}`,
      time: `${hh}:${min} ${ampm}`,
    };
  };
  

 const events = rawItems.map((e: any, idx: number) => {
  const actualId = e.id ?? e.eventId ?? e._id ?? String(idx + 1);

  const createdBy = e.createdBy ? String(e.createdBy) : null;
  const isCreator =
    createdBy && currentUserId && createdBy === currentUserId;

  const canEdit = Boolean(
    actualId &&
      (
        // Super Admins can edit all
        isSuperAdmin ||
        // ED / Regional roles should be able to edit events they manage (not only those they created)
        isEdOrRegionalRole ||
        // Fallback: allow creator edit if role mapping changes
        isCreator
      ),
  );

  const start = parseDateTime(
    e.startDate || e.startsAt || e.date || e.createdAt
  );

  const end = parseDateTime(
    e.endDate || e.endsAt
  );

  return {
    id: idx + 1,
    actualId,
    title: e.title ?? e.name ?? "",
    category: e.eventType || e.category || "",
    date: start?.date ?? "",
    startTime: start?.time ?? "",
    endTime: end?.time ?? "",
    description: e.description ?? "",
    imageUrl: toAbsolute(
      e.bannerUrl ||
        e.banner_url ||
        (e.banner && (e.banner.url || e.banner.imageUrl)) ||
        e.imageUrl ||
        e.coverUrl ||
        ""
    ),
    canEdit,
  };
});

  const filteredEvents = events;

  const handleCreateEvent = () => {
    navigate("/admin/events/create");
  };

  const handleReadMore = (actualId: string | number) => {
    navigate(`/admin/events/${actualId}`);
  };

  const handleEdit = (actualId: string | number) => {
    navigate(`/admin/events/edit/${actualId}`);
  };
  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveSearch("");
  };

  const handleSearch = () => {
    setActiveSearch(searchQuery);
    setPage(1); // Reset to first page when searching
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  const isFirstPage = apiPage <= 1;
  const isLastPage = apiPage >= totalPages || events.length < apiLimit;
  const chapterDetailsPath = routeState?.chapterId
    ? `/admin/regional-board/chapter/${routeState.chapterId}`
    : null;
  const breadcrumbs = chapterDetailsPath
    ? [
        { label: "Regional Board", onClick: () => navigate(chapterDetailsPath) },
        { label: "Chapter Details", onClick: () => navigate(chapterDetailsPath) },
        { label: "Events" },
      ]
    : [
        ...(role === 'EXECUTIVE_DIRECTOR' || role === 'ED_TEAM' ? [
          { label: "Business", onClick: () => navigate("/dashboard") },
          { label: "Events" },
        ] : [
          { label: "Events" }
        ]),
      ];

  return (
    <div className={`${ADMIN_THEME} min-h-screen`}
      style={{ background: "var(--ov-floor)" }}>
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12 text-[var(--ov-ink)]">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4">Loading events...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-[var(--ov-danger-wash)] border border-[color:var(--ov-danger)] text-[var(--ov-danger)] px-4 py-3 rounded-lg mb-6">
            Failed to load events. Please try again.
          </div>
        )}

        {/* Header with Breadcrumbs and Create Button */}
        {!isLoading && (
          <>
            <div className="flex items-center justify-between mb-6">
              <PageHeader breadcrumbs={breadcrumbs} />
              <div>
                <button
                  onClick={handleCreateEvent}
                  className="h-10 px-6 rounded-md bg-[var(--ov-ember-fill)] hover:bg-[var(--ov-ember-fill-hover)] text-[var(--ov-on-ember)] font-medium transition-colors"
                >
                  Create Event +
                </button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="mb-6 ">
              <div className="flex gap-3 max-w-2xl">
                <div className="relative flex-1">
                  <FormInput
                    label="Search Events"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Search by title..."
                    className="pl-10"
                  />
                  <svg
                    className="absolute left-3 bottom-2.5 w-5 h-5 text-[var(--ov-ink-4)] pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 bottom-2.5 text-[var(--ov-ink-4)] hover:text-[var(--ov-ink)] transition-colors"
                      type="button"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSearch}
                    disabled={!searchQuery.trim()}
                    className="h-11 px-6 rounded-md bg-[var(--ov-ember-fill)] hover:bg-[var(--ov-ember-fill-hover)] text-[var(--ov-on-ember)] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Search
                  </button>
                </div>
              </div>
              {activeSearch && (
                <p className="mt-2 text-sm text-[var(--ov-ink-4)]">
                  Found {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} for "{activeSearch}"
                </p>
              )}
            </div>


            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.length === 0 && (
                <div className="col-span-full text-center text-[var(--ov-ink-4)] py-10">
                  No events found.
                </div>
              )}

              {filteredEvents.map((event) => (
                <EventCard
                  key={event.actualId}
                  id={event.id}
                  title={event.title}
                  category={event.category}
                  date={event.date}
                  startTime={event.startTime}
                  endTime={event.endTime}
                  description={event.description}
                  imageUrl={event.imageUrl}
                  onReadMore={() => handleReadMore(event.actualId)}
                  onEdit={event.canEdit ? () => handleEdit(event.actualId) : undefined}
                />
              ))}
            </div>

            {/* Pagination (OUTSIDE grid) */}
            {/* Pagination */}
            {!isSearching && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-[var(--ov-ink-2)] text-sm">
                  Page {apiPage} of {totalPages} {total ? `(Total: ${total})` : ""}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={isFirstPage || isLoading}
                    className="h-9 px-4 rounded-md border border-[color:var(--ov-line-strong)] text-[var(--ov-ink-2)] disabled:opacity-50 hover:bg-[var(--ov-fill-hover)]"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={isLastPage || isLoading}
                    className="h-9 px-4 rounded-md border border-[color:var(--ov-line-strong)] text-[var(--ov-ink-2)] disabled:opacity-50 hover:bg-[var(--ov-fill-hover)]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}


          </>
        )}
      </main>
    </div>
  );
};

export default EventsPage;
