
import React, { useState } from "react";
import GradientContainer from "../../components/common/GradientContainer";
import FilterSection from "../../components/common/FilterSection";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import TableControls from "../../components/common/TableControls";
import DataTable, { type TableColumn } from "../../components/common/DataTable";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import { useListMeetingsQuery, useGetNextMeetingQuery, useTransitionMeetingStatusMutation } from "../../services/meetingsApi";
import { useMeQuery } from "../../services/authApi";
import { useRole } from "../../hooks/useRole";

interface MeetingRecord {
  id: string;
  meetingDate: string;
  enteredBy: string;
  enteredDate: string;
  status: string;
  mode?: string;
  date: Date;
  isPastAndDraft?: boolean;
}

// Table columns configuration
const meetingsColumns: TableColumn[] = [
  { key: "meetingDate", label: "Meeting Date", sortable: true, searchable: false },
  { key: "status", label: "Status", sortable: true, searchable: false },
];


export default function MeetingsPage() {
  const navigate = useNavigate();
  const { role } = useRole();
  const [userName, setUserName] = useState("");
  // Default to last 6 months from current date
  const firstDayOfMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5); // Go back 5 months to get 6 months total
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  };
  const lastDayOfMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const last = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  };
  // Pending search term (what user types)
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");

  // Applied filters (what gets sent to API)
  const [fromDate, setFromDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(lastDayOfMonth());
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});
  const [page, setPage] = useState(1);
  const [filtersInitializedFromNextMeeting, setFiltersInitializedFromNextMeeting] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState<{ isOpen: boolean; meetingId: string | null }>({ isOpen: false, meetingId: null });

  // Fetch current user
  const { data: meRes, error: meError } = useMeQuery();

  // Fetch meetings (server-side paging + global search)
  const { data: meetingsRes, isLoading, error: meetingsError } = useListMeetingsQuery({
    from: fromDate ? `${fromDate}T00:00:00` : undefined,
    to: endDate ? `${endDate}T23:59:59` : undefined,
    page,
    limit: entriesPerPage,
    search: searchTerm || undefined,
  });

  // Fetch next meeting independently (not affected by date filters)
  const { data: nextMeetingRes } = useGetNextMeetingQuery();

  // Status update mutation
  const [updateMeetingStatus, { isLoading: isUpdatingStatus }] = useTransitionMeetingStatusMutation();

  // Reset page when entries changes
  React.useEffect(() => {
    setPage(1);
  }, [entriesPerPage]);

  // Debounced search effect - auto-apply search after user stops typing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(pendingSearchTerm);
      setPage(1);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [pendingSearchTerm]);

  // Check authentication
  React.useEffect(() => {
    const err = meError as any;
    if (err && typeof err === "object" && "status" in err && err.status === 401) {
      navigate("/login");
    }
  }, [meError, navigate]);

  // Update navbar name when available
  React.useEffect(() => {
    const name = meRes?.data?.name;
    if (name) setUserName(name);
  }, [meRes]);

  // Transform API data to table format with full date objects for filtering
  const meetingsData = meetingsRes?.data || [];
  const meetings: (MeetingRecord & { date: Date })[] = meetingsData.map((meeting) => {
    const meetingDate = new Date(meeting.date);
    const now = new Date();
    const isPastAndDraft = meeting.status === 'DRAFT' && meetingDate < now;

    return {
      id: meeting.id,
      meetingDate: meetingDate.toLocaleDateString("en-GB"),
      enteredBy: meeting.enteredBy?.name || "N/A",
      enteredDate: meeting.enteredAt ? new Date(meeting.enteredAt).toLocaleDateString("en-GB") : "N/A",
      status: meeting.status,
      date: meetingDate,
      isPastAndDraft
    };
  });

  // Get next meeting from the independent API call (not affected by filters)
  const nextMeeting = nextMeetingRes?.data || null;

  // Parse nextMeeting.date as a pure calendar date (YYYY-MM-DD) to avoid timezone shifts
  let nextMeetingDate: Date | null = null;
  if (nextMeeting && (nextMeeting as any).date) {
    const rawDate = String((nextMeeting as any).date);
    const datePart = rawDate.split("T")[0] || rawDate;
    const [y, m, d] = datePart.split("-");
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);

    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      nextMeetingDate = new Date(year, month - 1, day);
    } else {
      const parsed = new Date(rawDate);
      nextMeetingDate = Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  // Prefer explicit time fields from API, fall back to Date time
  const rawNextMeetingTime =
    nextMeeting &&
    ((nextMeeting as any).startTime ||
      (nextMeeting as any).start_time ||
      (nextMeeting as any).time ||
      null);

  const nextMeetingTimeLabel = rawNextMeetingTime
    ? String(rawNextMeetingTime)
    : nextMeetingDate
      ? nextMeetingDate.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      : "";

  // Mode label (Meeting: In Person / Online / Hybrid ...)
  const rawNextMeetingMode =
    nextMeeting &&
    ((nextMeeting as any).mode || (nextMeeting as any).meetingMode || null);

  const nextMeetingModeLabel = (() => {
    if (!rawNextMeetingMode) return "";
    const v = String(rawNextMeetingMode).toUpperCase();
    if (v === "IN_PERSON") return "In Person";
    if (v === "ONLINE") return "Online";
    if (v === "HYBRID") return "Hybrid";
    return String(rawNextMeetingMode);
  })();

  // Location label from chapter city/region
  const chapterCity = nextMeeting
    ? (nextMeeting as any).chapterCity ||
    (nextMeeting as any).chapter_city ||
    (nextMeeting as any).chapter?.city ||
    ""
    : "";

  const chapterRegion = nextMeeting
    ? (nextMeeting as any).chapterRegion ||
    (nextMeeting as any).chapter_region ||
    (nextMeeting as any).chapter?.regionName ||
    (nextMeeting as any).chapter?.region?.name ||
    ""
    : "";

  const nextMeetingLocationLabel = [chapterCity, chapterRegion]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(", ");

  // When nextMeetingDate is known, initialize filters to last 3 months up to nextMeetingDate
  React.useEffect(() => {
    if (!nextMeetingDate || filtersInitializedFromNextMeeting) return;

    const end = new Date(nextMeetingDate.getFullYear(), nextMeetingDate.getMonth(), nextMeetingDate.getDate());
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    start.setMonth(start.getMonth() - 3);

    const formatForFilter = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const newFrom = formatForFilter(start);
    const newTo = formatForFilter(end);

    setFromDate(newFrom);
    setEndDate(newTo);
    setPage(1);
    setFiltersInitializedFromNextMeeting(true);
  }, [nextMeetingDate, filtersInitializedFromNextMeeting]);

  const handleColumnSearchChange = (key: string, value: string) => {
    setColumnSearches({ ...columnSearches, [key]: value });
  };

  const handleRowClick = (meeting: MeetingRecord) => {
    // Navigate to meeting details with meeting ID and status
    navigate(`/business/meetings/${meeting.id}`);
  };

  const handleCompleteMeeting = async (meetingId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click
    setConfirmationModal({ isOpen: true, meetingId });
  };

  const handleConfirmComplete = async () => {
    if (!confirmationModal.meetingId) return;

    try {
      await updateMeetingStatus({ meetingId: confirmationModal.meetingId, action: 'COMPLETE' }).unwrap();
      // Success - the RTK query will automatically refetch the data
    } catch (error) {
      console.error('Failed to complete meeting:', error);
      // You could add a toast notification here
    } finally {
      setConfirmationModal({ isOpen: false, meetingId: null });
    }
  };

  const handleCloseConfirmation = () => {
    setConfirmationModal({ isOpen: false, meetingId: null });
  };

  // Custom cell renderer for status column
  const renderStatusCell = (column: TableColumn, row: any) => {
    if (column.key === 'status' && row.isPastAndDraft && role !== 'USER') {
      return (
        <div className="flex items-center gap-20">
          <span className="text-white">{row.status}</span>
          <button
            onClick={(e) => handleCompleteMeeting(row.id, e)}
            disabled={isUpdatingStatus}
            className="bg-[#D85D27] hover:bg-[#B84E21] text-white text-sm px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdatingStatus ? 'Completing...' : 'Complete Meeting Manually'}
          </button>
        </div>
      );
    }
    return String(row[column.key] ?? "");
  };

  // Apply column-level search on current page
  const filteredData = meetings.filter((record) => {
    const matchesColumnSearch = meetingsColumns.every((column) => {
      const searchValue = columnSearches[column.key];
      if (!searchValue) return true;
      return String(record[column.key as keyof MeetingRecord])
        .toLowerCase()
        .includes(searchValue.toLowerCase());
    });

    return matchesColumnSearch;
  });

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Meetings" },
  ];

  const formatCurrency = (value: number) => {
  return `₹${value.toFixed(0)}`;
};

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* Next Meeting Card - At the top with GradientContainer */}
        <GradientContainer className="mb-6">
          <div className="rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#D85D27] p-4">
              <h3 className="text-lg font-semibold text-white">Next Meeting Details</h3>
            </div>

            {/* Content */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 text-white">
              {nextMeeting ? (
                <>
                  {/* Date & Time */}
                  <div className="mb-3">
                    <div className="text-lg text-orange-500">
                      {nextMeetingDate
                        ? nextMeetingDate.toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                        : ""}
                      {nextMeetingTimeLabel ? `, ${nextMeetingTimeLabel}` : ""}
                    </div>
                  </div>

                  {/* Meeting Info */}
                  <div className="space-y-1">
                    {nextMeetingModeLabel && (
                      <div className="text-base">
                        <span className="text-white/80">Meeting: </span>
                        <span>{nextMeetingModeLabel}</span>
                      </div>
                    )}
                    {nextMeetingLocationLabel && (
                      <div className="text-base">
                        <span>{nextMeetingLocationLabel}</span>
                      </div>
                    )}
                  </div>

                  {/* Statistics Row */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 mt-5">
                    <div className="text-center pr-4">
                      <div className="text-gray-400 text-sm mb-1">Total Members</div>
                      <div className="text-white text-xl font-bold">{(nextMeeting as any).members || 0}</div>
                    </div>
                    <div className="border-l border-gray-600 pl-4 text-center">
                      <div className="text-gray-400 text-sm mb-1">BOG</div>
                      <div className="text-white text-xl font-bold">{(nextMeeting as any).bog || 0}</div>
                    </div>
                    <div className="border-l border-gray-600 pl-4 text-center">
                      <div className="text-gray-400 text-sm mb-1">Business Closed</div>
                      <div className="text-white text-xl font-bold">
  {formatCurrency((nextMeeting as any).businessClosedAmount || 0)}
</div>
                    </div>
                    <div className="border-l border-gray-600 pl-4 text-center">
                      <div className="text-gray-400 text-sm mb-1">P2P</div>
                      <div className="text-white text-xl font-bold">{(nextMeeting as any).p2p || 0}</div>
                    </div>
                    <div className="border-l border-gray-600 pl-4 text-center">
                      <div className="text-gray-400 text-sm mb-1">Testimonials</div>
                      <div className="text-white text-xl font-bold">{(nextMeeting as any).testimonials || 0}</div>
                    </div>  
                    <div className="border-l border-gray-600 pl-4 text-center">
                      <div className="text-gray-400 text-sm mb-1">No of Visitors</div>
                      <div className="text-white text-xl font-bold">{(nextMeeting as any).visitors || 0}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-gray-300">
                  <p>No upcoming meeting scheduled.</p>
                  <p className="mt-1 text-sm text-gray-400">
                    You don't have any next meeting scheduled.
                  </p>
                </div>
              )}
            </div>
          </div>
        </GradientContainer>

        {/* Filters Section - Just above the table */}
        <FilterSection
          startDate={fromDate}
          endDate={endDate}
          onStartDateChange={setFromDate}
          onEndDateChange={setEndDate}
          onSearch={() => {
            setPage(1);
          }}
          showSearchButton={true}
          skipAutoInit
          deferApply={true}
          autoSearchOnInit={false}
        />

        {/* Table Section */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            {/* Table Controls */}
            <TableControls
              entriesPerPage={entriesPerPage}
              onEntriesChange={setEntriesPerPage}
              searchTerm={pendingSearchTerm}
              onSearchChange={setPendingSearchTerm}
              showSearchInput={false}
            />

            {/* Loading/Error States */}
            {isLoading && (
              <div className="p-8 text-center text-gray-400">Loading meetings...</div>
            )}
            {meetingsError && (
              <div className="p-8 text-center text-red-400">
                Failed to load meetings. Please try again.
              </div>
            )}

            {/* Data Table with clickable rows */}
            {!isLoading && !meetingsError && (
              <>
                <DataTable
                  columns={meetingsColumns}
                  data={filteredData}
                  searchValues={columnSearches}
                  onSearchChange={handleColumnSearchChange}
                  onRowClick={(row) => handleRowClick(row as MeetingRecord)}
                  renderCell={renderStatusCell}
                  total={meetingsRes?.total || 0}
                  page={page}
                  pageSize={entriesPerPage}
                  onPageChange={(p) => setPage(p)}
                />
              </>
            )}
          </div>
        </GradientContainer>
      </main>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={handleCloseConfirmation}
        onConfirm={handleConfirmComplete}
        type="accept"
        title="Are you sure you want to mark this meeting as completed?"
      />
    </div>
  );
}