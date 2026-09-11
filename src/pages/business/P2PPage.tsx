import React, { useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import GradientContainer from "../../components/common/GradientContainer";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import FilterSection from "../../components/common/FilterSection";
import TableControls from "../../components/common/TableControls";
import DataTable from "../../components/common/DataTable";
import type { TableColumn } from "../../components/common/DataTable";
import { useP2PListQuery, useHideP2PMutation } from "../../services/p2pApi";
import { useToast } from "../../components/toast/ToastProvider";
import { useRole } from "../../hooks/useRole";
import { ReportInfoBar } from "../../components/reports";
import DatePicker from "../../components/common/DatePicker";
import FormSelect from "../../components/forms/FormSelect";
import { getFirstDayOfMonth, getLastDayOfMonth, todayInputDate } from "../../utils/date";
import DownloadableCardModal, { EkamCardHeader, EkamCardFooter } from "../../components/common/DownloadableCardModal";

interface P2PRecord {
  id: number;
  // The table's own `id` is a row index, which is fine for React keys but
  // useless for addressing the record. Edit and remove need the real one.
  recordId: string;
  date: string;
  meetWith: string;
  initiatedBy: string;
  location: string;
  topics: string;
  status: string;
}

// P2P Thank You Card Modal Component
function P2PThankYouCardModal({
  record,
  userName,
  onClose,
}: {
  record: P2PRecord;
  userName: string;
  onClose: () => void;
}) {
  return (
    <DownloadableCardModal
      fileName={`p2p-thank-you-${record.id || Date.now()}`}
      onClose={onClose}
    >
      {/* The Card (for download) */}
      <div
        style={{
            width: "380px",
            maxWidth: "100%",
            borderRadius: "18px",
            overflow: "hidden",
            background: "linear-gradient(145deg, #0D1117 0%, #1E2630 60%, #2a1a10 100%)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.75)",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
        <EkamCardHeader title="Thank You For Your P2P" />

        {/* Card Body */}
        <div style={{ padding: "20px" }}>
          {/* With / Initiated By */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
              <span style={{ color: "#9CA3AF", fontSize: "13px", minWidth: "80px" }}>Meet With:</span>
              <span style={{ color: "#ffffff", fontWeight: 600, fontSize: "16px" }}>{record.meetWith}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{ color: "#9CA3AF", fontSize: "13px", minWidth: "80px" }}>Initiated By:</span>
              <span style={{ color: "#ffffff", fontWeight: 600, fontSize: "16px" }}>{record.initiatedBy || userName}</span>
            </div>
          </div>

          {/* Date & Location */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p style={{ color: "#9CA3AF", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>Date</p>
              <p style={{ color: "#ffffff", fontSize: "16px", fontWeight: 600, margin: 0 }}>{record.date}</p>
            </div>
            <div style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p style={{ color: "#9CA3AF", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>Location</p>
              <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: 500, margin: 0 }}>{record.location || "-"}</p>
            </div>
          </div>

          {/* Topic */}
          {record.topics && (
            <div style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "12px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "12px" }}>
              <p style={{ color: "#9CA3AF", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px 0" }}>Topic</p>
              <p style={{ color: "#F3F4F6", fontSize: "14px", lineHeight: "1.5", margin: 0 }}>{record.topics}</p>
            </div>
          )}

          {/* Generic Thank You Message */}
          <div style={{ textAlign: "center", paddingTop: "4px", marginBottom: "10px" }}>
            <p style={{ color: "#D1D5DB", fontSize: "13px", fontStyle: "italic", margin: 0 }}>
              "Thank you for investing your time in this P2P meeting."
            </p>
          </div>
        </div>

        <EkamCardFooter />
      </div>
    </DownloadableCardModal>
  );
}

// Table columns configuration
const columns: TableColumn[] = [
  { key: "date", label: "Date", sortable: true, searchable: false },
  { key: "meetWith", label: "Meet With", sortable: true, searchable: false },
  { key: "initiatedBy", label: "Initiated by", sortable: true, searchable: false },
  { key: "location", label: "Location", sortable: true, searchable: false },
  { key: "topics", label: "Topics", sortable: true, searchable: false },
  // { key: "status", label: "Status", sortable: true, searchable: true },
  { key: "actions", label: "Actions", sortable: false, searchable: false },
];

// Helper to format date as DD/MM/YYYY
const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export default function P2PPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [userName] = useState("Mike");
  const { role: userRole } = useRole();
  

  const isDirectorRole = [
    "EXECUTIVE_DIRECTOR",
    "ED_TEAM",
    "REGIONAL_DIRECTOR",
    "ASSISTANT_REGIONAL_DIRECTOR"
  ].includes(userRole || "");

  // Pending (UI) filters
  const [pendingStartDate, setPendingStartDate] = useState("");
  const [pendingEndDate, setPendingEndDate] = useState("");
  const [pendingChapter, setPendingChapter] = useState("ekam-buz");

 const defaultDates = {
  start: getFirstDayOfMonth(),
  end: getLastDayOfMonth(),
};

  // State
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [page, setPage] = useState(1);
  
  // Search state for server-side search
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<P2PRecord | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<P2PRecord | null>(null);
  const [hideP2P, { isLoading: isRemoving }] = useHideP2PMutation();
  
  // Debounce search input
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  
  // Handle search changes
  const handleSearchChange = (key: string, value: string) => {
    setSearchColumn(key);
    setSearchTerm(value);
    setPage(1); // Reset to first page when search changes
  };
  
  // Handle global search (from TableControls)
  const handleGlobalSearch = (value: string) => {
    setSearchTerm(value);
    setSearchColumn(""); // Clear column-specific search
    setPage(1);
  };


  // When adding, navigate to dedicated page
  const goToAddP2P = () => navigate("/business/p2p/add");

  // Fetch data with server-side filtering and pagination
  const {
    data: p2pResp,
    isLoading,
    error,
  } = useP2PListQuery({
    from: startDate ? `${startDate}T00:00:00` : undefined,
    to: endDate ? `${endDate}T23:59:59` : undefined,
    page,
    limit: entriesPerPage,
    sortBy: "date",
    sortDir: "desc",
    q: searchTerm || undefined,
  });

  // Map API response to table rows
  const apiRows: P2PRecord[] = React.useMemo(() => {
    const items = p2pResp?.data ?? [];
    return items.map((item: any, idx: number) => ({
      id: idx + 1,
      recordId: String(item?._id || item?.id || ""),
      date: item?.date ? formatDate(item.date) : "",
      meetWith: item?.meetWith?.name || "",
      initiatedBy: item?.initiatedBy?.name || "",
      location: item?.location || "",
      topics: item?.topic || "",
      status: item?.status || "",
    }));
  }, [p2pResp]);

  // Reset to first page when entries per page changes
  React.useEffect(() => {
    setPage(1);
  }, [entriesPerPage, debouncedSearchTerm]);

  // Show toast if navigated with a toast payload (StrictMode-safe)
  const shownOnceRef = useRef(false);
  React.useEffect(() => {
    if (shownOnceRef.current) return;
    shownOnceRef.current = true;
    const state = location.state as { toast?: any } | null;
    if (state?.toast) {
      // Clear state first, then show toast
      navigate(location.pathname, { replace: true, state: {} });
      showToast(state.toast);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = p2pResp?.total || 0;

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") }, 
    { label: "P2P" }
  ];

  const handleEditClick = (e: React.MouseEvent, record: P2PRecord) => {
    e.stopPropagation(); // the row itself opens the thank-you card
    navigate(`/business/edit-p2p/${record.recordId}`, { state: { record } });
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;
    try {
      await hideP2P(pendingRemoval.recordId).unwrap();
      showToast({
        title: "Removed from your list",
        description: "The other member still has their copy, and totals are unchanged.",
        kind: "success",
      });
    } catch {
      showToast({ title: "Could not remove", description: "Please try again.", kind: "error" });
    }
    setPendingRemoval(null);
  };

  // Directors browse other people's P2Ps through chapter scope - they have no
  // personal list to edit or remove from, so the actions stay with participants.
  const renderCell = (column: TableColumn, row: any) => {
    if (column.key !== "actions") return null;
    const record = row as P2PRecord;
    if (isDirectorRole || !record.recordId) return <span className="text-gray-500">—</span>;
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => handleEditClick(e, record)}
          className="p-1 hover:bg-gray-700 rounded-md transition-colors text-white"
          title="Edit P2P"
          aria-label="Edit P2P"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setPendingRemoval(record); }}
          className="p-1 hover:bg-gray-700 rounded-md transition-colors text-red-400"
          title="Remove from my list"
          aria-label="Remove from my list"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* Admin View: Show filters with chapter dropdown */}
        {isDirectorRole ? (
          <>
            {/* Admin Filters */}
            <div className="mb-6">
              <div className="flex flex-wrap items-end gap-3">
                {/* Start Date */}
                <div className="flex-none w-full sm:w-auto lg:w-[200px]">
                  <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                  <DatePicker
                    value={pendingStartDate || startDate}
                    maxDate={((pendingEndDate || endDate) && (pendingEndDate || endDate) < todayInputDate()) ? (pendingEndDate || endDate) : todayInputDate()}
                    onChange={(v) => {
                      const cap = ((pendingEndDate || endDate) && (pendingEndDate || endDate) < todayInputDate()) ? (pendingEndDate || endDate) : todayInputDate();
                      const next = v > cap ? cap : v;
                      setPendingStartDate(next);
                    }}
                  />
                </div>

                {/* End Date */}
                <div className="flex-none w-full sm:w-auto lg:w-[200px]">
                  <label className="block text-xs text-gray-400 mb-1">End Date</label>
                  <DatePicker
                    value={pendingEndDate || endDate}
                    minDate={pendingStartDate || startDate}
                    onChange={(v) => {
                      let next = v;
                      const min = pendingStartDate || startDate;
                      if (next < min) next = min;
                      setPendingEndDate(next);
                    }}
                  />
                </div>

                {/* Chapter Filter */}
                <div className="flex-none w-full sm:w-auto lg:w-[200px]">
                  <FormSelect
                    label="Chapter"
                    placeholder="Select Chapter"
                    options={[
                      { value: "", label: "Select Chapter" },
                      { value: "ekam-buz", label: "EKAM BUZ" },
                      { value: "ekam-main", label: "EKAM MAIN" },
                      { value: "ekam-goal", label: "EKAM GOAL" },
                    ]}
                    value={pendingChapter}
                    onChange={(e) => setPendingChapter(e.target.value)}
                  />
                </div>

                {/* Search Button */}
                <button
                  onClick={() => {
                    // apply pending filters
                    if (pendingStartDate) setStartDate(pendingStartDate);
                    if (pendingEndDate) setEndDate(pendingEndDate);
                    // Chapter selection is now handled differently
                    setPage(1);
                  }}
                  className="h-11 w-full sm:w-auto px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors whitespace-nowrap"
                >
                  Search
                </button>

                {/* Right aligned actions */}
                <div className="ml-auto flex items-end gap-3 sm:w-auto">

                  {/* Print Button */}
                  {false && (
                    <button
                      onClick={() => console.log("Print clicked")}
                      className="h-11 w-36 px-6 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-medium transition-colors whitespace-nowrap"
                    >
                      Print
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Regular User View: Original filters */
        <FilterSection
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onSearch={() => setPage(1)}
          onPrint={() => console.log("Print clicked")}
          onAdd={goToAddP2P}
          addButtonLabel="Add P2P +"
          showSearchButton={true}
          allowFutureEndDate
        />
        )}

        {/* Table Section */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
          {/* Admin View: Show ReportInfoBar */}
          {isDirectorRole && (
            <ReportInfoBar
              chapter="Ekam Buz"
              member=""
              region="Hyderabad"
              fromDate={startDate || "01/10/2025"}
              toDate={endDate || "31/10/2025"}
            />
          )}
          
            {isLoading && <div className="p-4 text-sm text-blue-300">Loading P2P...</div>}
            {error && <div className="p-4 text-sm text-red-400">Failed to load P2P.</div>}

          {/* Table Controls - Only for regular users */}
          {!isDirectorRole && (
            <TableControls
              entriesPerPage={entriesPerPage}
              onEntriesChange={setEntriesPerPage}
              searchTerm={searchColumn ? "" : searchTerm}
              onSearchChange={handleGlobalSearch}
            />
          )}

            {/* Data Table */}
            {error ? (
              <div className="text-red-500 p-4">Error loading data</div>
            ) : (
              <DataTable
                columns={columns}
                data={apiRows}
                searchValues={{ [searchColumn]: searchTerm }}
                onSearchChange={handleSearchChange}
                total={total}
                page={page}
                onPageChange={setPage}
                pageSize={entriesPerPage}
                renderCell={renderCell}
                onRowClick={(row) => {
                  const record = row as P2PRecord;
                  // Parse DD/MM/YYYY and check if future date
                  const [dd, mm, yyyy] = record.date.split("/").map(Number);
                  const recordDate = new Date(yyyy, mm - 1, dd);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (recordDate <= today) setSelectedRecord(record);
                }}
              />
            )}
          </div>
        </GradientContainer>
      </main>

      {/* Remove-from-my-list confirmation. Worth a prompt: the row disappears from
          this member's list and there is no undo in the UI. */}
      {pendingRemoval && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-[#161b22] p-6">
            <h3 className="mb-2 text-lg font-semibold text-white">Remove from your list?</h3>
            <p className="mb-6 text-sm text-gray-300">
              This hides the P2P with{" "}
              <span className="font-medium text-white">{pendingRemoval.meetWith || "this member"}</span>{" "}
              from your list only. The other member keeps their copy and both dashboard
              totals stay the same.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingRemoval(null)}
                className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoval}
                disabled={isRemoving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isRemoving ? "Removing..." : "Remove from my list"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* P2P Thank You Card Modal */}
      {selectedRecord && (
        <P2PThankYouCardModal
          record={selectedRecord}
          userName={userName}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}
