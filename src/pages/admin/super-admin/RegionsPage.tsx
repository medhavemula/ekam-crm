import { useMemo, useState, useEffect } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { Trash2, Plus, Globe2, MapPin, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import DataTable from "../../../components/common/DataTable";
import type { TableColumn } from "../../../components/common/DataTable";
import { CreateModal } from "../../../components/modals";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { Search, X } from "lucide-react";
import { useToast } from "../../../components/toast/ToastProvider";
import { useListRegionsQuery, useCreateRegionMutation, useDeleteRegionMutation, useListCountriesQuery, useLazyListCountriesQuery } from "../../../services/superadmin/adminGeoApi";

type Row = { id: string; regionName: string; countryName: string; noOfChapters?: number };

export default function RegionsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [typedSearch, setTypedSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchValues, setSearchValues] = useState<{ [key: string]: string }>({});
  // Typed vs applied. The input fed the query key directly, so every keystroke
  // was a request; the debounce is what makes the search usable without a
  // button to press.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = typedSearch.trim();
      setGlobalSearch((prev) => {
        if (prev === next) return prev;
        setPage(1);
        return next;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [typedSearch]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, isLoading, isFetching, error } = useListRegionsQuery({ page, limit, search: globalSearch || undefined });
  const total = data?.total ?? 0;

  const { data: countriesData } = useListCountriesQuery({ page: 1, limit: 200 });
  const [fetchCountries] = useLazyListCountriesQuery();

  // State for country search
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [countrySearchDebounced, setCountrySearchDebounced] = useState("");
  
  // Debounce country search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setCountrySearchDebounced(countrySearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [countrySearchQuery]);

  // Fetch countries with search when modal is open or search changes
  useEffect(() => {
    if (isModalOpen) {
      fetchCountries({ 
        page: 1, 
        limit: 200,
        // Note: API doesn't support search yet, so we'll use client-side filtering
      });
    }
  }, [isModalOpen, fetchCountries, countrySearchDebounced]);
  
  const countryOptions = useMemo(() => {
    const allCountries = countriesData?.data ?? [];
    
    // Client-side filtering since API doesn't support search
    const filteredCountries = countrySearchDebounced.trim()
      ? allCountries.filter((c) => 
          c.name.toLowerCase().includes(countrySearchDebounced.toLowerCase())
        )
      : allCountries;
      
    const options = filteredCountries.map((c) => ({ value: c.id, label: c.name }));
    return options;
  }, [countriesData, countrySearchDebounced]);
  const countryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of countriesData?.data ?? []) map.set(c.id, c.name);
    return map;
  }, [countriesData]);

  const [createRegion] = useCreateRegionMutation();
  const [deleteRegion] = useDeleteRegionMutation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [regionToDelete, setRegionToDelete] = useState<Row | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (error) {
      const err: any = error as any;
      const msg = err?.data?.message || err?.error || "Failed to load regions";
      showToast({ title: "Failed to load regions", description: String(msg), kind: "error" });
    }
  }, [error, showToast]);

  const navigate = useNavigate();

  const columns: TableColumn[] = [
    { key: "regionName", label: "Region Name", sortable: true, searchable: false },
    { key: "countryName", label: "Country Name", sortable: true, searchable: false },
    { key: "noOfChapters", label: "Chapters", sortable: true, searchable: false },
    { key: "actions", label: "Actions" },
  ];

  const handleSearchChange = (key: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeleteRegion = (region: Row) => {
    setRegionToDelete(region);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!regionToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteRegion(regionToDelete.id).unwrap();
      showToast({
        title: "Region Deleted",
        description: `Region "${regionToDelete.regionName}" has been deleted successfully.`,
        kind: "success"
      });
      setShowDeleteDialog(false);
      setRegionToDelete(null);
    } catch (error: any) {
      const msg = error?.data?.message || error?.message || "Delete failed";
      showToast({
        title: "Delete Failed",
        description: String(msg),
        kind: "error"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false);
    setRegionToDelete(null);
  };

  const renderCell = (column: TableColumn, row: Row) => {
    if (column.key === "regionName") {
      return (
        <button
          type="button"
          onClick={() =>
            navigate(`/admin/chapters?region_id=${row.id}`, {
              state: { regionId: row.id, regionName: row.regionName },
            })
          }
          className="group inline-flex items-center gap-1.5 font-semibold text-[#0F172A] hover:text-[#E85A14] transition-colors cursor-pointer"
        >
          <span>{row.regionName}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#E85A14] transition-transform group-hover:translate-x-0.5" />
        </button>
      );
    }
    if (column.key === "countryName") {
      return <span className="text-sm text-slate-600">{row.countryName || "—"}</span>;
    }
    if (column.key === "noOfChapters") {
      const count = row.noOfChapters ?? 0;
      return (
        <button
          type="button"
          onClick={() =>
            navigate(`/admin/chapters?region_id=${row.id}`, {
              state: { regionId: row.id, regionName: row.regionName },
            })
          }
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-[#0B2130] hover:bg-[#E85A14]/15 hover:text-[#E85A14] transition-colors cursor-pointer"
          title={`View chapters in ${row.regionName}`}
        >
          <span>{count}</span>
          <span className="text-[10px] text-slate-500 font-normal">
            {count === 1 ? "chapter" : "chapters"}
          </span>
        </button>
      );
    }
    if (column.key === "actions") {
      return (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              navigate(`/admin/chapters?region_id=${row.id}`, {
                state: { regionId: row.id, regionName: row.regionName },
              })
            }
            className="px-3 py-1 text-xs font-semibold text-slate-700 hover:text-[#E85A14] hover:bg-orange-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => handleDeleteRegion(row)}
            aria-label={`Delete ${row.regionName}`}
            title="Delete region"
            className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85A14] cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      );
    }
    return null;
  };

  const apiRows: Row[] = useMemo(() => {
    const list = data?.data ?? [];
    return list.map((r: any) => {
      const cid = r.countryId;
      const cname = r.countryName || (cid ? (countryNameById.get(cid) || "") : "");
      const mapped = { 
        id: r.id, 
        regionName: r.name, 
        countryName: cname,
        noOfChapters: r.chapterCount ?? 0
      };
      return mapped;
    });
  }, [data, countryNameById]);

  const filteredData = useMemo(() => {
    return apiRows.filter((row) => {
      for (const [key, value] of Object.entries(searchValues)) {
        if (value) {
          const cell = String((row as any)[key] ?? "").toLowerCase();
          if (!cell.includes(value.toLowerCase())) return false;
        }
      }
      return true;
    });
  }, [apiRows, searchValues]);

  const regionFields = [
    {
      name: "countryId",
      label: "Country",
      type: "select" as const,
      placeholder: "Select country",
      options: [{ value: "", label: "Select country" }, ...countryOptions],
      required: true,
      searchable: true,
      searchPlaceholder: "Search country",
      includePlaceholderOption: false,
      menuMaxHeightClass: "max-h-38",
      disableClientSideFilter: true, // Disable client-side filtering since we handle it manually
      onSearchChange: setCountrySearchQuery,
    },
    {
      name: "name",
      label: "Region Name",
      type: "text" as const,
      placeholder: "Enter region name",
      required: true,
    },
  ];

  const onSubmitRegion = async (form: Record<string, string>) => {
    const cid = (form.countryId || "").trim();
    const nm = (form.name || "").trim();
    if (!cid || !nm) {
      showToast({ title: "Country and Region name are required", kind: "error" });
      return;
    }
    try {
      await createRegion({ countryId: cid, name: nm }).unwrap();
      showToast({ title: "Region created" });
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || "Create failed";
      showToast({ title: "Create failed", description: String(msg), kind: "error" });
      throw e;
    }
  };

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
        >
          <div>
            <div className="mb-2">
              <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
                <MapPin className="h-3.5 w-3.5" />
                <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                  Regional Coverage
                </span>
              </div>
            </div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
              Regions
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
              {!isLoading && !error && (
                <>
                  <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{total}</span>{" "}
                  {total === 1 ? "region" : "regions"}
                  {globalSearch ? " matching" : ""}
                  {" · "}
                </>
              )}
              Regions inside each country
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ov-ink-4)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={typedSearch}
                onChange={(e) => setTypedSearch(e.target.value)}
                placeholder="Search regions"
                aria-label="Search regions"
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

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add region
            </button>
          </div>
        </motion.div>

        {error ? (
          // The page used to raise a toast and still render an empty table, so a
          // failed request looked the same as an empty registry.
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
            Couldn&apos;t load regions. Check your connection and try again.
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
        ) : filteredData.length === 0 ? (
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-dashed border-[color:var(--ov-line-strong)] bg-[var(--ov-fill-subtle)] px-6 py-16 text-center"
          >
            <span
              aria-hidden="true"
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--ov-ember-wash)] text-[var(--ov-ember)] ring-1 ring-[color:var(--ov-ember-wash)]"
            >
              <Globe2 className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[17px] font-semibold text-[var(--ov-ink)]">
              {globalSearch ? "Nothing matches that search" : "No regions yet"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              {globalSearch ? "Try a different name." : "Regions you add appear here, and become selectable when creating a chapter."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className={`overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] transition-opacity ${
              isFetching ? "opacity-60" : "opacity-100"
            }`}
          >
            <DataTable
              columns={columns}
              data={filteredData}
              searchValues={searchValues}
              onSearchChange={handleSearchChange}
              renderCell={renderCell}
              total={total}
              page={page}
              pageSize={limit}
              onPageChange={(p) => setPage(p)}
            />
          </motion.div>
        )}
    </main>

      <CreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Region"
        fields={regionFields}
        onSubmit={onSubmitRegion}
        submitButtonText="Create"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        isSubmitting={isDeleting}
        actionType="delete"
        title={`Delete ${regionToDelete?.regionName || "this record"}?`}
        description={
          regionToDelete?.noOfChapters && regionToDelete.noOfChapters > 0
            ? `Warning: Deleting "${regionToDelete.regionName}" will also permanently remove its ${regionToDelete.noOfChapters} chapter(s) and all associated member records. This action cannot be undone.`
            : `Are you sure you want to delete "${regionToDelete?.regionName}"? This action cannot be undone.`
        }
        confirmText="Yes, Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
