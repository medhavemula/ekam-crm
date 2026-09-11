import React, { useMemo, useState, useEffect, useRef } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  HeartHandshake,
  Plus,
  RotateCcw,
  Search as SearchIcon,
  SlidersHorizontal,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  LayoutGrid,
  Table as TableIcon,
  ArrowUpDown,
  Eye,
  Edit2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import DatePicker from "../../../components/common/DatePicker";
import FormSelect from "../../../components/forms/FormSelect";
import DataTable from "../../../components/common/DataTable";
import { PartnerCard } from "../../../components/admin";
import { PartnerCardGridSkeleton } from "../../../components/common/Skeletons";
import { BlockConfirmModal, RenewPartnerModal } from "../../../components/modals";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import { getLastDayOfYear, toStartOfDayISO, toEndOfDayISO } from "../../../utils/date";
import {
  useListSocialPartnersQuery,
  useRenewSocialPartnerMutation,
  useDeleteSocialPartnerMutation,
  useBlockSocialPartnerMutation,
  useUnblockSocialPartnerMutation,
  type SocialPartner
} from "../../../services/superadmin/adminSocialApi";
import { useGetAdminFiltersQuery } from "../../../services/superadmin/adminFiltersApi";
import { useToast } from "../../../components/toast/ToastProvider";
import NoData from "../../../components/common/NoData";
import Pagination from "../../../components/common/Pagination";



// Helper function for error messages
const getErrMsg = (e: any) => e?.data?.message || e?.error || e?.message || "Something went wrong";

// Remove unused type

export const SocialPartnerPage: React.FC = () => {
  const { showToast } = useToast();
  // Initialize dates with January 1, 2025 onwards
  const defaultFromDate = "2025-01-01";
  const defaultToDate = getLastDayOfYear();

  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);

  // State for filters and pagination
  
  const [selectedCountries, setSelectedCountries] = useState("");
  const [selectedRegions, setSelectedRegions] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [page, setPage] = useState(1);
  
  // Modal states
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  // Who takes on the chapters. Required whenever the person being removed holds any,
  // so no social chapter is left without a chairperson.
  const [successorId, setSuccessorId] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const navigate = useNavigate();

  // Admin filters for dropdown options
  const { data: filtersRes } = useGetAdminFiltersQuery();
  const countryOptions = useMemo(
    () => [
      { value: "", label: "Select Countries" },
      ...(filtersRes?.data?.countries ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [filtersRes],
  );
  const regionOptions = useMemo(() => {
    const all = filtersRes?.data?.regions ?? [];
    const filtered = selectedCountries ? all.filter((r) => r.country_id === selectedCountries) : all;
    return [{ value: "", label: "Select Regions" }, ...filtered.map((r) => ({ value: r.id, label: r.name }))];
  }, [filtersRes, selectedCountries]);
  // map: chapter id -> name (handy if you later display names from ids)


  // 👍 safer: cast the arrays, and depend only on the specific pieces
  const countryById = useMemo(() => {
    const map: Record<string, string> = {};
    const list = (filtersRes?.data?.countries ?? []) as Array<{
      id?: string | number;
      _id?: string | number;
      value?: string | number;
      name?: string;
      label?: string;
    }>;
    for (const c of list) {
      const key = String(c?.id ?? c?._id ?? c?.value ?? "");
      if (!key) continue;
      const name = String(c?.name ?? c?.label ?? "");
      if (name) map[key] = name;
    }
    return map;
  }, [filtersRes?.data?.countries]);

  const regionById = useMemo(() => {
    const map: Record<string, string> = {};
    const list = (filtersRes?.data?.regions ?? []) as Array<{
      id?: string | number;
      _id?: string | number;
      value?: string | number;
      name?: string;
      label?: string;
    }>;
    for (const r of list) {
      const key = String(r?.id ?? r?._id ?? r?.value ?? "");
      if (!key) continue;
      const name = String(r?.name ?? r?.label ?? "");
      if (name) map[key] = name;
    }
    return map;
  }, [filtersRes?.data?.regions]);

  // State to hold the applied filters (used for API calls)
  const [appliedFilters, setAppliedFilters] = useState<{
    q?: string;
    country_id?: string;
    region_id?: string;
    registration_from: string;
    registration_to: string;
    renewal_from?: string;
    renewal_to?: string;
    expiry_from?: string;
    expiry_to?: string;
    page?: number;
    limit?: number;
  }>({
    registration_from: toStartOfDayISO(defaultFromDate) || '',
    registration_to: toEndOfDayISO(defaultToDate) || '',
    page: 1,
    limit: 24
  });

  // Build query params using applied filters
  const [limit] = useState(24);
  const queryParams = useMemo(() => ({
    ...appliedFilters,
    role: "SOCIAL_CHAIRPERSON", // Default role for API
    page,
    limit
  }), [appliedFilters, page, limit]);

  // Fetch partners data using the social partners API
  const {
    data: partnersResp,
    error: partnersError,
    isLoading: partnersLoading,
    isFetching: partnersFetching,
  } = useListSocialPartnersQuery(queryParams, {
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: false,
    refetchOnFocus: false
  });


  // Extract partners from the response data structure
  const partners = useMemo(() => {
    if (!partnersResp?.data) {
      return [];
    }
    
    // Handle different response formats
    const responseData = partnersResp.data as any;
    
    // If data is an array, return it directly
    if (Array.isArray(responseData)) {
      return responseData;
    }
    
    // If data is an object with an items array, return that
    if (responseData && typeof responseData === 'object' && Array.isArray(responseData.items)) {
      return responseData.items;
    }
    
    // If data has a data property that's an array, return that
    if (responseData && typeof responseData === 'object' && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    
    // Return empty array if none of the above conditions match
    return [];
  }, [partnersResp]);

  const total = Number((partnersResp as any)?.total ?? partners.length) || 0;

  // View mode and quick status filters
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "upcoming" | "expired">("all");
  const [sortOrder, setSortOrder] = useState<"expiry-asc" | "expiry-desc" | "name-asc" | "chapters-desc">("expiry-asc");

  // Summary counts across all loaded partners
  const statsSummary = useMemo(() => {
    let active = 0;
    let upcoming = 0;
    let expired = 0;
    partners.forEach((p: any) => {
      const rawDays = Number(p.daysLeft);
      const isBlocked = (p.status || "").toUpperCase() === "BLOCKED";
      if (isBlocked) return;
      if (rawDays <= 0) expired++;
      else if (rawDays <= 30) upcoming++;
      else active++;
    });
    return {
      total: total || partners.length,
      active,
      upcoming,
      expired,
    };
  }, [partners, total]);

  // Filtered and sorted partners
  const displayedPartners = useMemo(() => {
    let list = [...partners];
    if (statusFilter !== "all") {
      list = list.filter((p: any) => {
        const rawDays = Number(p.daysLeft);
        const isBlocked = (p.status || "").toUpperCase() === "BLOCKED";
        if (isBlocked) return false;
        if (statusFilter === "expired") return rawDays <= 0;
        if (statusFilter === "upcoming") return rawDays > 0 && rawDays <= 30;
        if (statusFilter === "active") return rawDays > 30 || p.daysLeft == null;
        return true;
      });
    }

    list.sort((a: any, b: any) => {
      if (sortOrder === "name-asc") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortOrder === "chapters-desc") {
        return (Number(b.noOfChapters) || 0) - (Number(a.noOfChapters) || 0);
      }
      if (sortOrder === "expiry-desc") {
        return new Date(b.expiryDate || 0).getTime() - new Date(a.expiryDate || 0).getTime();
      }
      // default: expiry-asc (nearest expiry first)
      return new Date(a.expiryDate || 0).getTime() - new Date(b.expiryDate || 0).getTime();
    });

    return list;
  }, [partners, statusFilter, sortOrder]);

  // The cards are the only part of this screen that comes from the server, so
  // they are the only part that stands in for itself. A refetch that already
  // has rows keeps showing them rather than blanking the grid under you.
  const cardsLoading = partnersLoading || (partnersFetching && partners.length === 0);

  // Refine popover state.
  const [refineOpen, setRefineOpen] = useState(false);
  const refineRef = useRef<HTMLDivElement>(null);
  const refineTriggerRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!refineOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (refineRef.current?.contains(t) || refineTriggerRef.current?.contains(t)) return;
      setRefineOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setRefineOpen(false);
      refineTriggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [refineOpen]);

  // Handle search button click
  const handleSearch = () => {
    // Define the complete filter object with all required fields
    const filters = {
      ...(selectedName && { q: selectedName }),
      ...(selectedCountries && { country_id: selectedCountries }),
      ...(selectedRegions && { region_id: selectedRegions }),
      registration_from: toStartOfDayISO(fromDate || defaultFromDate) || '',
      registration_to: toEndOfDayISO(toDate || defaultToDate) || '',
      ...(renewalDate && { renewal_from: toStartOfDayISO(renewalDate), renewal_to: toEndOfDayISO(renewalDate) }),
      ...(expiryDate && { expiry_from: toStartOfDayISO(expiryDate), expiry_to: toEndOfDayISO(expiryDate) }),
      page: 1,
      limit: 24
    };
    
    // Remove undefined values but keep required properties
    const cleanFilters = {
      registration_from: filters.registration_from,
      registration_to: filters.registration_to,
      page: filters.page,
      limit: filters.limit,
      ...(filters.q && { q: filters.q }),
      ...(filters.country_id && { country_id: filters.country_id }),
      ...(filters.region_id && { region_id: filters.region_id }),
      ...(filters.renewal_from && { renewal_from: filters.renewal_from, renewal_to: filters.renewal_to }),
      ...(filters.expiry_from && { expiry_from: filters.expiry_from, expiry_to: filters.expiry_to }),
    };
    
    setAppliedFilters(cleanFilters);
    setPage(1); // Reset to first page when applying new filters
    
    showToast({ 
      title: "Search Applied",
      description: "Your search filters have been applied.",
      kind: "success",
    });
  };


  useEffect(() => {
    if (partnersError) {
      showToast({
        title: "Error Loading Partners",
        description: `Failed to load partners: ${String(getErrMsg(partnersError))}`,
        kind: "error",
      });
    }
  }, [partnersError, showToast]);

  const handleCreatePartner = () => {
    navigate('/admin/social/create');
  };

  const handleEdit = (id: string | number) => {
    const partner = partners.find((p: any) => p.id === id);
    if (!partner) {
      showToast({
        title: "Error",
        description: "Partner not found",
        kind: "error",
      });
      return;
    }
    
    // Prepare partner data with all required fields
    const partnerData: SocialPartner = {
      ...partner,
      // Ensure we have all required fields with proper fallbacks
      name: partner.name || '',
      email: partner.email || '',
      phone: partner.phone || '',
      role: partner.role || 'SOCIAL_PARTNER',
      country: partner.country || null,
      region: partner.region || null,
      startDate: partner.startDate || partner.registrationDate || new Date().toISOString().split('T')[0],
      expiryDate: partner.expiryDate || '',
      registrationDate: partner.registrationDate || new Date().toISOString().split('T')[0],
    };
    
    navigate(`/admin/social/edit/${id}`, {
      state: {
        partner: partnerData,
        returnPath: `/admin/social/${id}`
      },
      replace: true
    });
  };

  const [renewPartner] = useRenewSocialPartnerMutation();
  const [deleteSocialPartner, { isLoading: isDeleting }] = useDeleteSocialPartnerMutation();

  const handleDelete = (id: string | number) => {
    const partner = partners.find((p: any) => String(p.id) === String(id));
    if (!partner) return;
    setSelectedPartner(partner);
    setSuccessorId("");
    setDeleteModalOpen(true);
  };

  // Anyone else still active can inherit; showing their region keeps the choice informed.
  const successorOptions = useMemo(
    () =>
      partners
        .filter(
          (p: any) =>
            String(p.id) !== String(selectedPartner?.id) &&
            (p.status || "").toUpperCase() !== "BLOCKED",
        )
        .map((p: any) => {
          // The list returns region as { id } only, so resolve the name the same way
          // the cards do rather than rendering the object.
          const regionName = regionById[p.region?.id || ""] || "";
          return {
            value: String(p.id),
            label: regionName ? `${p.name} — ${regionName}` : p.name,
          };
        }),
    [partners, selectedPartner, regionById],
  );

  const heldChapters = Number(selectedPartner?.chaptersCount || 0);

  const handleConfirmDelete = async () => {
    if (!selectedPartner) return;
    try {
      const res = await deleteSocialPartner({
        id: String(selectedPartner.id),
        successorId: heldChapters > 0 ? successorId : undefined,
      }).unwrap();
      showToast({
        title: "Partner deleted",
        description: res?.message || `${selectedPartner.name} was deleted.`,
        kind: "success",
      });
      setDeleteModalOpen(false);
      setSelectedPartner(null);
      setSuccessorId("");
    } catch (e: any) {
      showToast({
        title: "Could not delete",
        description: e?.data?.message || "Delete failed. Please try again.",
        kind: "error",
      });
    }
  };
  const [blockPartner] = useBlockSocialPartnerMutation();
  const [unblockPartner] = useUnblockSocialPartnerMutation();

  const handleRenew = (id: string | number) => {
    const partner = partners.find((p: any) => p.id === id);
    if (!partner) return;
  
    // ✅ SAFELY extract IDs
    const countryId =
      typeof partner.country === "string"
        ? partner.country
        : partner.country?.id;
  
    const regionId =
      typeof partner.region === "string"
        ? partner.region
        : partner.region?.id;
  
    setSelectedPartner({
      ...partner,
  
      country: countryId
        ? {
            id: countryId,
            name:
              countryById[countryId] ||
              partner.country?.name ||
              "—",
          }
        : null,
  
      region: regionId
        ? {
            id: regionId,
            name:
              regionById[regionId] ||
              partner.region?.name ||
              "—",
          }
        : null,
    });
  
    setRenewModalOpen(true);
  };
  

  const handleBlock = (id: string | number) => {
    const partner = partners.find((p: any) => p.id === id);
    if (partner) {
      setSelectedPartner(partner);
      setBlockModalOpen(true);
    }
  };

  const handleConfirmBlock = async () => {
    if (!selectedPartner) return;
    const id = String(selectedPartner.id);
    const isActive = (selectedPartner.status || "").toUpperCase() === "ACTIVE";
    try {
      if (isActive) {
        await blockPartner(id).unwrap();
        showToast({
          title: "Success",
          description: "Partner has been blocked successfully.",
          kind: "success"
        });
      } else {
        await unblockPartner(id).unwrap();
        showToast({
          title: "Success",
          description: "Partner has been unblocked successfully.",
          kind: "success"
        });
      }
      setBlockModalOpen(false);
    } catch (e) {
      showToast({
        title: "Action Failed",
        description: `Unable to complete the action: ${String(getErrMsg(e as any))}`,
        kind: "error",
      });
    }
    setBlockModalOpen(false);
  };

const handleRenewSubmit = async (renewalDate: string, expiryDate: string) => {
  if (!selectedPartner) return;
  const id = String(selectedPartner.id);
  try {
    // Send renewalDate and expiryDate directly to the API
    await renewPartner({ 
      id, 
      renewalDate,
      expiryDate: expiryDate
    }).unwrap();
    
    showToast({
      title: "Renewal Successful",
      description: `Partner membership has been renewed until ${expiryDate}.`,
      kind: "success"
    });
  } catch (e) {
    showToast({
      title: "Renewal Failed",
      description: `Could not renew partner membership: ${String(getErrMsg(e as any))}`,
      kind: "error",
    });
  }

  setRenewModalOpen(false);
};
  // Dimensions currently in effect, as clearable chips. Dates the reader has not
  // touched are not chips — a chip for a default range is noise, not state.
  const chips = [
    selectedCountries && { key: "country" as const, label: countryById[selectedCountries] || "Country" },
    selectedRegions && { key: "region" as const, label: regionById[selectedRegions] || "Region" },
    renewalDate && { key: "renewal" as const, label: `Renewed ${renewalDate}` },
    expiryDate && { key: "expiry" as const, label: `Expires ${expiryDate}` },
  ].filter(Boolean) as Array<{ key: "country" | "region" | "renewal" | "expiry"; label: string }>;

  const clearChip = (key: "country" | "region" | "renewal" | "expiry") => {
    if (key === "country") {
      setSelectedCountries("");
      setSelectedRegions("");
    } else if (key === "region") setSelectedRegions("");
    else if (key === "renewal") setRenewalDate("");
    else setExpiryDate("");
    setPage(1);
  };

  const resetAll = () => {
    setSelectedCountries("");
    setSelectedRegions("");
    setSelectedName("");
    setRenewalDate("");
    setExpiryDate("");
    setFromDate(defaultFromDate);
    setToDate(defaultToDate);
    setPage(1);
    setRefineOpen(false);
  };

  const fieldLabel = "mb-1.5 block text-xs text-[var(--field-label)]";

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* ---- Command bar ----
            The previous header laid eight controls and two buttons across two
            rows before a single partner appeared. Name search stays out because
            it is the control people reach for constantly; the six date and
            geography fields move into a popover that opens over the grid rather
            than displacing it. */}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: -10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5"
        >
          {/* Header Row: Title on Left, Controls Toolbar on Right */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2">
                <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
                  <HeartHandshake className="h-3.5 w-3.5" />
                  <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                    Social Leadership
                  </span>
                </div>
              </div>
              <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
                Social Partner
              </h1>
            </div>

            {/* Controls Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <SearchIcon
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ov-ink-4)]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={selectedName}
                  onChange={(e) => {
                    setSelectedName(e.target.value);
                    setPage(1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  placeholder="Search by name"
                  aria-label="Search chairpersons by name"
                  className="h-[38px] w-full rounded-xl bg-[var(--ov-fill-subtle)] pl-9 pr-3 text-[13px] text-[var(--ov-ink)] ring-1 ring-[color:var(--ov-line)] transition-colors placeholder:text-[var(--ov-ink-5)] focus:bg-[var(--ov-fill-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ov-ember)] sm:w-56"
                />
              </div>

              <div className="relative">
                <button
                  ref={refineTriggerRef}
                  type="button"
                  onClick={() => setRefineOpen((v) => !v)}
                  aria-expanded={refineOpen}
                  aria-haspopup="dialog"
                  className={`inline-flex h-[38px] items-center gap-2 rounded-xl px-3.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${
                    refineOpen
                      ? "bg-[var(--ov-fill-hover)] text-[var(--ov-ink)] ring-1 ring-[color:var(--ov-line-strong)]"
                      : "text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                  Refine
                  {chips.length > 0 && (
                    <span className="ekam-figure grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--ov-ember-fill)] px-1 text-[10px] font-bold text-[var(--ov-on-ember)]">
                      {chips.length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {refineOpen && (
                    <motion.div
                      ref={refineRef}
                      role="dialog"
                      aria-label="Refine chairpersons"
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      style={{ transformOrigin: "top right" }}
                      className="absolute right-0 z-[1400] mt-2 w-[min(88vw,36rem)] rounded-2xl bg-[var(--ov-deep)] p-4 shadow-[var(--ov-shadow-pop)] ring-1 ring-[color:var(--ov-deep-line)]"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className={fieldLabel} htmlFor="from-date">
                            Registered from
                          </label>
                          <DatePicker
                            id="from-date"
                            value={fromDate}
                            onChange={(v) => {
                              setFromDate(v);
                              if (toDate && v > toDate) setToDate("");
                            }}
                            iconSrc={CalendarIcon}
                            className="w-full text-base"
                          />
                        </div>
                        <div>
                          <label className={fieldLabel} htmlFor="to-date">
                            Registered to
                          </label>
                          <DatePicker
                            id="to-date"
                            value={toDate}
                            minDate={fromDate}
                            onChange={(v) => setToDate(v >= fromDate ? v : fromDate)}
                            iconSrc={CalendarIcon}
                            className="w-full text-base"
                          />
                        </div>

                        <FormSelect
                          label="Country"
                          value={selectedCountries}
                          onChange={(e) => {
                            setSelectedCountries(e.target.value);
                            setSelectedRegions("");
                            setPage(1);
                          }}
                          options={countryOptions}
                        />
                        <FormSelect
                          label="Region"
                          value={selectedRegions}
                          onChange={(e) => {
                            setSelectedRegions(e.target.value);
                            setPage(1);
                          }}
                          options={regionOptions}
                        />

                        <div>
                          <label className={fieldLabel} htmlFor="renewal-date">
                            Renewal date
                          </label>
                          <DatePicker
                            id="renewal-date"
                            value={renewalDate}
                            onChange={setRenewalDate}
                            iconSrc={CalendarIcon}
                            className="w-full text-base"
                          />
                        </div>
                        <div>
                          <label className={fieldLabel} htmlFor="expiry-date">
                            Expiry date
                          </label>
                          <DatePicker
                            id="expiry-date"
                            value={expiryDate}
                            onChange={setExpiryDate}
                            iconSrc={CalendarIcon}
                            className="w-full text-base"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--ov-deep-line)] pt-3.5">
                        <button
                          type="button"
                          onClick={resetAll}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] text-[var(--ov-deep-ink-2)] transition-colors hover:text-[var(--ov-deep-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                        >
                          <RotateCcw className="h-3 w-3" aria-hidden="true" />
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleSearch();
                            setRefineOpen(false);
                          }}
                          className="ml-auto h-[38px] rounded-xl bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-deep)]"
                        >
                          Apply
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sort Order Selector */}
              <div className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-2.5 h-[38px] text-xs text-[#475569] shadow-2xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#64748B]" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="bg-transparent text-xs font-medium text-[#334155] focus:outline-none cursor-pointer"
                  aria-label="Sort chairpersons"
                >
                  <option value="expiry-asc">Expiry (Earliest)</option>
                  <option value="expiry-desc">Expiry (Furthest)</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="chapters-desc">Chapters (Highest)</option>
                </select>
              </div>

              {/* View Mode Toggle: Grid vs Table */}
              <div className="flex items-center rounded-xl border border-[#E2E8F0] bg-white p-0.5 h-[38px] shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === "grid"
                      ? "bg-[#0B2130] text-white"
                      : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
                  }`}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === "table"
                      ? "bg-[#0B2130] text-white"
                      : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
                  }`}
                  aria-label="Table view"
                  title="Table view"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleCreatePartner}
                className="inline-flex h-[38px] items-center gap-1.5 rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)] whitespace-nowrap"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create Social Partner
              </button>
            </div>
          </div>

          {/* Full-Width Executive Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white border-[#0B2130] shadow-sm ring-2 ring-[#0B2130]/10"
                  : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-2xs"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#0B2130] grid place-items-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Total Partners</p>
                <p className="text-2xl font-bold text-[#0F172A] leading-tight">{statsSummary.total}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                statusFilter === "active"
                  ? "bg-white border-[#0D9488] shadow-sm ring-2 ring-[#0D9488]/10"
                  : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-2xs"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0D9488] grid place-items-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Active Contracts</p>
                <p className="text-2xl font-bold text-[#0D9488] leading-tight">{statsSummary.active}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("upcoming")}
              className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                statusFilter === "upcoming"
                  ? "bg-white border-[#E85A14] shadow-sm ring-2 ring-[#E85A14]/10"
                  : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-2xs"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#E85A14] grid place-items-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Expiring (30 Days)</p>
                <p className="text-2xl font-bold text-[#E85A14] leading-tight">{statsSummary.upcoming}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("expired")}
              className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                statusFilter === "expired"
                  ? "bg-white border-rose-500 shadow-sm ring-2 ring-rose-500/10"
                  : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-2xs"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Expired</p>
                <p className="text-2xl font-bold text-rose-600 leading-tight">{statsSummary.expired}</p>
              </div>
            </button>
          </div>

          {/* Partner Count & Active Chips Bar */}
          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-[12px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
            <span className="inline-flex items-center gap-2">
              {partnersFetching && (
                <span className="relative grid h-1.5 w-1.5 place-items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--ov-ember)]" />
                  {!reduceMotion && (
                    <motion.span
                      animate={{ scale: [1, 2.4, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full bg-[var(--ov-ember)]"
                    />
                  )}
                </span>
              )}
              <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
                {displayedPartners.length} {displayedPartners.length === 1 ? "chairperson" : "chairpersons"}
              </span>
            </span>

            {chips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--ov-fill-subtle)] py-1 pl-2.5 pr-1 text-[12px] text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)]"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => clearChip(chip.key)}
                  aria-label={`Remove ${chip.label} filter`}
                  className="grid h-4 w-4 place-items-center rounded-full text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                >
                  <X className="h-2.5 w-2.5" aria-hidden="true" />
                </button>
              </span>
            ))}

            {chips.length > 0 && (
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 rounded text-[12px] text-[var(--ov-ink-4)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Clear all
              </button>
            )}
          </div>
        </motion.div>

        {/* ---- Results ---- */}
        {cardsLoading ? (
          <PartnerCardGridSkeleton count={Math.min(limit, 8)} />
        ) : displayedPartners.length === 0 ? (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-10 ring-1 ring-[color:var(--ov-line)]">
            <NoData message="No social partners match these filters" />
            {(chips.length > 0 || statusFilter !== "all") && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    resetAll();
                    setStatusFilter("all");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] text-[var(--ov-ink-3)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayedPartners.map((partner: SocialPartner, index: number) => {
                  if (!partner) return null;

                  const rawDays = Number(partner.daysLeft);
                  const daysLeft = Number.isFinite(rawDays) ? rawDays : null;

                  const expiryStatus =
                    daysLeft == null
                      ? "active"
                      : daysLeft <= 0
                        ? "expired"
                        : daysLeft <= 30
                          ? "upcoming"
                          : "active";

                  const blockLabel =
                    (partner.status || "").toUpperCase() === "ACTIVE" ? "Block" : "Unblock";

                  const countryId = partner.country?.id || '';
                  const regionId = partner.region?.id || '';
                  const countryName = countryById[countryId] || '';
                  const regionName = regionById[regionId] || '';
                  const location = [countryName, regionName].filter(Boolean).join(" · ");

                  return (
                    <PartnerCard
                      key={partner.id}
                      name={partner.name || 'No Name'}
                      role={partner.role || 'SOCIAL_CHAIRPERSON'}
                      location={location}
                      registrationDate={partner.registrationDate || ''}
                      renewalDate={partner.renewalDate || ''}
                      expiryDate={partner.expiryDate || ''}
                      expiryStatus={expiryStatus}
                      daysLeft={daysLeft}
                      noOfChapters={partner.chaptersCount || 0}
                      avatarColor="var(--ov-ember-fill)"
                      avatarInitial={(partner.name || '?').charAt(0).toUpperCase()}
                      delay={Math.min(index, 11) * 0.035}
                      onEdit={() => handleEdit(partner.id)}
                      onRenew={() => handleRenew(partner.id)}
                      onBlock={() => handleBlock(partner.id)}
                      onDelete={() => handleDelete(partner.id)}
                      blockLabel={blockLabel}
                      onOpen={() =>
                        navigate(`/admin/social/${partner.id}`, {
                          state: { partner, socialId: partner.id },
                        })
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl bg-white shadow-sm border border-[#E2E8F0] overflow-hidden">
                <DataTable
                  columns={[
                    { key: "name", label: "Social Chairperson", sortable: true },
                    { key: "location", label: "Location", sortable: true },
                    { key: "chapters", label: "Chapters", sortable: true },
                    { key: "registrationDate", label: "Registered", sortable: true },
                    { key: "expiryDate", label: "Expiry Date", sortable: true },
                    { key: "status", label: "Status", sortable: true },
                    { key: "actions", label: "Actions" },
                  ]}
                  data={displayedPartners.map((partner: any) => {
                    const rawDays = Number(partner.daysLeft);
                    const daysLeft = Number.isFinite(rawDays) ? rawDays : null;
                    const countryId = partner.country?.id || '';
                    const regionId = partner.region?.id || '';
                    const countryName = countryById[countryId] || '';
                    const regionName = regionById[regionId] || '';
                    const location = [countryName, regionName].filter(Boolean).join(" · ") || "—";
                    const isBlocked = (partner.status || "").toUpperCase() === "BLOCKED";

                    return {
                      id: partner.id,
                      raw: partner,
                      name: partner.name || "No Name",
                      role: partner.role || "Social Chairperson",
                      location,
                      chapters: partner.chaptersCount ?? 0,
                      registrationDate: partner.registrationDate ? new Date(partner.registrationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—",
                      expiryDate: partner.expiryDate ? new Date(partner.expiryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—",
                      daysLeft,
                      isBlocked,
                      status: isBlocked ? "Blocked" : daysLeft != null && daysLeft <= 0 ? "Expired" : daysLeft != null && daysLeft <= 30 ? "Expiring Soon" : "Active",
                    };
                  })}
                  searchValues={{}}
                  onSearchChange={() => {}}
                  renderCell={(col, row) => {
                    if (col.key === "name") {
                      return (
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0D9488] text-white text-xs font-bold">
                            {(row.name || "S").charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/admin/social/${row.id}`, {
                                  state: { partner: row.raw, socialId: row.id },
                                })
                              }
                              className="text-left font-semibold text-[#0F172A] hover:text-[#0D9488] transition-colors truncate block text-sm"
                            >
                              {row.name}
                            </button>
                            <span className="text-[11px] text-[#64748B] block truncate">
                              {row.role}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    if (col.key === "chapters") {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-[#0F172A]">
                          {row.chapters} {row.chapters === 1 ? "chapter" : "chapters"}
                        </span>
                      );
                    }
                    if (col.key === "expiryDate") {
                      return (
                        <div>
                          <span className="text-xs text-[#334155] font-medium block">{row.expiryDate}</span>
                          {row.daysLeft != null && !row.isBlocked && (
                            <span className={`text-[10px] font-semibold ${
                              row.daysLeft <= 0 ? "text-rose-600" : row.daysLeft <= 30 ? "text-orange-600" : "text-slate-500"
                            }`}>
                              {row.daysLeft <= 0 ? "Expired" : `${row.daysLeft}d left`}
                            </span>
                          )}
                        </div>
                      );
                    }
                    if (col.key === "status") {
                      const isExpired = row.status === "Expired";
                      const isExpiring = row.status === "Expiring Soon";
                      const isActive = row.status === "Active";
                      return (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isActive
                              ? "bg-teal-50 text-teal-700 border border-teal-200/60"
                              : isExpiring
                              ? "bg-orange-50 text-orange-700 border border-orange-200/60"
                              : isExpired
                              ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? "bg-teal-600" : isExpiring ? "bg-[#E85A14]" : isExpired ? "bg-rose-600" : "bg-slate-500"
                          }`} />
                          {row.status}
                        </span>
                      );
                    }
                    if (col.key === "actions") {
                      const needsRenew = row.daysLeft != null && row.daysLeft <= 30;
                      return (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/admin/social/${row.id}`, {
                                state: { partner: row.raw, socialId: row.id },
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0B2130] hover:bg-slate-100 transition-colors"
                            title="View profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(row.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0B2130] hover:bg-slate-100 transition-colors"
                            title="Edit partner"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {needsRenew && !row.isBlocked && (
                            <button
                              type="button"
                              onClick={() => handleRenew(row.id)}
                              className="px-2 py-1 rounded-md bg-[#E85A14] text-white text-xs font-semibold hover:bg-[#D44E0E] transition-colors shadow-2xs"
                            >
                              Renew
                            </button>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </div>
            )}

            {/* The list already tracked page and limit and the API already
                returned a total; nothing rendered a control, so everything past
                the first 24 chairpersons was unreachable. */}
            <Pagination
              page={page}
              limit={limit}
              total={total}
              onChange={(next) => {
                setPage(next);
                window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
              }}
              noun="chairpersons"
              className="mt-8 border-t border-[color:var(--ov-line-faint)] pt-5"
            />
          </>
        )}
      </main>


      {/* Block Confirmation Modal */}
      <BlockConfirmModal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        onConfirm={handleConfirmBlock}
        partnerName={selectedPartner?.name}
        mode={(selectedPartner?.status || "").toUpperCase() === "ACTIVE" ? "block" : "unblock"}
      />

      <ConfirmationDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isSubmitting={isDeleting}
        actionType="delete"
        title={`Delete ${selectedPartner?.name || "this chairperson"}?`}
        description={
          heldChapters > 0
            ? `They currently hold ${heldChapters} social chapter${heldChapters === 1 ? "" : "s"}. Choose who takes them on — the chapters move across, then this account is deleted and its email address becomes free again. This cannot be undone.`
            : "Their account is deleted, they lose access immediately, and their email address becomes free to use again. This cannot be undone."
        }
        confirmText="Yes, Delete"
        confirmDisabled={heldChapters > 0 && !successorId}
      >
        {heldChapters > 0 && (
          <div className="w-full text-left">
            <label
              htmlFor="successor"
              className="mb-1.5 block text-[12px] font-medium text-[var(--ov-ink-3)]"
            >
              Next chairperson <span className="text-[var(--ov-ember)]">*</span>
            </label>
            <select
              id="successor"
              value={successorId}
              onChange={(e) => setSuccessorId(e.target.value)}
              className="h-10 w-full rounded-xl border border-[color:var(--ov-line)] bg-[var(--ov-fill-subtle)] px-3 text-[13px] text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            >
              <option value="">Select a chairperson…</option>
              {successorOptions.map((o: { value: string; label: string }) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {successorOptions.length === 0 && (
              <p className="mt-1.5 text-[12px] text-[var(--ov-ember)]">
                There is no other active chairperson to hand these chapters to.
              </p>
            )}
          </div>
        )}
      </ConfirmationDialog>

      {/* Renew Partner Modal */}
      {selectedPartner && (
        <RenewPartnerModal
          isOpen={renewModalOpen}
          onClose={() => setRenewModalOpen(false)}
          onSubmit={handleRenewSubmit}
          partnerData={{
            name: selectedPartner.name,
            phone: selectedPartner.phone,
            email: selectedPartner.email,
            country: selectedPartner.country,
            region: selectedPartner.region,
            registrationDate: selectedPartner.registrationDate,
            renewalDate: selectedPartner.renewalDate,
            expiryDate: selectedPartner.expiryDate
          }}
        />
      )}
    </div>
  );
};

export default SocialPartnerPage;
