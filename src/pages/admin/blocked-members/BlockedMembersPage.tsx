import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useGetApprovedMembersQuery } from "../../../services/approvalsApi";
import type { RootState } from "../../../app/store";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Search as SearchIcon, X, ShieldOff } from "lucide-react";
import Navbar from "../../../components/navigation/Navbar";
import DataTable, { type TableColumn } from "../../../components/common/DataTable";

interface BlockedMemberRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  profession: string;
  region?: string;
  country?: string;
  chapterName?: string;
  status: "Blocked";
  moduleAccess?: {
    business: boolean;
    professional: boolean;
    social: boolean;
  };
}

export default function BlockedMembersPage() {
  const navigate = useNavigate();
  const [userName] = useState("Mike");
  const userRole = useSelector((state: RootState) => state.auth.role);

  // Check if user has access to view blocked members
  const canViewBlockedMembers = [
    "EXECUTIVE_DIRECTOR",
    "ED_TEAM", 
    "REGIONAL_DIRECTOR",
    "ASSISTANT_REGIONAL_DIRECTOR"
  ].includes(userRole || "");

  // Search and pagination states
  const [typedSearch, setTypedSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const reduceMotion = useReducedMotion();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(12);

  // Fetch blocked members using the existing approved members API with status filter
  const { data: blockedMembersRes, isLoading, error } = useGetApprovedMembersQuery({
    status: 'BLOCKED',
    page: currentPage,
    limit: limit,
    search: searchTerm || undefined,
  }, {
    skip: !canViewBlockedMembers
  });

  // Process blocked members data
  const blockedMembers = Array.isArray(blockedMembersRes?.data)
    ? blockedMembersRes.data.map((member: any): BlockedMemberRecord => ({
        id: member._id || member.id || '',
        name: member.name || '',
        email: member.email || '',
        phone: member.basicInfo?.phone || member.phone || '',
        company: member.business?.businessName || '',
        profession: member.professional?.role || '',
        region: member.basicInfo?.region?.name || member.basicInfo?.regionName || '',
        country: member.basicInfo?.country?.name || member.basicInfo?.countryName || '',
        chapterName: member.basicInfo?.chapter?.name || '',
        status: "Blocked" as const,
        moduleAccess: member.moduleAccess || {
          business: false,
          professional: false,
          social: false
        },
      }))
    : [];

  const totalCount = blockedMembersRes?.pagination?.total || 0;

  // Handle search
  // The Search button only ever called setCurrentPage(1) — the input was
  // already feeding the query key, so it fired a request per keystroke and the
  // button did nothing else. Debounced instead, and the button is gone.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = typedSearch.trim();
      setSearchTerm((prev) => {
        if (prev === next) return prev;
        setCurrentPage(1);
        return next;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [typedSearch]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Define table columns
  const columns: TableColumn[] = [
    {
      key: "name",
      label: "Name",
      searchable: true,
      sortable: true,
    },
    {
      key: "email",
      label: "Email",
      searchable: true,
      sortable: true,
    },
    {
      key: "phone",
      label: "Phone",
      searchable: true,
      sortable: true,
    },
    {
      key: "businessProfessional",
      label: "Business/Professional",
      searchable: true,
      sortable: true,
    },
    {
      key: "chapterName",
      label: "Chapter Name",
      searchable: true,
      sortable: true,
    },
  ];

  // Custom cell renderer to show "-" for empty cells and handle businessProfessional logic
  const renderCell = (column: TableColumn, row: any) => {
    const value = row[column.key];
    
    // Handle businessProfessional column with custom logic
    if (column.key === "businessProfessional") {
      if (row.moduleAccess?.business && row.moduleAccess?.professional) {
        return "Business/Professional";
      } else if (row.moduleAccess?.business) {
        return "Business";
      } else if (row.moduleAccess?.professional) {
        return "Professional";
      } else {
        return '-';
      }
    }
    
    // Handle chapterName with custom logic
    if (column.key === "chapterName") {
      return row.chapterName || "Not assigned";
    }
    
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return null; // Use default rendering
  };

  // Prepare data for DataTable
  const tableData = blockedMembers.map((member: BlockedMemberRecord) => ({
    ...member,
    businessProfessional: member.company || member.profession || "",
  }));

  // Redirect if no access
  useEffect(() => {
    if (!canViewBlockedMembers) {
      navigate("/dashboard");
    }
  }, [canViewBlockedMembers, navigate]);

  if (!canViewBlockedMembers) {
    return null; // Will redirect
  }

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-[13px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </button>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
        >
          <div>
            <div className="mb-2">
              <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
                <ShieldOff className="h-3.5 w-3.5" />
                <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                  Access Restrictions
                </span>
              </div>
            </div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
              Blocked Members
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
              {!isLoading && !error && (
                <>
                  <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{totalCount}</span>{" "}
                  {totalCount === 1 ? "member" : "members"}
                  {searchTerm ? " matching" : " blocked"}
                  {" · "}
                </>
              )}
              Members who cannot currently sign in
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ov-ink-4)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={typedSearch}
              onChange={(e) => setTypedSearch(e.target.value)}
              placeholder="Search name, email or phone"
              aria-label="Search blocked members"
              className="h-11 w-full rounded-xl bg-[var(--ov-fill-subtle)] pl-9 pr-9 text-[13px] text-[var(--ov-ink)] ring-1 ring-[color:var(--ov-line)] transition-colors placeholder:text-[var(--ov-ink-5)] focus:bg-[var(--ov-fill-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ov-ember)] [&::-webkit-search-cancel-button]:hidden"
            />
            {typedSearch && (
              <button
                type="button"
                onClick={() => setTypedSearch("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </motion.div>

        {error ? (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
            {"data" in error
              ? (error.data as any)?.message || "Couldn't load blocked members."
              : "Couldn't load blocked members. Check your connection and try again."}
          </div>
        ) : isLoading ? (
          <div className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] ring-1 ring-[color:var(--ov-line)]">
            <div className="h-12 bg-[var(--ov-raised)]" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse border-t border-[color:var(--ov-line-faint)] bg-[var(--ov-panel)]"
              />
            ))}
          </div>
        ) : tableData.length === 0 ? (
          // An empty list here is the good outcome, so it reads as one rather
          // than as a dead end.
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-dashed border-[color:var(--ov-line-strong)] bg-[var(--ov-fill-subtle)] px-6 py-16 text-center"
          >
            <span
              aria-hidden="true"
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--ov-success-wash)] text-[var(--ov-success)] ring-1 ring-[color:var(--ov-success-wash)]"
            >
              <ShieldOff className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[17px] font-semibold text-[var(--ov-ink)]">
              {searchTerm ? "Nothing matches that search" : "Nobody is blocked"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              {searchTerm
                ? "Try a different name, email or phone."
                : "Members you block appear here so they can be found and unblocked."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]"
          >
            <DataTable
              columns={columns}
              data={tableData}
              searchValues={{}}
              onSearchChange={() => {}}
              showSearchRow={false}
              renderCell={renderCell}
              total={totalCount}
              page={currentPage}
              pageSize={limit}
              onPageChange={handlePageChange}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
