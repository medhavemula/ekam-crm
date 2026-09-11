import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import FilterSection from "../../../components/common/FilterSection";
import TableControls from "../../../components/common/TableControls";
import DataTable, { type TableColumn } from "../../../components/common/DataTable";
import GradientContainer from "../../../components/common/GradientContainer";
import { useListClosedOpportunitiesQuery } from "../../../services/opportunityApi";
import { toStartOfDayISO, toEndOfDayISO, getFirstDayOfMonth, getLastDayOfMonth } from "../../../utils/date";
import { useAppSelector } from "../../../app/store";
import { useToast } from "../../../components/toast/ToastProvider";
import { useDebounce } from "use-debounce";
import DownloadableCardModal, { EkamCardHeader, EkamCardFooter } from "../../../components/common/DownloadableCardModal";

interface BusinessClosedRecord {
  id: number;
  date: string;
  thanksTo: string;
  amount: string;
  businessOpportunity: string;
  comments: string;
  status: string;
  receiverName: string;
}

// Thank You Card Modal Component
function ThankYouCardModal({
  record,
  userName,
  onClose,
}: {
  record: BusinessClosedRecord;
  userName: string;
  onClose: () => void;
}) {
  return (
    <DownloadableCardModal
      fileName={`thank-you-${record.id || Date.now()}`}
      onClose={onClose}
    >
      {/* The Card (for download) - Using inline styles to avoid oklch color parsing issues with html2canvas */}
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

        {/* Card Body */}
        <div style={{ padding: "24px" }}>
            {/* To / From */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                <span style={{ color: "#9CA3AF", fontSize: "24px", minWidth: "78px",whiteSpace: "nowrap" }}>TQ To:</span>
                <span style={{ color: "#ffffff", fontWeight: 600, fontSize: "24px" }}>{record.thanksTo}</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span style={{ color: "#9CA3AF", fontSize: "14px", minWidth: "50px" }}>From:</span>
                <span style={{ color: "#ffffff", fontWeight: 600, fontSize: "18px" }}>{userName}</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.1)", marginBottom: "20px" }} />

            {/* Amount & Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              <div style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p style={{ color: "#9CA3AF", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px", margin: "0 0 4px 0" }}>Business Value</p>
                <p style={{ color: "#D85D27", fontSize: "24px", fontWeight: 700, margin: 0 }}>₹ {record.amount}</p>
              </div>
              <div style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p style={{ color: "#9CA3AF", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px", margin: "0 0 4px 0" }}>Date</p>
                <p style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, margin: 0 }}>{record.date}</p>
              </div>
            </div>

            {/* Message / Comments */}
            {record.comments && (
              <div style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "20px" }}>
                <p style={{ color: "#9CA3AF", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", margin: "0 0 8px 0" }}>Message</p>
                <p style={{ color: "#F3F4F6", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>{record.comments}</p>
              </div>
            )}

            {/* Generic Thank You Message */}
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


// Table columns configuration
const columns: TableColumn[] = [
  { key: "date", label: "Date", sortable: true, searchable: false },
  { key: "thanksTo", label: "Thanks To", sortable: true, searchable: false },
  { key: "amount", label: "Amount", sortable: true, searchable: false },
  { key: "comments", label: "Comments", sortable: true, searchable: false },
  { key: "status", label: "Status", sortable: true, searchable: false },
];

export default function BusinessClosedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const authUser = useAppSelector((s) => s.auth.user);
  // Pending (UI) filters
  const [pendingStartDate, setPendingStartDate] = useState<string>("");
  const [pendingEndDate, setPendingEndDate] = useState<string>("");
  // Applied filters
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  // State for Thank You card modal
  const [selectedRecord, setSelectedRecord] = useState<BusinessClosedRecord | null>(null);

  const displayName = authUser?.name || "";

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

  // Fetch closed opportunities using from/to ISO
  const fromISO = React.useMemo(() => toStartOfDayISO(startDate), [startDate]);
  const toISO = React.useMemo(() => toEndOfDayISO(endDate), [endDate]);
  const { data: opportunitiesRes, isLoading, error: opportunitiesError } = useListClosedOpportunitiesQuery({
    from: fromISO,
    to: toISO,
    limit: entriesPerPage,
    page: page,
    offset: (page - 1) * entriesPerPage,
    q: debouncedSearchTerm || undefined,
  });

  // Check authentication based on token presence
  React.useEffect(() => {
    const hasToken = typeof localStorage !== "undefined" && localStorage.getItem("accessToken");
    if (!hasToken) navigate("/login");
  }, [navigate]);

  // No users/me call; name comes from store

  // Reset page when entries, dates, or search changes
  React.useEffect(() => {
    setPage(1);
  }, [entriesPerPage, startDate, endDate, debouncedSearchTerm]);

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
  const data: BusinessClosedRecord[] = opportunities.map((opp) => ({
    id: opp.id as any,
    date: opp.closedAt ? new Date(opp.closedAt).toLocaleDateString("en-GB") : "N/A",
    // WEB-BUS-13: a manually-added deal with no referral is self-credited server
    // side so the record has a valid giver, which would otherwise render as the
    // member's own name here - misleadingly implying they referred themselves.
    // The External tag on opportunitySource is what actually happened.
    thanksTo: opp.opportunitySource === "External" ? "External" : opp.creditedGiver?.name || "N/A",
    amount: opp.amount ? opp.amount.toLocaleString() : "0",
    businessOpportunity: opp.receiver?.name || "N/A",
    comments: opp.comments || "",
    status: opp.status || "COMPLETED",
    receiverName: opp.receiver?.name || "N/A",
  }));

  // Navigate to add page
  const goToAddBusinessClosed = () => navigate("/business/business-received/add");

  // Apply client-side filtering
  const filteredData = data.filter((record) => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return true;
    }

    // If there's a column-specific search, only search that column
    if (searchColumn) {
      const value = String(record[searchColumn as keyof BusinessClosedRecord] || '').toLowerCase();
      return value.includes(normalizedSearchTerm);
    }
    
    // Otherwise, search all searchable columns
    return columns.some(column => {
      if (!column.searchable) return false;
      const value = String(record[column.key as keyof BusinessClosedRecord] || '').toLowerCase();
      return value.includes(normalizedSearchTerm);
    });
  });

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Business Closed" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={displayName} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* Filters Section */}
        <FilterSection
          startDate={pendingStartDate || startDate}
          endDate={pendingEndDate || endDate}
          onStartDateChange={setPendingStartDate}
          onEndDateChange={setPendingEndDate}
          requireEndDate={true}
          onSearch={() => {
            if (pendingStartDate) setStartDate(pendingStartDate);
            if (pendingEndDate) setEndDate(pendingEndDate);
            setPage(1);
          }}
          onPrint={() => console.log("Print clicked")}
          onAdd={goToAddBusinessClosed}
          addButtonLabel="Add Business Closed +"
          showSearchButton={true}
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
              <div className="p-8 text-center text-gray-400">Loading closed opportunities...</div>
            )}
            {opportunitiesError && (
              <div className="p-8 text-center text-red-400">
                Failed to load closed opportunities. Please try again.
              </div>
            )}

            {/* Data Table */}
            {!isLoading && !opportunitiesError && (
              <>
                <DataTable
                  columns={columns}
                  data={filteredData}
                  searchValues={{ [searchColumn]: searchTerm }}
                  onSearchChange={handleSearchChange}
                  total={(opportunitiesRes as any)?.total}
                  page={page}
                  pageSize={entriesPerPage}
                  onPageChange={(p) => setPage(p)}
                  onRowClick={(row) => setSelectedRecord(row as BusinessClosedRecord)}
                />
              </>
            )}
          </div>
        </GradientContainer>
      </main>

      {/* Thank You Card Modal */}
      {selectedRecord && (
        <ThankYouCardModal
          record={selectedRecord}
          userName={displayName}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}
