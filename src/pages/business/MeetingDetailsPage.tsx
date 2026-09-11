import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import GradientContainer from "../../components/common/GradientContainer";
import StatCardSmall from "../../components/common/StatCardSmall";
import DataTable from "../../components/common/DataTable";
import type { TableColumn } from "../../components/common/DataTable";
import { useGetMeetingQuery, useListMeetingsQuery, useTransitionMeetingStatusMutation } from "../../services/meetingsApi";
import { useMeQuery } from "../../services/authApi";
import { useToast } from "../../components/toast/ToastProvider";
import { useRole } from "../../hooks/useRole";
import {
  useBulkUpsertEdPalmsMutation,
  useGetEdPalmsAttendanceQuery
} from "../../services/ed/edPalmsApi";

interface ApiResponse {
  success: boolean;
  data: {
    summary: {
      totalMembers: number;
      present: number;
      visitors: number;
      businessClosed: number;
      p2p: number;
    };
    rows: AttendeeRecord[];
    readOnly: boolean;
    meetingDate: string;
    meetingStatus?: string;
    page: number;
    limit: number;
    total: number;
  };
}

interface ProcessedData {
  rows: AttendeeRecord[];
  summary: {
    totalMembers: number;
    present: number;
    visitors: number;
    businessClosed: number;
    p2p: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  readOnly: boolean;
  meetingDate: string;
  status?: string;
  meetingStatus?: string;
}

interface AttendeeRecord {
  // ED API format (nested member object)
  member?: {
    id: string;
    name: string;
  };
  // User API format (flat structure)
  memberId?: string;
  name?: string;

  // Common fields
  attendance: "P" | "L" | "A" | "S" | "M";
  bor: number;
  bog: number;
  visitors: number;
  p2p: number;
  businessClosed: number;
  testimonials: number;

  // For internal use in the component
  id?: string;
}

// AttendanceSummary type is no longer used

// Table columns configuration
const columns: TableColumn[] = [
  { key: "name", label: "Name", sortable: true, searchable: false },
  { key: "attendance", label: "Attendance", sortable: true, searchable: false },
  { key: "bor", label: "BOR", sortable: true, searchable: false },
  { key: "bog", label: "BOG", sortable: true, searchable: false },
  { key: "visitors", label: "Visitors", sortable: true, searchable: false },
  { key: "p2p", label: "P2P", sortable: true, searchable: false },
  { key: "businessClosed", label: "Business Closed", sortable: true, searchable: false },
  { key: "testimonials", label: "Testimonials", sortable: true, searchable: false },
];

const ROWS_BATCH_SIZE = 10;

export default function MeetingDetailsPage() {
  const { role: userRole } = useRole();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [userName, setUserName] = useState("");

  // Use ED PALMS API for admin/leadership users
  const {
    data: palmsDataRes,
    isLoading: isPalmsLoading
  } = useGetEdPalmsAttendanceQuery(
    { meetingId: id || '' },
    {
      skip: !id,
      refetchOnMountOrArgChange: true
    }
  );

  // Fetch meeting data - only for non-admin users
  const {
    data: meetingData,
    error: meetingFetchError,
    isLoading: isMeetingLoading
  } = useGetMeetingQuery(
    id || '',
    {
      skip: !id, // Skip if no meeting ID
      refetchOnMountOrArgChange: true
    }
  );

  // Map API response to ProcessedData format
  const mapApiResponse = useMemo(() => (data: ApiResponse['data'] | undefined): ProcessedData => {
    if (!data) {
      return {
        rows: [],
        summary: {
          totalMembers: 0,
          present: 0,
          visitors: 0,
          businessClosed: 0,
          p2p: 0
        },
        pagination: {
          page: 1,
          limit: 10,
          total: 0
        },
        readOnly: true,
        meetingDate: new Date().toISOString(),
        status: 'Pending', // Use status from API or default to 'Pending'
        meetingStatus: 'PENDING'
      };
    }

    return {
      rows: data.rows.map((row, index) => {
        // Handle both response formats
        const memberId = row.member?.id || row.memberId || `member-${index}`;
        const memberName = row.member?.name || row.name || 'Unknown Member';

        return {
          ...row,
          id: memberId,
          memberId,
          name: memberName,
          attendance: row.attendance,
          bor: row.bor || 0,
          bog: row.bog || 0,
          visitors: row.visitors || 0,
          p2p: row.p2p || 0,
          businessClosed: row.businessClosed || 0,
          testimonials: row.testimonials || 0
        };
      }),
      summary: data.summary,
      pagination: {
        page: data.page || 1,
        limit: data.limit || 10,
        total: data.total || data.rows.length
      },
      readOnly: data.readOnly || false,
      meetingDate: data.meetingDate || new Date().toISOString(),
      meetingStatus: data.meetingStatus
    };
  }, []);

  // Process meeting data based on user role
  const processedData = useMemo<ProcessedData>(() => {
    try {
      // Process PALMS data for admin users
      if (palmsDataRes?.data) {
        return mapApiResponse(palmsDataRes.data as unknown as ApiResponse['data']);
      }

      // Process regular meeting data for non-admin users
      if (meetingData?.data) {
        return mapApiResponse(meetingData.data as unknown as ApiResponse['data']);
      }

      // Return empty state if no data
      return mapApiResponse(undefined);
    } catch (err) {
      console.error('Error processing meeting data:', err);
      return mapApiResponse(undefined);
    }
  }, [meetingData, palmsDataRes]);

  // Initialize meeting status from API response
  const [meetingStatus, setMeetingStatus] = useState<string>('Pending');

  // Update meeting status when processedData changes
  useEffect(() => {
    // Check both meetingStatus and status properties
    const status = processedData?.meetingStatus || processedData?.status;
    if (status) {
      const normalizedStatus = status.toUpperCase();
      setMeetingStatus(normalizedStatus);
    }
  }, [processedData?.meetingStatus, processedData?.status]);

  // Initialize editable lines from processed data
  useEffect(() => {
    if (processedData.rows && processedData.rows.length > 0) {
      setEditableLines(processedData.rows);
    }
  }, [processedData.rows]);

  const [searchTerm, setSearchTerm] = useState("");
  const [editableLines, setEditableLines] = useState<AttendeeRecord[]>([]);
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ROWS_BATCH_SIZE);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return editableLines;
    }

    return editableLines.filter((record) =>
      Object.values(record).some((value) =>
        String(value ?? "").toLowerCase().includes(normalizedSearch)
      )
    );
  }, [editableLines, searchTerm]);

  const visibleRows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount]
  );

  const hasMoreRows = visibleRows.length < filteredRows.length;

  // Generate a unique idempotency key for this session
  const idempotencyKey = useMemo(() => {
    const storedKey = sessionStorage.getItem(`meeting_${id}_idempotency_key`);
    return storedKey || `palms-${new Date().toISOString().split('T')[0].split('-').reverse().join('-')}-ch-${Math.floor(100 + Math.random() * 900)}`;
  }, [id]);

  // Fetch current user
  const { data: userData } = useMeQuery();

  // Set user name if available
  useEffect(() => {
    if (userData?.data?.name) {
      setUserName(userData.data.name);
    }
  }, [userData]);

  const handleTableScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMoreRows) return;

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 48;

    if (isNearBottom) {
      setVisibleCount((prev) => Math.min(prev + ROWS_BATCH_SIZE, filteredRows.length));
    }
  };

  // Handle search input changes
  const handleSearchChange = (key: string, value: string) => {
    setColumnSearches(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Load saved data from session storage
  useEffect(() => {
    const savedData = sessionStorage.getItem(`meeting_${id}_data`);
    if (savedData) {
      setEditableLines(JSON.parse(savedData));
    }
  }, [id]);

  // Save editable lines to session storage when they change
  useEffect(() => {
    if (editableLines.length > 0) {
      sessionStorage.setItem(`meeting_${id}_data`, JSON.stringify(editableLines));
      sessionStorage.setItem(`meeting_${id}_idempotency_key`, idempotencyKey);
    }
  }, [editableLines, id, idempotencyKey]);

  useEffect(() => {
    setVisibleCount(ROWS_BATCH_SIZE);
  }, [searchTerm, editableLines.length]);

  // Handle API errors
  useEffect(() => {
    const error = meetingFetchError || (palmsDataRes as any)?.error;
    if (error) {
      console.error("Error loading meeting:", error);
      showToast({
        title: 'Error',
        description: `Failed to load meeting details: ${(error as any)?.data?.message || 'Unknown error'}`,
        kind: 'error',
      });
      const err = error as any;
      if (err?.status === 401) {
        navigate('/login');
      }
    }
  }, [meetingFetchError, palmsDataRes, showToast, navigate]);

  // Get meeting data based on user role
  const meeting = useMemo(() => ({
    id: id || '',
    date: processedData.meetingDate,
    attendees: processedData.rows,
    readOnly: processedData.readOnly,
    pagination: processedData.pagination,
    status: processedData.status || meetingStatus // Use status from URL if available, otherwise from processedData
  }), [id, processedData, meetingStatus]);

  // Ensure the component maintains its state when navigating back
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };

  // Add beforeunload event listener to handle page refresh/navigation
  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const summary = useMemo(() => ({
    totalMembers: processedData.summary.totalMembers,
    present: processedData.summary.present,
    visitors: processedData.summary.visitors,
    businessClosed: processedData.summary.businessClosed,
    p2p: processedData.summary.p2p,
  }), [processedData.summary]);

  const [bulkUpsertEdPalms, { isLoading: isUpdating }] = useBulkUpsertEdPalmsMutation();
  const [transitionMeetingStatus, { isLoading: isSubmitting }] = useTransitionMeetingStatusMutation();
  const { refetch: refetchMeetings } = useListMeetingsQuery({});

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const idempotencyKey = `meeting_${id}_${new Date().getTime()}`;
      // Save idempotency key to session storage
      sessionStorage.setItem(`meeting_${id}_idempotency_key`, idempotencyKey);

      // Prepare the payload for the API
      const payload = {
        idempotencyKey,
        meetingId: id || '',
        entries: editableLines.map(line => {
          // Handle both formats: member object or flat structure
          const memberId = line.member?.id || line.memberId || `member-${line.id || ''}`;

          return {
            memberId,
            attendance: line.attendance,
            visitors: line.visitors || 0,
            p2p: line.p2p || 0,
            businessClosed: line.businessClosed || 0,
            bor: line.bor || 0,
            bog: line.bog || 0,
            testimonials: line.testimonials || 0
          };
        })
      };

      await bulkUpsertEdPalms(payload).unwrap();

      // Submit the meeting after successful PALMS update
      await transitionMeetingStatus({ meetingId: id, action: "SUBMIT" }).unwrap();

      // Show success message
      showToast({
        title: 'Success',
        description: 'Meeting details saved and submitted successfully',
        kind: 'success',
      });

      // Refresh the meetings list
      await refetchMeetings();

      // Navigate back to meetings page
      navigate('/business/meetings');
    } catch (err) {
      console.error('Error saving meeting details:', err);

      // Show error message with more details if available
      const errorMessage = (err as any)?.data?.message || 'Failed to save meeting details. Please try again.';

      showToast({
        title: 'Error',
        description: errorMessage,
        kind: 'error',
      });

      // If unauthorized, redirect to login
      if ((err as any)?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset editable lines to original data
    if (processedData.rows && processedData.rows.length > 0) {
      setEditableLines(processedData.rows);
    }
    // Clear session storage to remove any saved changes
    sessionStorage.removeItem(`meeting_${id}_data`);
  };

  // Check if meeting date is in the future
  const isMeetingDateInFuture = useMemo(() => {
    if (!processedData.meetingDate) return false;
    const meetingDate = new Date(processedData.meetingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    meetingDate.setHours(0, 0, 0, 0);
    return meetingDate > today;
  }, [processedData.meetingDate]);

  const getDisplayAttendance = (attendance: string) => {
    if (isMeetingDateInFuture && attendance === "P") {
      return "-";
    }
    return attendance;
  };

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Meetings", onClick: () => navigate("/business/meetings") },
    { label: "Meetings PALMS ATTENDENCE" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* Loading State */}
        {isPalmsLoading || isMeetingLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D85D27]"></div>
          </div>
        ) : null}

        {/* Error State */}
        {meetingFetchError || (palmsDataRes as any)?.error ? (
          <div className="bg-red-900/20 border border-red-900/50 text-red-200 p-4 rounded-lg mb-6">
            <p className="font-medium">Error loading meeting details</p>
            <p className="text-sm mt-1">
              {(meetingFetchError || (palmsDataRes as any)?.error)?.message || 'An unknown error occurred'}
            </p>
          </div>
        ) : null}

        {meeting && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <StatCardSmall title="Total Members" value={String(summary.totalMembers)} />
            <StatCardSmall title="Present" value={String(summary.present)} />
            <StatCardSmall title="Visitors" value={String(summary.visitors)} />
            <StatCardSmall title="Business Closed" value={String(summary.businessClosed)} />
            <StatCardSmall title="P2P" value={String(summary.p2p)} />
          </div>
        )}

        {/* Table Section - gradient container with custom header */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            {/* Header Section */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Search Bar - Left */}
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative w-full max-w-xs">
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 pl-10 bg-[#0f1419] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    />
                    <svg className="absolute left-3 top-2.5 text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">
                    Meeting PALMS | {processedData?.meetingDate ? new Date(processedData.meetingDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }).replace(/\//g, '/') : 'Loading...'}
                  </h2>
                </div>

                {/* Edit Button - Right */}
                <div className="flex-1 flex justify-end">
                  {['COMPLETED'].includes(meetingStatus?.toUpperCase() || '') && userRole && !isMeetingDateInFuture && (
                    <div className="flex items-center">
                      {/* View-only roles */}
                      {['USER', 'CHAPTER_DIRECTOR', 'SUPPORT_DIRECTOR', 'LAUNCH_DIRECTOR'].includes(userRole) ? (
                        <div className="text-gray-400 text-sm">
                          View-only mode
                        </div>
                      ) : isEditing ? (
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={handleCancel}
                            disabled={isPalmsLoading || isMeetingLoading || isUpdating || isSubmitting}
                            className="h-[40px] px-6 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSubmit}
                            disabled={isPalmsLoading || isMeetingLoading || isUpdating || isSubmitting}
                            className="h-[40px] px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors disabled:opacity-50"
                          >
                            {isUpdating ? 'Saving...' : isSubmitting ? 'Submitting...' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleEdit}
                          disabled={isPalmsLoading || isMeetingLoading}
                          className="h-[40px] px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors disabled:opacity-50"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div
              className="min-w-full max-h-[560px] overflow-y-auto"
              onScroll={handleTableScroll}
            >
              <DataTable
                columns={columns}
                data={visibleRows}
                searchValues={{ ...columnSearches, ...{ name: searchTerm } }}
                onSearchChange={handleSearchChange}
                showSearchRow={true}
                stickyHeader={true}
                noOverflow={true}
                renderCell={(column, row) => {
                  if (!isEditing) {
                    if (column.key === "attendance") {
                      return getDisplayAttendance(String(row.attendance ?? ""));
                    }
                    return row[column.key];
                  }

                  switch (column.key) {
                    case "attendance":
                      return (
                        <select
                          value={row.attendance}
                          onChange={(e) => setEditableLines((prev) => {
                            return prev.map(item =>
                              item.memberId === row.memberId
                                ? { ...item, attendance: e.target.value as any }
                                : item
                            );
                          })}
                          className="w-full h-9 bg-[#0f1419] border border-gray-700 rounded text-white text-sm px-2"
                        >
                          <option value="P">Present (P)</option>
                          <option value="A">Absent (A)</option>
                          <option value="L">Late (L)</option>
                          <option value="S">Substitute (S)</option>
                          <option value="M">Medical (M)</option>
                        </select>
                      );
                    case "bor":
                    case "bog":
                      // BOG and BOR are non-editable
                      return row[column.key];
                    case "visitors":
                    case "p2p":
                    case "businessClosed":
                    case "testimonials":
                      return (
                        <input
                          type="number"
                          min={0}
                          value={row[column.key] === 0 ? "" : row[column.key] ?? ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? 0 : parseInt(e.target.value) || 0;
                            setEditableLines(prev =>
                              prev.map(item =>
                                item.memberId === row.memberId
                                  ? { ...item, [column.key]: value }
                                  : item
                              )
                            );
                          }}
                          className="w-full h-9 bg-[#0f1419] border border-gray-700 rounded text-white text-sm px-2"
                        />
                      );
                    default:
                      return row[column.key];
                  }
                }}
              />
              <div className="px-4 py-3 text-sm text-gray-400">
                {hasMoreRows
                  ? `Showing ${visibleRows.length} of ${filteredRows.length} entries. Scroll to load more.`
                  : `Showing ${visibleRows.length} of ${filteredRows.length} entries`}
              </div>
            </div>
          </div>
        </GradientContainer>
      </main>
    </div>
  );
}
