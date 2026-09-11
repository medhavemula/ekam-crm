import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import GradientContainer from "../../components/common/GradientContainer";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import StatCardSmall from "../../components/common/StatCardSmall";
import DataTable, { type TableColumn } from "../../components/common/DataTable";
import { useGetM2OQuery, useUpsertM2OLinesMutation, useSubmitM2OMutation } from "../../services/m2oApi";
import { useToast } from "../../components/toast/ToastProvider";
import { useRole } from "../../hooks/useRole";

interface AttendeeRecord {
  id: number;
  memberId?: string;
  name: string;
  attendance: string;
  bor: number;
  bog: number;
  visitors: number;
  p2p: number;
  businessClosed: number;
  testimonials: number;
}

// Table columns configuration
const columns: TableColumn[] = [
  { key: "name", label: "Name", sortable: true, searchable: false },
  { key: "attendance", label: "Attendance", sortable: true, searchable: false },
];

const ROWS_BATCH_SIZE = 10;

// Build attendees from API response lines

export default function ManyToOneDetailsPage() {
  // Navigation and routing
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [columnSearches] = useState<{ [key: string]: string }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editableLines, setEditableLines] = useState<AttendeeRecord[]>([]);
  const [visibleCount, setVisibleCount] = useState(ROWS_BATCH_SIZE);
  const { showToast } = useToast();
  
  // User role and permissions
  const { role: userRole } = useRole();
  
  // Fetch meeting data
  const { data: m2oRes, isLoading, error } = useGetM2OQuery(routeId || "", { skip: !routeId });
  
  // Format date helper function
  const fmt = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const datePart = d.toLocaleDateString("en-GB", { 
        day: "2-digit", 
        month: "short", 
        year: "numeric", 
        timeZone: "UTC" 
      });
      const timePart = d.toLocaleTimeString("en-GB", { 
        hour: "2-digit", 
        minute: "2-digit", 
        hour12: false, 
        timeZone: "UTC" 
      });
      return `${datePart}, ${timePart}`;
    } catch {
      return String(iso);
    }
  };
  
  const meetingDate = fmt((m2oRes as any)?.data?.date);
  const isMeetingDateInFuture = useMemo(() => {
    const rawDate = (m2oRes as any)?.data?.date;
    if (!rawDate) return false;
    const parsedDate = new Date(rawDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate > today;
  }, [m2oRes]);
  
  // Meeting status and edit permissions
  const { canEdit } = useMemo(() => {
    const meetingStatus = (m2oRes as any)?.data?.status?.toUpperCase() || "";
    const isCompleted = meetingStatus === "COMPLETED";
    const isOpen = meetingStatus === "OPEN";
    const userRoleUpper = (userRole || "").toString().toUpperCase();
    
    // Roles that should have view-only access
    const viewOnlyRoles = [
      'USER',
      'CHAPTER_DIRECTOR',
      'SUPPORT_DIRECTOR',
      'LAUNCH_DIRECTOR'
    ];
    
    // Check if current role is in view-only list
    const isViewOnlyRole = viewOnlyRoles.some(role => 
      userRoleUpper === role.toUpperCase()
    );
    
    // Allow editing for COMPLETED or OPEN status and non-view-only roles
    const canEditValue = (isCompleted || isOpen) && userRoleUpper && !isViewOnlyRole;
    
    return {
      canEdit: canEditValue
    };
  }, [m2oRes, userRole]);

  // Check authentication
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  // Process attendees data
  const attendees: AttendeeRecord[] = useMemo(() => {
    const lines = (m2oRes as any)?.data?.lines || [];
    return lines.map((ln: any, idx: number) => ({
      id: idx,
      memberId: ln?.memberId?._id || ln?.memberId || "",
      name: ln?.memberId?.name || "",
      attendance: ln?.attendance || "",
      bor: Number(ln?.bor ?? 0),
      bog: Number(ln?.bog ?? 0),
      visitors: Number(ln?.visitors ?? 0),
      p2p: Number(ln?.p2p ?? 0),
      businessClosed: Number(ln?.businessClosed ?? 0),
      testimonials: Number(ln?.testimonials ?? 0),
    }));
  }, [m2oRes]);

  const kpis = React.useMemo(() => {
    const k = (m2oRes as any)?.data?.kpis ?? {};
    const presentCount = attendees.reduce((acc, r) => acc + (r.attendance === "P" ? 1 : 0), 0);
    const visitors = attendees.reduce((acc, r) => acc + (r.visitors || 0), 0);
    const closed = attendees.reduce((acc, r) => acc + (r.businessClosed || 0), 0);
    const p2p = attendees.reduce((acc, r) => acc + (r.p2p || 0), 0);
    return {
      totalMembers: k.totalMembers ?? attendees.length,
      present: k.present ?? presentCount,
      visitors: k.visitors ?? visitors,
      businessClosed: k.businessClosed ?? closed,
      p2p: k.p2p ?? p2p,
    } as { totalMembers: number; present: number; visitors: number; businessClosed: number; p2p: number };
  }, [m2oRes, attendees]);

  const handleColumnSearchChange = () => {};

  

  const filteredData = attendees.filter((record) =>
    searchTerm === ""
      ? true
      : Object.values(record).some((value) =>
          value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
  );

  const visibleRows = useMemo(
    () => filteredData.slice(0, visibleCount),
    [filteredData, visibleCount]
  );

  const hasMoreRows = visibleRows.length < filteredData.length;

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Many to One", onClick: () => navigate("/business/many-to-one") },
    { label: "Many to One Palms" },
  ];

  // Editing helpers
  React.useEffect(() => {
    if (isEditing) setEditableLines(attendees);
  }, [isEditing, attendees]);

  React.useEffect(() => {
    setVisibleCount(ROWS_BATCH_SIZE);
  }, [searchTerm, attendees.length]);

  const handleTableScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMoreRows) return;

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 48;

    if (isNearBottom) {
      setVisibleCount((prev) => Math.min(prev + ROWS_BATCH_SIZE, filteredData.length));
    }
  };

  const [upsertLines, { isLoading: saving }] = useUpsertM2OLinesMutation();
  const [submitSession, { isLoading: submitting }] = useSubmitM2OMutation();

  const ATT_OPTIONS = [
    { label: "Present (P)", value: "P" },
    { label: "Absent (A)", value: "A" },
  ];

  const getDisplayAttendance = (attendance: string) => {
    if (isMeetingDateInFuture && attendance === "P") {
      return "-";
    }
    return attendance;
  };

  const onEdit = () => setIsEditing(true);
  const onSubmit = async () => {
    if (!routeId) return;
    try {
      await upsertLines({
        id: routeId,
        body: {
          lines: editableLines.map((l) => ({
            memberId: String(l.memberId || ""),
            attendance: l.attendance as any,
            bog: l.bog ?? 0,
            bor: l.bor ?? 0,
            visitors: l.visitors ?? 0,
            p2p: l.p2p ?? 0,
            businessClosed: l.businessClosed ?? 0,
            testimonials: l.testimonials ?? 0,
            note: "",
          })),
        },
      }).unwrap();
      showToast({ title: "PALMS updated", kind: "success" });
      await submitSession(routeId).unwrap();
      showToast({ title: "PALMS submitted", kind: "success" });
      setIsEditing(false);
      navigate("/business/many-to-one");
    } catch (e) {
      // keep editing on error
      console.error(e);
      showToast({ title: "Failed to submit PALMS", description: (e as any)?.data?.message || (e as any)?.message, kind: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName="" />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} />

        {isLoading && (
          <div className="text-center py-6 text-white">Loading meeting...</div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">Failed to load meeting.</div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCardSmall title="Total Members" value={String(kpis.totalMembers)} />
          <StatCardSmall title="Present" value={String(kpis.present)} />
        </div>

        {/* Table Section */}
        <GradientContainer>
        <div className="rounded-2xl overflow-hidden">
          {/* Custom Header with Title + left search, right Edit/Submit */}
          <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-b border-gray-700">
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

            <h2 className="text-lg md:text-xl font-semibold text-white text-center">
              Many to One PALMS | {meetingDate}
            </h2>

            <div className="flex-1 flex justify-end">
              {canEdit && (
                <button
                  onClick={isEditing ? onSubmit : onEdit}
                  disabled={isEditing && (saving || submitting)}
                  className="h-[40px] px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors disabled:opacity-50"
                >
                  {isEditing ? (saving || submitting ? "Submitting..." : "Submit") : "Edit"}
                </button>
              )}
            </div>
          </div>

          {/* Data Table - Using Reusable Component */}
          <div
            className="max-h-[560px] overflow-y-auto"
            onScroll={handleTableScroll}
          >
            <DataTable
              columns={columns}
              data={visibleRows}
              searchValues={columnSearches}
              onSearchChange={handleColumnSearchChange}
              showSearchRow={false}
              stickyHeader={true}
              noOverflow={true}
              renderCell={(col, row) => {
                if (!isEditing) {
                  if (col.key === "attendance") {
                    return getDisplayAttendance(String(row.attendance ?? ""));
                  }
                  return null;
                }
                const idx = row.id as number;
                const val = editableLines[idx];
                if (!val) return null;
                switch (col.key) {
                  case "attendance":
                    return (
                      <select
                        value={val.attendance}
                        onChange={(e) => setEditableLines((prev) => { const next = [...prev]; next[idx] = { ...next[idx], attendance: e.target.value }; return next; })}
                        className="w-full h-9 bg-[#0f1419] border border-gray-700 rounded text-white text-sm px-2"
                      >
                        {ATT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    );
                  default:
                    return null;
                }
              }}
            />

            <div className="p-4 text-sm text-gray-400 rounded-b-2xl">
              {hasMoreRows
                ? `Showing ${visibleRows.length} of ${filteredData.length} entries. Scroll to load more.`
                : `Showing ${visibleRows.length} of ${filteredData.length} entries`}
            </div>
          </div>
        </div>
        </GradientContainer>
      </main>
    </div>
  );
}
