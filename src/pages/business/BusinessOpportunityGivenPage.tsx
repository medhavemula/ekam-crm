import GradientContainer from "../../components/common/GradientContainer";
import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import FilterSection from "../../components/common/FilterSection";
import TableControls from "../../components/common/TableControls";
import DataTable from "../../components/common/DataTable";
import type { TableColumn } from "../../components/common/DataTable";
import { useListGivenOpportunitiesQuery } from "../../services/opportunityApi";
import { useAppSelector } from "../../app/store";
import { toStartOfLocalDayISO, toEndOfLocalDayISO, getFirstDayOfMonth, getLastDayOfMonth } from "../../utils/date";
import { useToast } from "../../components/toast/ToastProvider";
import { useDebounce } from "use-debounce";

interface BusinessOpportunityRecord {
  id: number;
  date: string;
  from: string;
  email: string;
  phone: string;
  comments: string;
  status: string;
  amount: string;
}


// Table columns configuration
const columns: TableColumn[] = [
  // { key: "date", label: "Date", sortable: true, searchable: false },
  { key: "from", label: "To", sortable: true, searchable: false },
  { key: "contactName", label: "Contact Name", sortable: true, searchable: false },
  // { key: "email", label: "Email", sortable: true, searchable: false },
  { key: "phone", label: "Phone", sortable: true, searchable: false },
  { key: "comments", label: "Looking For", sortable: true, searchable: false },
  { key: "status", label: "Status", sortable: true, searchable: false },
  { key: "amount", label: "Amount", sortable: true, searchable: false },
];

export default function BusinessOpportunityGivenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const authUser = useAppSelector((s) => s.auth.user);
  // Pending (UI) filters. They start on the same defaults as the applied ones
  // so Search can push them across verbatim - an empty pending value used to
  // mean "untouched", which left no way to apply a cleared field.
  const [pendingStartDate, setPendingStartDate] = useState<string>(() => getFirstDayOfMonth());
  const [pendingEndDate, setPendingEndDate] = useState<string>(() => getLastDayOfMonth());
  // Applied filters
  const [startDate, setStartDate] = useState(() => pendingStartDate);
  const [endDate, setEndDate] = useState(() => pendingEndDate);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [_debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const displayName = authUser?.name || "";

  // Build ISO params from the selected days, anchored to the member's own
  // timezone so the window covers the days they actually picked.
  const fromISO = React.useMemo(() => toStartOfLocalDayISO(startDate), [startDate]);
  const toISO = React.useMemo(() => toEndOfLocalDayISO(endDate), [endDate]);

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

  const queryArgs = React.useMemo(() => ({
    from: fromISO,
    to: toISO,
    limit: entriesPerPage,
    offset: (page - 1) * entriesPerPage,
    page,
    q: searchTerm || undefined,
  }), [fromISO, toISO, entriesPerPage, page, searchTerm]);

  // Fetch opportunities given with from/to only once
  const { data: opportunitiesRes, isLoading, error: opportunitiesError } = useListGivenOpportunitiesQuery(
    queryArgs,
    { refetchOnFocus: false, refetchOnReconnect: false, refetchOnMountOrArgChange: false }
  );

  // Check authentication from token presence
  React.useEffect(() => {
    const hasToken = typeof localStorage !== "undefined" && localStorage.getItem("accessToken");
    if (!hasToken) navigate("/login");
  }, [navigate]);

  // no separate users/me call; name comes from store

  // Reset page when entries or dates change
  React.useEffect(() => {
    setPage(1);
  }, [entriesPerPage, startDate, endDate]);

  // Show toast if navigated with toast payload (StrictMode-safe)
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
  const data: BusinessOpportunityRecord[] = opportunities.map((opp: any) => {
    const statusCode: string = opp?.status || opp?.derivedStatus || "NOT_CONTACTED";
    return {
      id: (opp?.id ?? opp?._id) as any,
      date: new Date(opp.createdAt).toLocaleDateString("en-GB"),
      from: opp?.receiver?.name || "N/A",
      contactName: opp?.contact?.name || "N/A",
      email: opp?.contact?.email || "N/A",
      phone: opp?.contact?.phone || "N/A",
      comments: opp?.comments || "",
      status: STATUS_LABELS[statusCode] || statusCode,
      amount: opp?.amount ? String(opp.amount) : "",
    };
  });

  // Navigate to dedicated add page
  const goToAddGiven = () => navigate("/business/opportunity-given/add");

  const filteredData = data; // No client-side filtering needed as it's handled by the API

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Business Opportunity Given" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={displayName} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* Filters Section */}
        <FilterSection
          startDate={pendingStartDate}
          endDate={pendingEndDate}
          onStartDateChange={setPendingStartDate}
          onEndDateChange={setPendingEndDate}
          onSearch={() => {
            setStartDate(pendingStartDate);
            setEndDate(pendingEndDate);
            setPage(1);
          }}
          onPrint={() => console.log("Print clicked")}
          onAdd={goToAddGiven}
          addButtonLabel="Add Oppourtunity Given +"
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
              <div className="p-8 text-center text-gray-400">Loading opportunities...</div>
            )}
            {opportunitiesError && (
              <div className="p-8 text-center text-red-400">
                Failed to load opportunities. Please try again.
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
                />
              </>
            )}
          </div>
        </GradientContainer>
      </main>

      {/* Removed modal in favor of dedicated Add page */}
    </div>
  );
}
