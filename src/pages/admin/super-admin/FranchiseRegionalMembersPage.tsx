import { useState, useRef, useEffect } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Plus, Search as SearchIcon } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import DataTable from "../../../components/common/DataTable";
import type { TableColumn } from "../../../components/common/DataTable";
import FormSelect from "../../../components/forms/FormSelect";
import { useGetRegionalMembersQuery } from "../../../services/superadmin/adminFranchiseApi";
import type { MemberFilters } from "../../../services/superadmin/adminFranchiseApi";

// Table columns configuration
/** The API limit and the table footer must agree, or the page count is computed
 *  from a different size than the one being fetched. */
const PAGE_SIZE = 10;

const columns: TableColumn[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    searchable: true,
  },
  { key: "chapter", label: "Chapter", sortable: true, searchable: true },
  { key: "region", label: "Region", sortable: true, searchable: true },
  { key: "area", label: "Area", sortable: true, searchable: true },
  { key: "role", label: "Role", sortable: true, searchable: true },
  { key: "status", label: "Status", sortable: true, searchable: true },
];

export default function FranchiseRegionalMembersPage() {
  const navigate = useNavigate();
  const { edId: edIdParam } = useParams();
  const location = useLocation();

  // edId lives in the URL so the page survives a refresh or a shared link. The
  // location-state fallback keeps older in-app links working.
  const edId = edIdParam || location.state?.edId;

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  
  // Local states for form inputs
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const reduceMotion = useReducedMotion();
  const [localRoleFilter, setLocalRoleFilter] = useState("");

  // Build filters object for API
  const filters: MemberFilters = {
    page,
    limit: PAGE_SIZE,
    search: searchQuery || undefined,
    role: roleFilter || undefined,
  };

  // API Integration - Only call API if edId is available
  const { data, isLoading, error } = useGetRegionalMembersQuery(
    edId ? { edId: edId, filters: edId ? filters : {} } : { edId: "", filters: {} },
    {
      skip: !edId, // Skip the query if edId is not available
    }
  );

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

  // Transform API data to match table structure
  const membersData = data?.data?.data?.map((member: any) => ({
    id: member.id,
    name: member.name || "-",
    email: member.email || "-",
    phone: member.phone || "-",
    role: member.role || "-",
    chapter: member.chapter?.name || "-",
    region: member.region || "-",
    area: member.area || "-",
    joinDate: member.registrationDate ? new Date(member.registrationDate).toLocaleDateString('en-GB') : "-",
    status: member.status || "-",
  })) || [];

  // Get unique options for role filter
  const roleOptions: { value: string; label: string }[] = [
    { value: "", label: "All Roles" },
    { value: "REGIONAL_DIRECTOR", label: "Regional Director" },
    { value: "ASSISTANT_REGIONAL_DIRECTOR", label: "Assistant Regional Director" },
    { value: "CHAPTER_DIRECTOR", label: "Chapter Director" },
    { value: "SUPPORT_DIRECTOR", label: "Support Director" },
  ];




  const handleCreateMember = () => {
    navigate(`/admin/franchise/regional-members/${edId}/create`);
  };

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

  const backToPartners = (
    <button
      type="button"
      onClick={() => navigate("/admin/franchise")}
      className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-[13px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Franchise Partner
    </button>
  );

  // Without an ED there is nothing to query, so say so instead of rendering an
  // empty table that looks like a partner with no members.
  if (!edId) {
    return (
      <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
        <Navbar />
        <main className="container mx-auto px-4 py-6 md:py-8">
          {backToPartners}
          <div className="rounded-2xl border border-dashed border-[color:var(--ov-line-strong)] bg-[var(--ov-fill-subtle)] px-6 py-16 text-center">
            <p className="text-[15px] font-semibold text-[var(--ov-ink)]">
              No partner selected
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              Regional members belong to a franchise partner. Pick one to see theirs.
            </p>
            <button
              type="button"
              onClick={() => navigate("/admin/franchise")}
              className="mt-5 h-10 rounded-xl bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            >
              Go to Franchise Partners
            </button>
          </div>
        </main>
      </div>
    );
  }

  const totalMembers = data?.data?.pagination?.total ?? membersData.length;

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        {backToPartners}

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
              Regional Members
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-ink-4)]">
              <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
                {totalMembers}
              </span>{" "}
              {totalMembers === 1 ? "member" : "members"} under this partner
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {/* One search box, not two. The page carried a labelled input with a
                Search button above the table and a second input inside the table
                header, both bound to the same state - typing in either filled the
                other, and only one of them looked like the real control. */}
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
                aria-label="Search regional members"
                className="h-11 w-full rounded-xl bg-[var(--ov-fill-subtle)] pl-9 pr-3 text-[13px] text-[var(--ov-ink)] ring-1 ring-[color:var(--ov-line)] transition-colors placeholder:text-[var(--ov-ink-5)] focus:bg-[var(--ov-fill-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ov-ember)]"
              />
            </div>

            {/* Role is a real filter, so it stays in the open rather than behind a
                disclosure - there is only one of it. */}
            <div className="w-full sm:w-44">
              <FormSelect
                label="Role"
                hideLabel
                value={localRoleFilter}
                onChange={(e) => {
                  setLocalRoleFilter(e.target.value);
                  setPage(1);
                }}
                options={roleOptions}
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

            <button
              type="button"
              onClick={handleCreateMember}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add member
            </button>
          </div>
        </motion.div>

        {error ? (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
            Couldn't load regional members. Check your connection and try again.
          </div>
        ) : isLoading ? (
          // Skeleton rows rather than a spinner that replaces the whole table:
          // the shape of what is loading is itself information.
          <div className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] ring-1 ring-[color:var(--ov-line)]">
            <div className="h-12 bg-[var(--ov-raised)]" />
            {Array.from({ length: 6 }).map((_, i) => (
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
              data={membersData}
              searchValues={bufferedColumnSearches}
              onSearchChange={handleColumnSearchChange}
              total={totalMembers}
              page={page}
              // Must match the API's `limit`, or the footer computes a page count
              // from a different page size than the one being fetched.
              pageSize={PAGE_SIZE}
              onPageChange={(p) => setPage(p)}
              renderCell={(column, row) => {
                // The role arrives as a raw enum. Underscored SHOUTING is a
                // database value, not a label a reader should have to decode.
                if (column.key === "role") {
                  const role = String(row.role ?? "");
                  if (!role) return <span className="text-[var(--ov-ink-5)]">—</span>;
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
                  // Status wears the reserved status tokens, not raw Tailwind
                  // greens and reds, so it stays legible on every theme.
                  const tone =
                    {
                      active: "bg-[var(--ov-success-wash)] text-[var(--ov-success)]",
                      inactive: "bg-[var(--ov-ember-wash)] text-[var(--ov-ember)]",
                      blocked: "bg-[var(--ov-danger-wash)] text-[var(--ov-danger)]",
                    }[row.status as "active" | "inactive" | "blocked"] ??
                    "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-4)]";
                  const label = String(row.status ?? "");
                  return (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-medium ${tone}`}
                    >
                      {label.charAt(0).toUpperCase() + label.slice(1)}
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
