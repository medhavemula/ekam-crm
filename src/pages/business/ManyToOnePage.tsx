import React, { useMemo, useState } from "react";
import GradientContainer from "../../components/common/GradientContainer";
import { useLocation, useNavigate } from "react-router-dom";
import { useRole } from "../../hooks/useRole";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import TableControls from "../../components/common/TableControls";
import DataTable, { type TableColumn } from "../../components/common/DataTable";
import DatePicker from "../../components/common/DatePicker";
import { useLazyListM2OQuery } from "../../services/m2oApi";
import { getFirstDayOfMonth, getLastDayOfMonth, todayInputDate } from "../../utils/date";
import CalendarIcon from "../../assets/icons/calendar.svg";

interface ManyToOneRecord {
  id: string;
  meetingDate: string;
  topic: string;
  location: string;
  createdBy: string;
  createdDate: string;
  status: string;
  originalData?: any; // Store original backend data
}

// Table columns configuration
const columns: TableColumn[] = [
  { key: "meetingDate", label: "Meeting Date", sortable: true, searchable: false },
  { key: "topic", label: "Meeting Topic", sortable: true, searchable: false },
  { key: "createdBy", label: "Name", sortable: true, searchable: false },
  { key: "location", label: "Location", sortable: true, searchable: false },
  { key: "status", label: "Status", sortable: true, searchable: false },
];

export default function ManyToOnePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useRole();


  const defaultDates = { 
    start: getFirstDayOfMonth(),
    end: getLastDayOfMonth() 
  };
  const [fromDate, setFromDate] = useState(defaultDates.start);
  const [toDate, setToDate] = useState(defaultDates.end);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [appliedSearchTerm] = useState("");
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});
  const [toast, setToast] = useState<string | null>(null);

  // Check if user has Business access (roles that can access Many to One)
  const businessRoles = ["PRESIDENT", "VICE_PRESIDENT"];
  const canAddManyToOne = businessRoles.includes(role || "");

  const [triggerListM2O, { data: listRes, isLoading }] = useLazyListM2OQuery();

  const toStartOfDayIso = (date: string) => `${date}T00:00:00.000Z`;
  const toEndOfDayIso = (date: string) => `${date}T23:59:59.999Z`;

  // Get upcoming M2O from the list response
  const upcomingM2O = listRes?.upcomingM2O;
  const formatMeetingDateTime = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const datePart = d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
      const timePart = d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      });
      return `${datePart}, ${timePart}`;
    } catch {
      return String(iso);
    }
  };

  const manyToOne: ManyToOneRecord[] = useMemo(() => {
    const rows = listRes?.rows || [];
    const fmt = (iso?: string) => {
      if (!iso) return "";
      try {
        const d = new Date(iso);
        const datePart = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
        const timePart = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
        return `${datePart}, ${timePart}`;
      } catch {
        return String(iso);
      }
    };
    return rows.map((r: any) => ({
      id: String(r._id),
      meetingDate: fmt(r.date),
      topic: r.meetingTopic || "",
      location: r.place || "",
      createdBy: r.targetMemberName,
      createdDate: "-",
      status: r.status || "",
      originalData: r, // Store original backend data
    }));
  }, [listRes]);

  // Check authentication
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  // Load initial data when component mounts
  React.useEffect(() => {
    triggerListM2O({
      from: fromDate ? toStartOfDayIso(fromDate) : undefined,
      to: toDate ? toEndOfDayIso(toDate) : undefined,
      q: appliedSearchTerm || undefined,
      page: 1,
      pageSize: 100,
    });
  }, [appliedSearchTerm, fromDate, toDate, triggerListM2O]);

  React.useEffect(() => {
    const msg = (location.state as any)?.toast;
    if (msg) {
      setToast(msg);
      const t = setTimeout(() => setToast(null), 3000);
      // clear the state so the toast doesn't reappear on back
      navigate(location.pathname, { replace: true });
      return () => clearTimeout(t);
    }
  }, [location, navigate]);

  const handleColumnSearchChange = (key: string, value: string) => {
    setColumnSearches({ ...columnSearches, [key]: value });
  };

  const handleEditClick = (e: React.MouseEvent, record: ManyToOneRecord) => {
    e.stopPropagation(); // Prevent row click
    navigate(`/business/edit-many-to-one/${record.id}`, { state: { record } });
  };

  const handleRowClick = (record: ManyToOneRecord) => {
    const id = record.id;
    
    // Navigate to the meeting page regardless of status
    navigate(`/business/many-to-one/${id}`, { state: { record } });
  };

  // Custom cell renderer for Status column
  const renderCell = (column: TableColumn, row: any) => {
    if (column.key === "status") {
      const record = row as ManyToOneRecord;
      return (
        <div className="flex items-center gap-2">
          <span>{record.status}</span>
          {/* Show edit icon for OPEN and SCHEDULED status sessions - only for Business roles */}
          {(record.status === "OPEN" || record.status === "SCHEDULED") && canAddManyToOne && (
            <button
              onClick={(e) => handleEditClick(e, record)}
              className="p-1 hover:bg-gray-700 rounded-md transition-colors"
              title="Edit M2O Session"
            >
              <svg 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
              </svg>
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  const handleSearch = () => {
    triggerListM2O({
      from: fromDate ? toStartOfDayIso(fromDate) : undefined,
      to: toDate ? toEndOfDayIso(toDate) : undefined,
      q: appliedSearchTerm || undefined,
      page: 1,
      pageSize: 100,
    });
  };

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Many to One" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName="" />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* Next M2O Session Card - At the top with GradientContainer */}
        <GradientContainer className="mb-6">
          <div className="rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#D85D27] p-4">
              <h3 className="text-lg font-semibold text-white">Next M2O Session Details</h3>
            </div>

            {/* Content */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 text-white">
              {upcomingM2O ? (
                <>
                  {/* Date & Time */}
                  <div className="mb-3">
                    <div className="text-lg text-orange-500">
                      {formatMeetingDateTime(upcomingM2O.date)}
                    </div>
                  </div>

                  {/* Session Info */}
                  <div className="space-y-1">
                    <div className="text-base">
                      <span className="text-white/80">Target Member: </span>
                      <span>{upcomingM2O.targetMemberName || "N/A"}</span>
                    </div>
                    <div className="text-base">
                      <span className="text-white/80">Status: </span>
                      <span>{upcomingM2O.status}</span>
                    </div>
                  </div>

                  {/* Statistics Row */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 mt-5">
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-gray-300">
                  <p>No upcoming M2O session scheduled.</p>
                  <p className="mt-1 text-sm text-gray-400">
                    You don't have any next M2O session scheduled.
                  </p>
                </div>
              )}
            </div>
          </div>
        </GradientContainer>

        {/* Filters Section */}
        <div className="mb-6 flex flex-wrap gap-3 items-end">  {/* Start Date */}
          <div className="flex-none w-full sm:w-auto lg:w-[200px]">
            <label className="block text-xs text-gray-400 mb-1">Start Date</label>
            <DatePicker
              value={fromDate}
              iconSrc={CalendarIcon}
              maxDate={(toDate && toDate < todayInputDate()) ? toDate : todayInputDate()}
              onChange={(v) => {
                const cap = (toDate && toDate < todayInputDate()) ? toDate : todayInputDate();
                const next = v > cap ? cap : v;
                setFromDate(next);
              }}
            />
          </div>

          {/* End Date */}
          <div className="flex-none w-full sm:w-auto lg:w-[200px]">
            <label className="block text-xs text-gray-400 mb-1">End Date</label>
            <DatePicker
              value={toDate}
              iconSrc={CalendarIcon}
              minDate={fromDate}
              onChange={(v) => {
                let next = v;
                if (next < fromDate) next = fromDate;
                setToDate(next);
              }}
            />
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="h-[46px] px-8 rounded-md bg-[#D85D27] hover:bg-[#C24F20] disabled:bg-[#8B4513] text-white font-medium transition-colors disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading..." : "Search"}
          </button>

          {/* Add Many to One Button - Only for Business roles */}
          {canAddManyToOne && (
            <button
              onClick={() => navigate("/business/add-many-to-one")}
              className="ml-auto h-[46px] px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors"
            >
              Add Many to one +
            </button>
          )}
        </div>
        {/* Table Section */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            {/* Table Controls */}
            <TableControls
              entriesPerPage={entriesPerPage}
              onEntriesChange={setEntriesPerPage}
              searchTerm=""
              onSearchChange={() => {}}
              showSearchInput={false}
            />

            {/* Data Table with clickable rows */}
            <DataTable
              columns={columns}
              data={manyToOne}
              searchValues={columnSearches}
              onSearchChange={handleColumnSearchChange}
              onRowClick={(row) => handleRowClick(row as ManyToOneRecord)}
              renderCell={renderCell}
            />

            {/* Pagination Info */}
            <div className="p-4 text-sm text-gray-400 rounded-b-2xl">
              Showing {manyToOne.length} entries
            </div>
          </div>
        </GradientContainer>
      </main>

      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2 rounded-md bg-green-600 text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
