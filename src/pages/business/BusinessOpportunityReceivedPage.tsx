import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import TableControls from "../../components/common/TableControls";
import DataTable, { type TableColumn } from "../../components/common/DataTable";
import GradientContainer from "../../components/common/GradientContainer";
import FilterSection from "../../components/common/FilterSection";
import { useListReceivedOpportunitiesQuery } from "../../services/opportunityApi";
import { useAppSelector } from "../../app/store";
import { toStartOfDayISO, toEndOfDayISO, getLastDayOfMonth, getFirstDayOfMonth } from "../../utils/date";
import { useToast } from "../../components/toast/ToastProvider";
import { useDebounce } from "use-debounce";
import DownloadableCardModal, { EkamCardFooter, EkamCardHeader } from "../../components/common/DownloadableCardModal";

interface BusinessOpportunityReceivedRecord {
  id: number;
  name: string;
  email: string;
  phone: string;
  date: string;
  amount?: string;
  comments?: string;
  status: string; // human-friendly label
  statusCode?: string; // original status code for logic
  giverId?: string;
  giverName?: string;
}

function ThankYouCardModal({
  record,
  receiverName,
  onClose,
}: {
  record: BusinessOpportunityReceivedRecord;
  receiverName: string;
  onClose: () => void;
}) {
  const toName = record.giverName || "N/A";
  const fromName = receiverName || "N/A";

  return (
    <DownloadableCardModal fileName={`thank-you-${record.id || Date.now()}`} onClose={onClose}>
      <div
        style={{
          width: "420px",
          maxWidth: "100%",
          borderRadius: "20px",
          overflow: "hidden",
          background: "linear-gradient(145deg, #0D1117 0%, #1E2630 60%, #2a1a10 100%)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <EkamCardHeader title="Thank You For Your Business" />

        <div style={{ padding: "24px" }}>
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
              <span style={{ color: "#9CA3AF", fontSize: "24px", fontWeight: 600, minWidth: "78px", whiteSpace: "nowrap" }}>TQ To:</span>
              <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "24px", lineHeight: 1.25 }}>{toName}</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
              <span style={{ color: "#9CA3AF", fontSize: "16px", fontWeight: 600, minWidth: "70px" }}>From:</span>
              <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "18px", lineHeight: 1.25 }}>{fromName}</span>
            </div>
          </div>

          <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.1)", marginBottom: "20px" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p
                style={{
                  color: "#9CA3AF",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "4px",
                  margin: "0 0 4px 0",
                }}
              >
                Business Value
              </p>
              <p style={{ color: "#D85D27", fontSize: "24px", fontWeight: 700, margin: 0 }}>
                ₹ {record.amount || "0"}
              </p>
            </div>
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p
                style={{
                  color: "#9CA3AF",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "4px",
                  margin: "0 0 4px 0",
                }}
              >
                Date
              </p>
              <p style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, margin: 0 }}>{record.date}</p>
            </div>
          </div>

          {record.comments && (
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid rgba(255,255,255,0.1)",
                marginBottom: "20px",
              }}
            >
              <p
                style={{
                  color: "#9CA3AF",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                  margin: "0 0 8px 0",
                }}
              >
                Message
              </p>
              <p style={{ color: "#F3F4F6", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>{record.comments}</p>
            </div>
          )}

          <div style={{ textAlign: "center", paddingTop: "8px" }}>
            <p style={{ color: "#D1D5DB", fontSize: "14px", fontStyle: "italic", margin: 0 }}>
              "We truly appreciate your trust and support."
            </p>
          </div>
        </div>

        <EkamCardFooter />
      </div>
    </DownloadableCardModal>
  );
}

// Status color configuration
const getStatusColor = (statusCode: string) => {
  switch (statusCode) {
    case "NOT_CONTACTED":
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    case "CONTACTED":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "NO_RESPONSE":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "WON":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "LOST":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "NOT_A_GOOD_FIT":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
};

// Custom cell renderer for status column
const createStatusCellRenderer = (navigate: any, setSelectedRecord: any) => {
  return (column: TableColumn, row: BusinessOpportunityReceivedRecord) => {
    if (column.key === "status") {
      const statusCode = row.statusCode || "NOT_CONTACTED";
      const colorClass = getStatusColor(statusCode);
      
      return (
        <button
          className={`inline-flex px-4 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 ${colorClass}`}
          onClick={() => {
            // Use the same logic as handleRowClick
            if (row.statusCode === "WON") {
              setSelectedRecord(row);
              return;
            }
            navigate(`/business/opportunity-received/edit/${row.id}`, {
              state: { ...row, comments: "", giverId: row.giverId, giverName: row.giverName },
            });
          }}
          title={`Click to edit this opportunity`}
        >
          {row.status}
        </button>
      );
    }
    return null;
  };
};

// Table columns configuration
const columns: TableColumn[] = [
  { key: "giverName", label: "From", sortable: true, searchable: false },
  { key: "name", label: "Contact Name", sortable: true, searchable: false },
  // { key: "email", label: "Email", sortable: true, searchable: false },
  { key: "phone", label: "Phone", sortable: true, searchable: false },
  { key: "date", label: "Date", sortable: true, searchable: false },
  { key: "status", label: "Status", sortable: true, searchable: false },
];

export default function BusinessOpportunityReceivedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const authUser = useAppSelector((s) => s.auth.user);
  const [selectedRecord, setSelectedRecord] = useState<BusinessOpportunityReceivedRecord | null>(null);
  // Default to current week
  // Pending (UI) filters
  const [pendingStartDate, setPendingStartDate] = useState<string>("");
  const [pendingEndDate, setPendingEndDate] = useState<string>("");
  const [pendingStatus, setPendingStatus] = useState<string>("");
  // Applied filters
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
const [endDate, setEndDate] = useState(getLastDayOfMonth());
  const [statusFilter, setStatusFilter] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [_debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const displayName = authUser?.name || "";

  // Build ISO params (start/end of day) using utils
  const fromISO = React.useMemo(() => toStartOfDayISO(startDate), [startDate]);
  const toISO = React.useMemo(() => toEndOfDayISO(endDate), [endDate]);

  // Handle search changes
  const handleSearchChange = (key: string, value: string) => {
    setSearchColumn(key);
    setSearchTerm(value);
    setPage(1);
  };

  // Handle global search
  const handleGlobalSearch = (value: string) => {
    setSearchTerm(value);
    setSearchColumn("");
    setPage(1);
  };

  // Fetch opportunities received with from/to
  const queryArgs = React.useMemo(() => ({
    status: statusFilter || undefined,
    from: fromISO,
    to: toISO,
    limit: entriesPerPage,
    offset: (page - 1) * entriesPerPage,
    page: page,
    q: searchTerm || undefined,
  }), [statusFilter, fromISO, toISO, entriesPerPage, page, searchTerm]);

  const { data: opportunitiesRes, isLoading, error: opportunitiesError } = useListReceivedOpportunitiesQuery(
    queryArgs,
    { refetchOnFocus: false, refetchOnReconnect: false, refetchOnMountOrArgChange: false }
  );

  // Check authentication from token presence
  React.useEffect(() => {
    const hasToken = typeof localStorage !== "undefined" && localStorage.getItem("accessToken");
    if (!hasToken) navigate("/login");
  }, [navigate]);

  // no separate users/me call; name comes from store

  // Reset page on key changes
  React.useEffect(() => {
    setPage(1);
  }, [entriesPerPage, startDate, endDate, statusFilter]);

  // StrictMode-safe toast display for navigation state
  const shownOnceRef = useRef(false);
  React.useEffect(() => {
    if (shownOnceRef.current) return;
    shownOnceRef.current = true;
    const state: any = location.state;
    if (state?.toast) {
      navigate(location.pathname, { replace: true, state: {} });
      showToast(state.toast);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Transform API data to table format
  const opportunities = opportunitiesRes?.data || [];
  const STATUS_LABELS: Record<string, string> = {
    NOT_CONTACTED: "Not Contacted Yet",
    CONTACTED: "Contacted",
    NO_RESPONSE: "No Response",
    WON: "Got The Business",
    LOST: "Did Not Get The Business",
    NOT_A_GOOD_FIT: "Not a Good Fit",
  };
  const data: BusinessOpportunityReceivedRecord[] = opportunities.map((opp) => {
    const statusCode = opp.status || "NOT_CONTACTED";
    return {
      id: ((opp as any)?.id ?? (opp as any)?._id) as any,
      name: opp.contact?.name || "N/A",
      email: opp.contact?.email || "N/A",
      phone: opp.contact?.phone || "N/A",
      date: new Date(opp.createdAt).toLocaleDateString("en-GB"),
      amount:
        (opp as any)?.amount !== undefined && (opp as any)?.amount !== null
          ? String((opp as any)?.amount)
          : undefined,
      comments: (opp as any)?.comments || "",
      status: STATUS_LABELS[statusCode] || statusCode,
      statusCode,
      giverId: (opp as any)?.giver?.id || (opp as any)?.giver?._id || undefined,
      giverName: (opp as any)?.giver?.name || "N/A",
    };
  });

  const handleRowClick = (record: BusinessOpportunityReceivedRecord) => {
    // Prevent editing if opportunity is already won (closed)
    if (record.statusCode === "WON") {
      setSelectedRecord(record);
      return;
    }
    navigate(`/business/opportunity-received/edit/${record.id}`, {
      state: { ...record, comments: "", giverId: record.giverId, giverName: record.giverName },
    });
  };

  const filteredData = data;

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Business Opportunity Received" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={displayName} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* Filters Section (reused) with Status dropdown */}
        <FilterSection
          startDate={pendingStartDate || startDate}
          endDate={pendingEndDate || endDate}
          onStartDateChange={setPendingStartDate}
          onEndDateChange={setPendingEndDate}
          onSearch={() => {
            if (pendingStartDate) setStartDate(pendingStartDate);
            if (pendingEndDate) setEndDate(pendingEndDate);
            setStatusFilter(pendingStatus);
            setPage(1);
          }}
          showSearchButton={true}
          showDropdown
          dropdownLabel="Status"
          dropdownOptions={[
            { label: "All", value: "" },
            { label: "Not Contacted Yet", value: "NOT_CONTACTED" },
            { label: "Contacted", value: "CONTACTED" },
            { label: "No Response", value: "NO_RESPONSE" },
            { label: "Got The Business", value: "WON" },
            { label: "Did Not Get The Business", value: "LOST" },
            { label: "Not a Good Fit", value: "NOT_A_GOOD_FIT" },
          ]}
          dropdownValue={pendingStatus || statusFilter}
          onDropdownChange={setPendingStatus}
          skipAutoInit
          deferApply={false}
        />

        {/* Table Section */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            {/* Table Controls */}
            <TableControls
              entriesPerPage={entriesPerPage}
              onEntriesChange={setEntriesPerPage}
              searchTerm={searchColumn ? "" : searchTerm}
              onSearchChange={handleGlobalSearch}
            />

            {/* Loading/Error States */}
            {isLoading && (
              <div className="p-8 text-center text-gray-400">Loading opportunities...</div>
            )}
            {opportunitiesError && (
              <div className="p-8 text-center text-red-400">
                Failed to load opportunities. Please try again.
              </div>
            )}

            {/* Data Table with clickable rows -> navigate to edit page */}
            {!isLoading && !opportunitiesError && (
              <>
                <DataTable
                  columns={columns}
                  data={filteredData}
                  searchValues={{ [searchColumn]: searchTerm }}
                  onSearchChange={handleSearchChange}
                  onRowClick={(row) => handleRowClick(row as BusinessOpportunityReceivedRecord)}
                  total={(opportunitiesRes as any)?.total}
                  page={page}
                  onPageChange={(p) => setPage(p)}
                  pageSize={entriesPerPage}
                  renderCell={createStatusCellRenderer(navigate, setSelectedRecord)}
                />
              </>
            )}
          </div>
        </GradientContainer>
      </main>

      {selectedRecord && (
        <ThankYouCardModal
          record={selectedRecord}
          receiverName={displayName}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}
