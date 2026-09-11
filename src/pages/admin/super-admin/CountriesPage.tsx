import { useState, useMemo, useEffect } from "react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { motion, useReducedMotion } from "framer-motion";
import { Trash2, Plus, Globe2, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import DataTable from "../../../components/common/DataTable";
import type { TableColumn } from "../../../components/common/DataTable";
import { CreateModal } from "../../../components/modals";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { Search, X } from "lucide-react";
import { useToast } from "../../../components/toast/ToastProvider";
import { useListCountriesQuery, useCreateCountryMutation, useDeleteCountryMutation } from "../../../services/superadmin/adminGeoApi";

type Row = {
  id: string;
  name: string;
  code?: string;
  phoneCode?: string;
  currency?: string;
  noOfRegions?: number;
};

const COUNTRIES_DATA = [
  {"name": "Afghanistan", "code": "AF"},
  {"name": "Albania", "code": "AL"},
  {"name": "Algeria", "code": "DZ"},
  {"name": "Andorra", "code": "AD"},
  {"name": "Angola", "code": "AO"},
  {"name": "Antigua and Barbuda", "code": "AG"},
  {"name": "Argentina", "code": "AR"},
  {"name": "Armenia", "code": "AM"},
  {"name": "Australia", "code": "AU"},
  {"name": "Austria", "code": "AT"},
  {"name": "Azerbaijan", "code": "AZ"},
  {"name": "Bahamas", "code": "BS"},
  {"name": "Bahrain", "code": "BH"},
  {"name": "Bangladesh", "code": "BD"},
  {"name": "Barbados", "code": "BB"},
  {"name": "Belarus", "code": "BY"},
  {"name": "Belgium", "code": "BE"},
  {"name": "Belize", "code": "BZ"},
  {"name": "Benin", "code": "BJ"},
  {"name": "Bhutan", "code": "BT"},
  {"name": "Bolivia", "code": "BO"},
  {"name": "Bosnia and Herzegovina", "code": "BA"},
  {"name": "Botswana", "code": "BW"},
  {"name": "Brazil", "code": "BR"},
  {"name": "Brunei", "code": "BN"},
  {"name": "Bulgaria", "code": "BG"},
  {"name": "Burkina Faso", "code": "BF"},
  {"name": "Burundi", "code": "BI"},
  {"name": "Cabo Verde", "code": "CV"},
  {"name": "Cambodia", "code": "KH"},
  {"name": "Cameroon", "code": "CM"},
  {"name": "Canada", "code": "CA"},
  {"name": "Central African Republic", "code": "CF"},
  {"name": "Chad", "code": "TD"},
  {"name": "Chile", "code": "CL"},
  {"name": "China", "code": "CN"},
  {"name": "Colombia", "code": "CO"},
  {"name": "Comoros", "code": "KM"},
  {"name": "Congo (Congo-Brazzaville)", "code": "CG"},
  {"name": "Costa Rica", "code": "CR"},
  {"name": "Croatia", "code": "HR"},
  {"name": "Cuba", "code": "CU"},
  {"name": "Cyprus", "code": "CY"},
  {"name": "Czech Republic", "code": "CZ"},
  {"name": "Democratic Republic of the Congo", "code": "CD"},
  {"name": "Denmark", "code": "DK"},
  {"name": "Djibouti", "code": "DJ"},
  {"name": "Dominica", "code": "DM"},
  {"name": "Dominican Republic", "code": "DO"},
  {"name": "Ecuador", "code": "EC"},
  {"name": "Egypt", "code": "EG"},
  {"name": "El Salvador", "code": "SV"},
  {"name": "Equatorial Guinea", "code": "GQ"},
  {"name": "Eritrea", "code": "ER"},
  {"name": "Estonia", "code": "EE"},
  {"name": "Eswatini", "code": "SZ"},
  {"name": "Ethiopia", "code": "ET"},
  {"name": "Fiji", "code": "FJ"},
  {"name": "Finland", "code": "FI"},
  {"name": "France", "code": "FR"},
  {"name": "Gabon", "code": "GA"},
  {"name": "Gambia", "code": "GM"},
  {"name": "Georgia", "code": "GE"},
  {"name": "Germany", "code": "DE"},
  {"name": "Ghana", "code": "GH"},
  {"name": "Greece", "code": "GR"},
  {"name": "Grenada", "code": "GD"},
  {"name": "Guatemala", "code": "GT"},
  {"name": "Guinea", "code": "GN"},
  {"name": "Guinea-Bissau", "code": "GW"},
  {"name": "Guyana", "code": "GY"},
  {"name": "Haiti", "code": "HT"},
  {"name": "Honduras", "code": "HN"},
  {"name": "Hungary", "code": "HU"},
  {"name": "Iceland", "code": "IS"},
  {"name": "India", "code": "IN"},
  {"name": "Indonesia", "code": "ID"},
  {"name": "Iran", "code": "IR"},
  {"name": "Iraq", "code": "IQ"},
  {"name": "Ireland", "code": "IE"},
  {"name": "Israel", "code": "IL"},
  {"name": "Italy", "code": "IT"},
  {"name": "Jamaica", "code": "JM"},
  {"name": "Japan", "code": "JP"},
  {"name": "Jordan", "code": "JO"},
  {"name": "Kazakhstan", "code": "KZ"},
  {"name": "Kenya", "code": "KE"},
  {"name": "Kiribati", "code": "KI"},
  {"name": "Kuwait", "code": "KW"},
  {"name": "Kyrgyzstan", "code": "KG"},
  {"name": "Laos", "code": "LA"},
  {"name": "Latvia", "code": "LV"},
  {"name": "Lebanon", "code": "LB"},
  {"name": "Lesotho", "code": "LS"},
  {"name": "Liberia", "code": "LR"},
  {"name": "Libya", "code": "LY"},
  {"name": "Liechtenstein", "code": "LI"},
  {"name": "Lithuania", "code": "LT"},
  {"name": "Luxembourg", "code": "LU"},
  {"name": "Madagascar", "code": "MG"},
  {"name": "Malawi", "code": "MW"},
  {"name": "Malaysia", "code": "MY"},
  {"name": "Maldives", "code": "MV"},
  {"name": "Mali", "code": "ML"},
  {"name": "Malta", "code": "MT"},
  {"name": "Marshall Islands", "code": "MH"},
  {"name": "Mauritania", "code": "MR"},
  {"name": "Mauritius", "code": "MU"},
  {"name": "Mexico", "code": "MX"},
  {"name": "Micronesia", "code": "FM"},
  {"name": "Moldova", "code": "MD"},
  {"name": "Monaco", "code": "MC"},
  {"name": "Mongolia", "code": "MN"},
  {"name": "Montenegro", "code": "ME"},
  {"name": "Morocco", "code": "MA"},
  {"name": "Mozambique", "code": "MZ"},
  {"name": "Myanmar", "code": "MM"},
  {"name": "Namibia", "code": "NA"},
  {"name": "Nauru", "code": "NR"},
  {"name": "Nepal", "code": "NP"},
  {"name": "Netherlands", "code": "NL"},
  {"name": "New Zealand", "code": "NZ"},
  {"name": "Nicaragua", "code": "NI"},
  {"name": "Niger", "code": "NE"},
  {"name": "Nigeria", "code": "NG"},
  {"name": "North Korea", "code": "KP"},
  {"name": "North Macedonia", "code": "MK"},
  {"name": "Norway", "code": "NO"},
  {"name": "Oman", "code": "OM"},
  {"name": "Pakistan", "code": "PK"},
  {"name": "Palau", "code": "PW"},
  {"name": "Panama", "code": "PA"},
  {"name": "Papua New Guinea", "code": "PG"},
  {"name": "Paraguay", "code": "PY"},
  {"name": "Peru", "code": "PE"},
  {"name": "Philippines", "code": "PH"},
  {"name": "Poland", "code": "PL"},
  {"name": "Portugal", "code": "PT"},
  {"name": "Qatar", "code": "QA"},
  {"name": "Romania", "code": "RO"},
  {"name": "Russia", "code": "RU"},
  {"name": "Rwanda", "code": "RW"},
  {"name": "Saint Kitts and Nevis", "code": "KN"},
  {"name": "Saint Lucia", "code": "LC"},
  {"name": "Saint Vincent and the Grenadines", "code": "VC"},
  {"name": "Samoa", "code": "WS"},
  {"name": "San Marino", "code": "SM"},
  {"name": "Sao Tome and Principe", "code": "ST"},
  {"name": "Saudi Arabia", "code": "SA"},
  {"name": "Senegal", "code": "SN"},
  {"name": "Serbia", "code": "RS"},
  {"name": "Seychelles", "code": "SC"},
  {"name": "Sierra Leone", "code": "SL"},
  {"name": "Singapore", "code": "SG"},
  {"name": "Slovakia", "code": "SK"},
  {"name": "Slovenia", "code": "SI"},
  {"name": "Solomon Islands", "code": "SB"},
  {"name": "Somalia", "code": "SO"},
  {"name": "South Africa", "code": "ZA"},
  {"name": "South Korea", "code": "KR"},
  {"name": "South Sudan", "code": "SS"},
  {"name": "Spain", "code": "ES"},
  {"name": "Sri Lanka", "code": "LK"},
  {"name": "Sudan", "code": "SD"},
  {"name": "Suriname", "code": "SR"},
  {"name": "Sweden", "code": "SE"},
  {"name": "Switzerland", "code": "CH"},
  {"name": "Syria", "code": "SY"},
  {"name": "Taiwan", "code": "TW"},
  {"name": "Tajikistan", "code": "TJ"},
  {"name": "Tanzania", "code": "TZ"},
  {"name": "Thailand", "code": "TH"},
  {"name": "Timor-Leste", "code": "TL"},
  {"name": "Togo", "code": "TG"},
  {"name": "Tonga", "code": "TO"},
  {"name": "Trinidad and Tobago", "code": "TT"},
  {"name": "Tunisia", "code": "TN"},
  {"name": "Turkey", "code": "TR"},
  {"name": "Turkmenistan", "code": "TM"},
  {"name": "Tuvalu", "code": "TV"},
  {"name": "Uganda", "code": "UG"},
  {"name": "Ukraine", "code": "UA"},
  {"name": "United Arab Emirates", "code": "AE"},
  {"name": "United Kingdom", "code": "GB"},
  {"name": "United States of America", "code": "US"},
  {"name": "Uruguay", "code": "UY"},
  {"name": "Uzbekistan", "code": "UZ"},
  {"name": "Vanuatu", "code": "VU"},
  {"name": "Vatican City", "code": "VA"},
  {"name": "Venezuela", "code": "VE"},
  {"name": "Vietnam", "code": "VN"},
  {"name": "Yemen", "code": "YE"},
  {"name": "Zambia", "code": "ZM"},
  {"name": "Zimbabwe", "code": "ZW"}
];

export default function CountriesPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  // Typed vs applied. The input fed the query key directly, so every keystroke
  // was a request; the debounce is what makes the search usable without a
  // button to press.
  const [typedSearch, setTypedSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
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
  const [searchValues, setSearchValues] = useState<{ [key: string]: string }>({});
  const { data, isLoading, isFetching, error } = useListCountriesQuery({ page, limit, search: globalSearch || undefined });
  const total = data?.total ?? 0;

  const [createCountry] = useCreateCountryMutation();
  const [deleteCountry] = useDeleteCountryMutation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [countryToDelete, setCountryToDelete] = useState<Row | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (error) {
      const err: any = error as any;
      const msg = err?.data?.message || err?.error || "Failed to load countries";
      showToast({ title: "Failed to load countries", description: String(msg), kind: "error" });
    }
  }, [error, showToast]);

  const navigate = useNavigate();

  const columns: TableColumn[] = [
    { key: "name", label: "Country Name", sortable: true, searchable: false },
    { key: "noOfRegions", label: "Regions", sortable: true, searchable: false },
    { key: "actions", label: "Actions" },
  ];

  const handleSearchChange = (key: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeleteCountry = (country: Row) => {
    setCountryToDelete(country);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!countryToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteCountry(countryToDelete.id).unwrap();
      showToast({
        title: "Country Deleted",
        description: `Country "${countryToDelete.name}" has been deleted successfully.`,
        kind: "success"
      });
      setShowDeleteDialog(false);
      setCountryToDelete(null);
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
    setCountryToDelete(null);
  };

  const renderCell = (column: TableColumn, row: Row) => {
    if (column.key === "name") {
      return (
        <button
          type="button"
          onClick={() =>
            navigate(`/admin/regions?country_id=${row.id}`, {
              state: { countryId: row.id, countryName: row.name },
            })
          }
          className="group inline-flex items-center gap-1.5 font-semibold text-[#0F172A] hover:text-[#E85A14] transition-colors cursor-pointer"
        >
          <span>{row.name}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#E85A14] transition-transform group-hover:translate-x-0.5" />
        </button>
      );
    }
    if (column.key === "noOfRegions") {
      const count = row.noOfRegions ?? 0;
      return (
        <button
          type="button"
          onClick={() =>
            navigate(`/admin/regions?country_id=${row.id}`, {
              state: { countryId: row.id, countryName: row.name },
            })
          }
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-[#0B2130] hover:bg-[#E85A14]/15 hover:text-[#E85A14] transition-colors cursor-pointer"
          title={`View regions in ${row.name}`}
        >
          <span>{count}</span>
          <span className="text-[10px] text-slate-500 font-normal">
            {count === 1 ? "region" : "regions"}
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
              navigate(`/admin/regions?country_id=${row.id}`, {
                state: { countryId: row.id, countryName: row.name },
              })
            }
            className="px-3 py-1 text-xs font-semibold text-slate-700 hover:text-[#E85A14] hover:bg-orange-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => handleDeleteCountry(row)}
            aria-label={`Delete ${row.name}`}
            title="Delete country"
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
    return list.map((c: any) => ({
      id: String(c.id ?? c._id ?? ""),
      name: c.name,
      code: c.code,
      phoneCode: c.phoneCode,
      currency: c.currency,
      noOfRegions: c.regionsCount ?? c.noOfRegions ?? 0,
    }));
  }, [data]);

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

  const countryFields = [
    { 
      name: "name", 
      label: "Country Name", 
      type: "select" as const, 
      placeholder: "Select a country", 
      required: true,
      searchable: true,
      hideOptionsUntilSearch: false,
      includePlaceholderOption: false,
      searchPlaceholder: "Search countries...",
      menuMaxHeightClass: "max-h-64",
      options: COUNTRIES_DATA.map(country => ({
        value: country.name,
        label: country.name
      }))
    },
  ];

  const onSubmitCreate = async (form: Record<string, string>) => {
    try {
      const selectedCountryName = (form.name || "").trim();
      if (!selectedCountryName) {
        showToast({ title: "Country selection is required", kind: "error" });
        return;
      }
      
      const selectedCountry = COUNTRIES_DATA.find(country => country.name === selectedCountryName);
      if (!selectedCountry) {
        showToast({ title: "Invalid country selection", kind: "error" });
        return;
      }
      
      await createCountry({ 
        name: selectedCountry.name, 
        code: selectedCountry.code, 
        iso2: selectedCountry.code 
      }).unwrap();
      showToast({ title: "Country created" });
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
                <Globe2 className="h-3.5 w-3.5" />
                <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                  Global Network
                </span>
              </div>
            </div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
              Countries
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
              {!isLoading && !error && (
                <>
                  <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{total}</span>{" "}
                  {total === 1 ? "country" : "countries"}
                  {globalSearch ? " matching" : ""}
                  {" · "}
                </>
              )}
              Where the network operates
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
                placeholder="Search countries"
                aria-label="Search countries"
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
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add country
            </button>
          </div>
        </motion.div>

        {error ? (
          // The page used to raise a toast and still render an empty table, so a
          // failed request looked the same as an empty registry.
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
            Couldn&apos;t load countries. Check your connection and try again.
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
              {globalSearch ? "Nothing matches that search" : "No countries yet"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              {globalSearch ? "Try a different name." : "Countries you add appear here, and become selectable when creating a region."}
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
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Country"
        fields={countryFields}
        onSubmit={onSubmitCreate}
        submitButtonText="Create"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        isSubmitting={isDeleting}
        actionType="delete"
        // The dialog asked "are you sure?" without saying about what.
        title={`Delete ${countryToDelete?.name || "this record"}?`}
        description={
          countryToDelete?.noOfRegions && countryToDelete.noOfRegions > 0
            ? `Warning: Deleting "${countryToDelete.name}" will also permanently remove its ${countryToDelete.noOfRegions} region(s) and all associated chapters and member associations. This action cannot be undone.`
            : `Are you sure you want to delete "${countryToDelete?.name}"? This action cannot be undone.`
        }
        confirmText="Yes, Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
