import { useState, useRef, useEffect } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import DataTable from "../../../components/common/DataTable";
import type { TableColumn } from "../../../components/common/DataTable";
import FormSelect from "../../../components/forms/FormSelect";
import { useGetTotalMembersQuery } from "../../../services/superadmin/adminFranchiseApi";
import type { MemberFilters } from "../../../services/superadmin/adminFranchiseApi";

// Table columns configuration
/** The API limit and the table footer read the same number. */
const PAGE_SIZE = 20;

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "CHAPTER_DIRECTOR", label: "Chapter Director" },
  { value: "REGIONAL_DIRECTOR", label: "Regional Director" },
  { value: "ASSISTANT_REGIONAL_DIRECTOR", label: "Assistant Regional Director" },
  { value: "SUPPORT_DIRECTOR", label: "Support Director" },
];

const columns: TableColumn[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    searchable: true,
  },
  { key: "email", label: "Email", sortable: true, searchable: true },
  { key: "phone", label: "Phone", sortable: true, searchable: true },
  { key: "role", label: "Role", sortable: true, searchable: true },
  { key: "chapter", label: "Chapter", sortable: true, searchable: true },
  { key: "region", label: "Region", sortable: true, searchable: true },
  { key: "area", label: "Area", sortable: true, searchable: true },
  { key: "status", label: "Status", sortable: true, searchable: true },
];


export default function FranchiseMembersListPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
  // Get edId from location state (passed from FranchisePartnerDetailPage)
  const edId = location.state?.edId || id;

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [chapterFilter, setChapterFilter] = useState("");
  
  // Local states for form inputs
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [localRoleFilter, setLocalRoleFilter] = useState("");
  const [localChapterFilter, setLocalChapterFilter] = useState("");
  const reduceMotion = useReducedMotion();

  // Build filters object for API
  const filters: MemberFilters = {
    page,
    limit: PAGE_SIZE,
    search: searchQuery || undefined,
    role: roleFilter || undefined,
    chapter: chapterFilter || undefined,
  };

  // API Integration - Only call API if edId is available
  // The query previously exposed only `data`, so a failed or in-flight request
  // rendered as an empty table — indistinguishable from a partner with no members.
  const { data, isLoading, error } = useGetTotalMembersQuery(
    edId ? { edId: edId, filters: edId ? filters : {} } : { edId: "", filters: {} },
    {
      skip: !edId, // Skip the query if edId is not available
    }
  );

  // Transform API data to match table column keys
  const apiMembers =
    data?.data?.data?.map((item: any) => {
      return {
        id: item.id,
        name: item.name || "-",
        email: item.email || "-",
        phone: item.phone || "-",
        role: item.role || "-",
        chapter: item.chapter?.name || "-",
        // The type says string, but this same API normalises region from an
        // object shape on other endpoints, and chapter above is an object here.
        // Unwrapping either form costs a line and stops "[object Object]"
        // reaching a cell if the endpoint ever sends the richer one.
        region:
          (typeof item.region === "object" && item.region !== null
            ? (item.region as { name?: string }).name
            : item.region) || "-",
        area: item.area || "-",
        status: item.status || "-",
        membershipId: item.membershipId || "-",
        joinDate: item.joinDate ? new Date(item.joinDate).toLocaleDateString('en-GB') : "-",
        membershipType: item.membershipType || "-",
        lastActivity: item.lastActivity ? new Date(item.lastActivity).toLocaleDateString('en-GB') : "-",
      };
    }) || [];

  const membersData = apiMembers.length > 0 ? apiMembers : [];

  // Get unique options for filters
  const chapterOptions: { value: string; label: string }[] = [
    { value: "", label: "All Chapters" },
    ...Array.from(new Set(membersData.map((m: any) => m.chapter).filter(Boolean)))
      .map((chapter) => ({
        value: chapter as string,
        label: chapter as string,
      })),
  ];

  // Column search states
  const [, setColumnSearches] = useState<{
    [key: string]: string;
  }>({});

  // Buffer for column search values
  const [bufferedColumnSearches, setBufferedColumnSearches] = useState<{
    [key: string]: string;
  }>({});
  
  // Debounce timer for column searches
  const columnSearchTimeoutRef = useRef<number | undefined>(undefined);

  // Handle search when button is clicked
  const handleSearch = () => {
    // Apply local filter values to actual filter states
    setSearchQuery(localSearchQuery);
    setRoleFilter(localRoleFilter);
    setChapterFilter(localChapterFilter);
    setPage(1);
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clean up column search timeout on unmount
  useEffect(() => {
    return () => {
      if (columnSearchTimeoutRef.current) {
        clearTimeout(columnSearchTimeoutRef.current);
      }
    };
  }, []);

  // Filter data based on search (now handled by API)
  const filteredMembers = membersData;


  
  // Handle column search changes
  const handleColumnSearchChange = (key: string, value: string) => {
    // Update buffered value immediately for UI
    setBufferedColumnSearches(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Clear existing timeout
    if (columnSearchTimeoutRef.current) {
      clearTimeout(columnSearchTimeoutRef.current);
    }
    
    // Set new timeout to apply search after 500ms
    columnSearchTimeoutRef.current = window.setTimeout(() => {
      setColumnSearches(prev => ({
        ...prev,
        [key]: value
      }));
      setPage(1);
    }, 500);
  };

  const totalMembers = data?.data?.pagination?.total ?? filteredMembers.length;

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <button
          type="button"
          onClick={() => navigate("/admin/franchise")}
          className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-[13px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Franchise Partner
        </button>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
        >
          <div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
              Members
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-ink-4)]">
              <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
                {totalMembers}
              </span>{" "}
              {totalMembers === 1 ? "member" : "members"} under this partner
            </p>
          </div>

          {/* One search box, not two. The page had a labelled input with a Search
              button above the table and a second input inside the table header,
              both bound to the same state - typing in either filled the other. */}
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="relative w-full sm:w-64">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ov-ink-4)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search name, email or phone"
                aria-label="Search members"
                className="h-11 w-full rounded-xl bg-[var(--ov-fill-subtle)] pl-9 pr-3 text-[13px] text-[var(--ov-ink)] ring-1 ring-[color:var(--ov-line)] transition-colors placeholder:text-[var(--ov-ink-5)] focus:bg-[var(--ov-fill-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ov-ember)]"
              />
            </div>

            <div className="w-full sm:w-44">
              <FormSelect
                label="Role"
                hideLabel
                value={localRoleFilter}
                onChange={(e) => setLocalRoleFilter(e.target.value)}
                options={ROLE_FILTER_OPTIONS}
                className="w-full"
              />
            </div>

            <div className="w-full sm:w-48">
              <FormSelect
                label="Chapter"
                hideLabel
                value={localChapterFilter}
                onChange={(e) => setLocalChapterFilter(e.target.value)}
                options={chapterOptions}
                className="w-full"
              />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              className="h-11 rounded-xl px-4 text-[12.5px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            >
              Apply
            </button>
          </div>
        </motion.div>

        {error ? (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
            Couldn't load members. Check your connection and try again.
          </div>
        ) : isLoading ? (
          // Skeleton rows rather than a spinner that replaces the whole table:
          // the shape of what is loading is itself information.
          <div className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] ring-1 ring-[color:var(--ov-line)]">
            <div className="h-12 bg-[var(--ov-raised)]" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse border-t border-[color:var(--ov-line-faint)] bg-[var(--ov-panel)]"
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]"
          >
            <DataTable
              columns={columns}
              data={filteredMembers}
              searchValues={bufferedColumnSearches}
              onSearchChange={handleColumnSearchChange}
              total={totalMembers}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={(p) => setPage(p)}
              renderCell={(column, row) => {
                // The role arrives as a raw enum. Underscored SHOUTING is a
                // database value, not a label a reader should have to decode.
                if (column.key === "role") {
                  const role = String(row.role ?? "");
                  if (!role || role === "-") return <span className="text-[var(--ov-ink-5)]">—</span>;
                  return (
                    <span>
                      {role
                        .toLowerCase()
                        .split("_")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                    </span>
                  );
                }
                if (column.key === "status") {
                  // Status wears the reserved status tokens so it holds up on
                  // any theme, and the value is matched case-insensitively
                  // because the API is not consistent about it.
                  const raw = String(row.status ?? "").toLowerCase();
                  const tone =
                    raw === "active"
                      ? "bg-[var(--ov-success-wash)] text-[var(--ov-success)]"
                      : raw === "blocked" || raw === "expired"
                        ? "bg-[var(--ov-danger-wash)] text-[var(--ov-danger)]"
                        : raw === "inactive" || raw === "pending"
                          ? "bg-[var(--ov-ember-wash)] text-[var(--ov-ember)]"
                          : "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-4)]";
                  if (!raw || raw === "-") return <span className="text-[var(--ov-ink-5)]">—</span>;
                  return (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-medium ${tone}`}
                    >
                      {raw.charAt(0).toUpperCase() + raw.slice(1)}
                    </span>
                  );
                }
                return null;
              }}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
