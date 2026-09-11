import { useState, useMemo } from "react";
import { SocialLayout } from "../../../components/social";
import DatePicker from "../../../components/common/DatePicker";
import { FormSelect } from "../../../components/forms";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import ConfirmationModal from "../../../components/common/ConfirmationModal";
import {
  useGetSocialEventsQuery,
  useApproveSocialEventMutation,
  useRejectSocialEventMutation,
} from "../../../services/social/socialAdminDashboardApi";
import { useListSocialChaptersQuery } from "../../../services/publicApi";
import { AdminEventCard } from "../../../components/admin";
import { getFirstDayOfMonth, getLastDayOfMonth, toStartOfDayISO, toEndOfDayISO } from "../../../utils/date";

export default function SocialAdminEventsRequest() {
  // Initialize with "this month" date range
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getLastDayOfMonth());
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchParams, setSearchParams] = useState<{ from?: string; to?: string; approvalStatus?: string }>({
    from: toStartOfDayISO(getFirstDayOfMonth()),
    to: toEndOfDayISO(getLastDayOfMonth()),
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"accept" | "reject">("accept");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { data: chaptersRes } = useListSocialChaptersQuery();
  const chapters = chaptersRes?.data || [];

  const filteredChapters = chapters;

  // Create chapter name lookup for display
  const chapterNameLookup = filteredChapters.reduce((acc, ch) => {
    acc[ch.id] = ch.name;
    return acc;
  }, {} as Record<string, string>);

  // API queries and mutations - use "requests" tab so backend applies approval workflow
  const { data, isLoading, refetch } = useGetSocialEventsQuery({
    from: searchParams?.from,
    to: searchParams?.to,
    tab: "requests",
    approvalStatus: searchParams?.approvalStatus,
    limit: 50,
  });

  const [approveEvent, { isLoading: isApproving }] = useApproveSocialEventMutation();
  const [rejectEvent, { isLoading: isRejecting }] = useRejectSocialEventMutation();

  const handleAcceptEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setModalType("accept");
    setModalOpen(true);
  };

  const handleRejectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setModalType("reject");
    setModalOpen(true);
  };

  // Transform API data to display format
  const events = useMemo(() => {
    if (!data?.data?.items) return [];
    return data.data.items.map((item) => ({
      id: item.id,
      title: item.title,
      date: (() => {
        const d = new Date(item.startsAt);
        const day = String(d.getUTCDate()).padStart(2, "0");
        const month = String(d.getUTCMonth() + 1).padStart(2, "0");
        const year = d.getUTCFullYear();
        let hours = d.getUTCHours();
        const minutes = String(d.getUTCMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        const hh = String(hours).padStart(2, "0");
        return `${day}/${month}/${year} ${hh}:${minutes} ${ampm}`;
      })(),
      chapter: item.chapterId ? chapterNameLookup[item.chapterId] || "Unknown Chapter" : "No Chapter",
      location: item.location || "India",
      description: item.description || "",
      category: item.badge || "Event",
      categoryColor: item.badge === "DONATION" ? "bg-orange-500" : "bg-green-600",
      status:
        item.approvalStatus === "APPROVED"
          ? "accepted"
          : item.approvalStatus === "REJECTED"
            ? "rejected"
            : "pending",
      imageUrl: item.imageUrl || "",
    }));
  }, [data, chapterNameLookup]);

  const statusOptions = [
    { value: "", label: "Select status" },
    { value: "pending", label: "Pending" },
    { value: "accepted", label: "Accepted" },
    { value: "rejected", label: "Rejected" },
  ];

  const handleSearch = () => {
    let approvalStatus: string | undefined;
    if (selectedStatus === "pending") approvalStatus = "PENDING";
    else if (selectedStatus === "accepted") approvalStatus = "APPROVED";
    else if (selectedStatus === "rejected") approvalStatus = "REJECTED";

    setSearchParams({
      from: toStartOfDayISO(fromDate) || undefined,
      to: toEndOfDayISO(toDate) || undefined,
      approvalStatus,
    });
    // Clear any previous action messages when searching
    setActionMessage(null);
  };

  const handleConfirm = async () => {
    if (!selectedEventId) {
      setModalOpen(false);
      return;
    }

    try {
      if (modalType === "accept") {
        await approveEvent({ id: selectedEventId }).unwrap();
        setActionMessage("Event approved successfully.");
      } else {
        await rejectEvent({ id: selectedEventId }).unwrap();
        setActionMessage("Event rejected successfully.");
      }
      await refetch();
    } catch (error: any) {
      // Show a simple user-facing error so it doesn't fail silently
      const message =
        (error && (error.data?.message || error.error || String(error))) ||
        "Failed to update event. Please try again or check your permissions.";
      setActionMessage(message);
      console.error("Failed to update event:", error);
    } finally {
      setModalOpen(false);
      setSelectedEventId(null);
    }
  };

  // No need for frontend filtering since API handles it via searchParams
  const filteredEvents = events;

  return (
    <SocialLayout>
      {/* Page Title */}
      <h1 className="text-xl font-semibold text-white mb-4">Events Request</h1>

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
          <FormSelect label="Status" options={statusOptions} value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} />
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        type={modalType}
      />

      {/* Simple feedback banner */}
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

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Event Request Cards Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
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
                  status={event.status as "pending" | "accepted" | "rejected"}
                  pageType="event-requests"
                  onAccept={handleAcceptEvent}
                  onReject={handleRejectEvent}
                  isAccepting={isApproving}
                  isRejecting={isRejecting}
                />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-400">
              <p className="text-lg mb-2">No event requests found</p>
              <p className="text-sm">Try adjusting the filters.</p>
            </div>
          )}
        </div>
      )}
    </SocialLayout>
  );
}
