import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../../components/toast/ToastProvider";
import {
  useBulkUpsertEdPalmsMutation,
  useGetEdPalmsAttendanceQuery
} from "../../../services/ed/edPalmsApi";
import { useUpdateEdMeetingStatusMutation } from "../../../services/ed/edMeetingsApi";
import { Search } from "lucide-react";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import GradientContainer from "../../../components/common/GradientContainer";
import StatCardSmall from "../../../components/common/StatCardSmall";
import { TableSkeleton } from "../../../components/common/Skeletons";
import DataTable from "../../../components/common/DataTable";
import type { TableColumn } from "../../../components/common/DataTable";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useRole } from "../../../hooks/useRole";
import { canEditPalms, canUnlockMeeting } from "../../../config/palmsAccess";

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
    meetingStatus?: string;  // Add meetingStatus property
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
  status?: string; // Add status to the interface
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
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [meetingStatus, setMeetingStatus] = useState('Pending');
  // State for editing and data management
  // Only offer the controls this member can actually use. The server refuses the
  // rest anyway, but it refuses silently - a President could open edit mode, change
  // attendance, press Save and be told nothing at all.
  const { role: primaryRole, roles: assignedRoles } = useRole();
  const myRoles = [primaryRole, ...(assignedRoles || [])];
  const mayEditPalms = canEditPalms(myRoles);
  const mayUnlock = canUnlockMeeting(myRoles);

  const [isEditing, setIsEditing] = useState(false);
  const [editableLines, setEditableLines] = useState<AttendeeRecord[]>([]);
  const [columnSearches, setColumnSearches] = useState<Record<string, string>>({});

  // Get status from URL params
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const statusParam = params.get('status');

  useEffect(() => {
    if (statusParam) {
      setMeetingStatus(statusParam);
    }
  }, [statusParam, meetingStatus]);

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
        meetingDate: new Date().toISOString()
      };
    }

    return {
      rows: data.rows.map((row, index) => {
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
      status: data.meetingStatus  // Map meetingStatus from API to status field
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
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

  const idempotencyKey = useMemo(() => {
    const storedKey = sessionStorage.getItem(`meeting_${id}_idempotency_key`);
    return storedKey || `palms-${new Date().toISOString().split('T')[0].split('-').reverse().join('-')}-ch-${Math.floor(100 + Math.random() * 900)}`;
  }, [id]);

  const handleTableScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMoreRows) return;

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 48;

    if (isNearBottom) {
      setVisibleCount((prev) => Math.min(prev + ROWS_BATCH_SIZE, filteredRows.length));
    }
  };

  const handleSearchChange = (key: string, value: string) => {
    setColumnSearches(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const processedData = useMemo<ProcessedData>(() => {
    try {
      if (palmsDataRes?.data) {
        return mapApiResponse(palmsDataRes.data as unknown as ApiResponse['data']);
      }
      return mapApiResponse(undefined);
    } catch (err) {
      console.error('Error processing meeting data:', err);
      return mapApiResponse(undefined);
    }
  }, [palmsDataRes]);

  useEffect(() => {
    if (processedData.rows && processedData.rows.length > 0) {
      setEditableLines(processedData.rows);
    }
  }, [processedData.rows]);

  useEffect(() => {
    const savedData = sessionStorage.getItem(`meeting_${id}_data`);
    if (savedData) {
      setEditableLines(JSON.parse(savedData));
    }
  }, [id]);

  useEffect(() => {
    if (editableLines.length > 0) {
      sessionStorage.setItem(`meeting_${id}_data`, JSON.stringify(editableLines));
      sessionStorage.setItem(`meeting_${id}_idempotency_key`, idempotencyKey);
    }
  }, [editableLines, id, idempotencyKey]);

  useEffect(() => {
    setVisibleCount(ROWS_BATCH_SIZE);
  }, [searchTerm, editableLines.length]);

  useEffect(() => {
    const error = (palmsDataRes as any)?.error;
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
  }, [palmsDataRes, showToast, navigate]);

  // Meeting data is now directly used from processedData

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Using processedData.summary directly instead of creating a new object

  const [bulkUpsertEdPalms, { isLoading: isUpdating }] = useBulkUpsertEdPalmsMutation();
  const [updateEdMeetingStatus, { isLoading: isSubmitting }] = useUpdateEdMeetingStatusMutation();
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleUnlock = async () => {
    if (!id) return;

    try {
      setIsUnlocking(true);

      // Unlock: Change status from SUBMITTED to COMPLETED
      await updateEdMeetingStatus({ meetingId: id, status: "COMPLETED" }).unwrap();

      showToast({
        title: 'Success',
        description: 'Meeting unlocked for editing',
        kind: 'success',
      });

      // Enable editing mode after unlock
      setIsEditing(true);
    } catch (err) {
      console.error('Error unlocking meeting:', err);

      const errorMessage = (err as any)?.data?.message || 'Failed to unlock meeting. Please try again.';

      showToast({
        title: 'Error',
        description: errorMessage,
        kind: 'error',
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const idempotencyKey = `meeting_${id}_${new Date().getTime()}`;
      sessionStorage.setItem(`meeting_${id}_idempotency_key`, idempotencyKey);

      const payload = {
        idempotencyKey,
        meetingId: id || '',
        entries: editableLines.map(line => {
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

      // Submit the meeting after successful PALMS update using ED-specific endpoint
      await updateEdMeetingStatus({ meetingId: id, status: "SUBMITTED" }).unwrap();

      showToast({
        title: 'Success',
        description: 'Meeting details saved and submitted successfully',
        kind: 'success',
      });

      navigate('/admin/meetings');
    } catch (err) {
      console.error('Error saving meeting details:', err);

      const errorMessage = (err as any)?.data?.message || 'Failed to save meeting details. Please try again.';

      showToast({
        title: 'Error',
        description: errorMessage,
        kind: 'error',
      });

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
    { label: "Meeting", onClick: () => navigate("/admin/meetings") },
    { label: "Meeting PALMS" },
  ];

  const meetingDateLabel = processedData?.meetingDate
    ? new Date(processedData.meetingDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  /** Locked, submitted, pending — a dot and a word, in the tones the app already uses. */
  const statusInfo = (() => {
    if (processedData.status === "LOCKED") return { label: "Locked", tone: "muted" as const };
    if (processedData.status === "SUBMITTED") return { label: "Submitted", tone: "ok" as const };
    if (isMeetingDateInFuture) return { label: "Upcoming", tone: "muted" as const };
    return { label: "Pending", tone: "warn" as const };
  })();
  const STATUS_TONE = {
    ok: { dot: "bg-[var(--ov-s3)]", text: "text-[var(--ov-ink-2)]" },
    warn: { dot: "bg-[var(--ov-ember)]", text: "text-[var(--ov-ember)]" },
    muted: { dot: "bg-[var(--ov-ink-5)]", text: "text-[var(--ov-ink-4)]" },
  };
  const statusTone = STATUS_TONE[statusInfo.tone];

  const fieldClass =
    "h-9 w-full rounded-[var(--field-radius)] border border-[color:var(--field-border)] bg-[var(--field-bg)] px-2 text-[13px] text-[var(--field-ink)] transition-colors focus:border-[color:var(--field-border-focus)] focus:outline-none";

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader breadcrumbs={breadcrumbs} className="mb-3" />

        {/* Title, the meeting's date and status, and the action for whatever
            state the meeting is in — one control at a time, not a title bar
            wedged between a search box and a button. */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-tight text-[var(--ov-ink)] sm:text-[32px]">
              Meeting PALMS
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[var(--ov-ink-4)]">
              {meetingDateLabel ? (
                <span className="ekam-figure">{meetingDateLabel}</span>
              ) : (
                <span>Loading…</span>
              )}
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusTone.dot}`} />
                <span className={`font-medium ${statusTone.text}`}>{statusInfo.label}</span>
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isPalmsLoading || isUpdating || isSubmitting}
                  className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-ink-2)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPalmsLoading || isUpdating || isSubmitting}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdating ? "Saving…" : isSubmitting ? "Submitting…" : "Save"}
                </button>
              </>
            ) : processedData.status === "SUBMITTED" && !isMeetingDateInFuture ? (
              mayUnlock && (
                <button
                  onClick={handleUnlock}
                  disabled={isPalmsLoading || isUnlocking}
                  className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUnlocking ? "Unlocking…" : "Unlock for editing"}
                </button>
              )
            ) : (
              processedData.status !== "LOCKED" &&
              !isMeetingDateInFuture &&
              mayEditPalms && (
                <button
                  onClick={handleEdit}
                  disabled={isPalmsLoading}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Edit attendance
                </button>
              )
            )}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCardSmall title="Total members" value={String(processedData.summary.totalMembers)} />
          <StatCardSmall title="Present" value={String(processedData.summary.present)} />
          <StatCardSmall title="Visitors" value={String(processedData.summary.visitors)} />
          <StatCardSmall title="Business closed" value={String(processedData.summary.businessClosed)} />
          <StatCardSmall title="P2P" value={String(processedData.summary.p2p)} />
        </div>

        <GradientContainer>
          <div className="overflow-hidden rounded-2xl">
            <div className="flex flex-col gap-3 border-b border-[color:var(--ov-line-faint)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-xs">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--field-label)]"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Search members"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded-[var(--field-radius)] border border-[color:var(--field-border)] bg-[var(--field-bg)] py-2 pl-10 pr-3 text-[13px] text-[var(--field-ink)] placeholder:text-[var(--field-placeholder)] transition-colors focus:border-[color:var(--field-border-focus)] focus:outline-none"
                />
              </div>
              {!hasMoreRows && filteredRows.length > 0 && (
                <p className="text-[12.5px] text-[var(--ov-ink-4)] sm:text-right">
                  Showing <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{visibleRows.length}</span> of{" "}
                  <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{filteredRows.length}</span> entries
                </p>
              )}
            </div>

            {isPalmsLoading && processedData.rows.length === 0 ? (
              <div className="p-4">
                <TableSkeleton columns={columns.length} rows={6} />
              </div>
            ) : (
              <div className="min-w-full max-h-[560px] overflow-y-auto" onScroll={handleTableScroll}>
                <DataTable
                  columns={columns}
                  data={visibleRows}
                  searchValues={{ ...columnSearches, ...{ name: searchTerm } }}
                  onSearchChange={handleSearchChange}
                  showSearchRow={true}
                  stickyHeader={true}
                  noOverflow={true}
                  fitContent
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
                            onChange={(e) =>
                              setEditableLines((prev) =>
                                prev.map((item) =>
                                  item.memberId === row.memberId
                                    ? { ...item, attendance: e.target.value as any }
                                    : item,
                                ),
                              )
                            }
                            className={fieldClass}
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
                              setEditableLines((prev) =>
                                prev.map((item) =>
                                  item.memberId === row.memberId ? { ...item, [column.key]: value } : item,
                                ),
                              );
                            }}
                            className={fieldClass}
                          />
                        );
                      default:
                        return row[column.key];
                    }
                  }}
                />
                {hasMoreRows && (
                  <div className="px-4 py-3 text-[12.5px] text-[var(--ov-ink-4)]">
                    Showing <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{visibleRows.length}</span> of{" "}
                    <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{filteredRows.length}</span> entries. Scroll to load more.
                  </div>
                )}
                {!isPalmsLoading && filteredRows.length === 0 && (
                  <div className="px-4 py-10 text-center">
                    <p className="text-[14px] font-medium text-[var(--ov-ink)]">
                      {searchTerm ? "No members match that search" : "No attendance recorded yet"}
                    </p>
                    <p className="mt-1 text-[12.5px] text-[var(--ov-ink-4)]">
                      {searchTerm
                        ? "Try a different name."
                        : "PALMS entries will appear here once the meeting is recorded."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </GradientContainer>
      </main>
    </div>
  );
}
