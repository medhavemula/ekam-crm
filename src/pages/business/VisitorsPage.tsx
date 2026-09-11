import React, { useRef, useState } from "react";
import GradientContainer from "../../components/common/GradientContainer";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import TableControls from "../../components/common/TableControls";
import DataTable, { type TableColumn } from "../../components/common/DataTable";
import { useListVisitorsQuery } from "../../services/visitorsApi";
import { useMeQuery } from "../../services/authApi";
import { useToast } from "../../components/toast/ToastProvider";
import EditIcon from "../../assets/icons/Edit.svg";
import LockIcon from "../../assets/icons/lock.svg";

interface VisitorRecord {
  id: string;
  visitorName: string;
  email: string;
  phone: string;
  visitDate: string;
  companyName: string;
  chapterName: string;
  createdAt: string;
  editStatus: React.ReactNode;
}

// Table columns configuration
const columns: TableColumn[] = [
  { key: "visitorName", label: "Visitor Name", sortable: true, searchable: false },
  { key: "email", label: "Email", sortable: true, searchable: false },
  { key: "phone", label: "Phone", sortable: true, searchable: false },
  { key: "chapterName", label: "Chapter", sortable: true, searchable: false },
  { key: "visitDate", label: "Visit Date", sortable: true, searchable: false },
  { key: "companyName", label: "Company Name", sortable: true, searchable: false },
  { key: "editStatus", label: "Edit Access", sortable: false, searchable: false },
];


export default function VisitorsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [userName, setUserName] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});
  const [page, setPage] = useState(1);

  // Fetch current user
  const { data: meRes, error: meError } = useMeQuery();

  // Fetch visitors (server-side paging + global search)
  const { data: visitorsRes, isLoading, error: visitorsError } = useListVisitorsQuery({
    page,
    limit: entriesPerPage,
    q: searchTerm || undefined,
  });

  // Reset page when page-size or global search changes
  React.useEffect(() => {
    setPage(1);
  }, [entriesPerPage, searchTerm]);

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

  // Transform API data to table format with creation timestamp
  const visitorsData = visitorsRes?.data || [];
  const visitors: VisitorRecord[] = visitorsData.map((visitor) => {
    // Type assertion to handle potential additional fields from API
    const visitorWithTimestamp = visitor as any;
    const createdAt = visitorWithTimestamp.createdAt || visitorWithTimestamp.updatedAt || new Date().toISOString();
    const now = new Date();
    const createdDate = new Date(createdAt);
    const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    const canEdit = hoursDiff <= 24;
    
    return {
      id: visitor.id,
      visitorName: visitor.visitorName,
      email: visitor.email || "N/A",
      phone: visitor.phone || "N/A",
      chapterName: visitor.chapterName || "N/A",
      visitDate: new Date(visitor.visitDate).toLocaleDateString("en-GB"),
      companyName: visitor.company || "N/A",
      createdAt: createdAt,
      editStatus: (
    <div
      onClick={(e) => {
        e.stopPropagation();
        handleRowClick({
          id: visitor.id,
          createdAt: createdAt
        } as VisitorRecord);
      }}
      className={`flex items-center gap-2 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors ${
        canEdit ? 'text-green-500' : 'text-orange-500'
      }`}
      title={canEdit ? "Edit Visitor" : "Edit Access Restricted"}
    >
      <img 
        src={canEdit ? EditIcon : LockIcon} 
        alt={canEdit ? "Edit" : "Locked"} 
        className="w-4 h-4" 
      />
      <span>{canEdit ? "Editable" : "Locked"}</span>
    </div>
  ),
    };
  });

  const handleColumnSearchChange = (key: string, value: string) => {
    setColumnSearches({ ...columnSearches, [key]: value });
  };

  const handleAddVisitor = () => {
    navigate("/business/visitors/add");
  };

  const handleRowClick = (row: VisitorRecord) => {
    // Check if visitor was created within the last 24 hours
    const now = new Date();
    const createdAt = new Date(row.createdAt);
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff <= 24) {
      navigate(`/business/visitors/${row.id}/edit`);
    } else {
      showToast({
        title: "Edit Access Restricted",
        description: "Visitors can only be edited within 24 hours of creation.",
        kind: "error"
      });
    }
  };

  // Apply only column-level search on current page data
  const filteredData = visitors.filter((record) => {
    const matchesColumnSearch = columns.every((column) => {
      const searchValue = columnSearches[column.key];
      if (!searchValue) return true;
      return String(record[column.key as keyof VisitorRecord])
        .toLowerCase()
        .includes(searchValue.toLowerCase());
    });

    return matchesColumnSearch;
  });

  const total = visitorsRes?.total ?? visitors.length;

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Visitors" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb and Add Button */}
        <div className="flex items-center justify-between mb-6">
          <PageHeader breadcrumbs={breadcrumbs} />
          <button
            onClick={handleAddVisitor}
            className="px-6 py-2 bg-[#D85D27] hover:hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors"
          >
            Add Visitor +
          </button>
        </div>

        {/* Table Section */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            {/* Table Controls */}
            <TableControls
              entriesPerPage={entriesPerPage}
              onEntriesChange={setEntriesPerPage}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />

            {/* Loading/Error States */}
            {isLoading && (
              <div className="p-8 text-center text-gray-400">Loading visitors...</div>
            )}
            {visitorsError && (
              <div className="p-8 text-center text-red-400">
                Failed to load visitors. Please try again.
              </div>
            )}

            {/* Data Table (read-only, no row clicks) */}
            {!isLoading && !visitorsError && (
              <>
                <DataTable
                  columns={columns}
                  data={filteredData}
                  searchValues={columnSearches}
                  onSearchChange={handleColumnSearchChange}
                  onRowClick={handleRowClick}
                  renderCell={(column, row) => {
                    if (column.key === 'editStatus') {
                      return row.editStatus;
                    }
                    return null;
                  }}
                  total={total}
                  page={page}
                  pageSize={entriesPerPage}
                  onPageChange={(p) => setPage(p)}
                />
              </>
            )}
          </div>
        </GradientContainer>
      </main>
    </div>
  );
}
