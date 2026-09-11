import { useRef, useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import TableControls from "../../components/common/TableControls";
import DataTable, { type TableColumn } from "../../components/common/DataTable";
import GradientContainer from "../../components/common/GradientContainer";
import FilterSection from "../../components/common/FilterSection";
import { useAppSelector } from "../../app/store";
import {
  useGetUserSocialVolunteersQuery,
  useUpdateUserSocialVolunteerMutation,
  useRemoveUserSocialVolunteerMutation,
} from "../../services/social";
import { useListSocialChaptersQuery } from "../../services/publicApi";
import { CreateModal } from "../../components/modals";
import type { FormField } from "../../components/modals/CreateModal";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { useToast } from "../../components/toast/ToastProvider";


// Table columns configuration
const columns: TableColumn[] = [
  { key: "name", label: "Name", sortable: true, searchable: true },
  { key: "email", label: "Email", sortable: true, searchable: true },
  { key: "phone", label: "Phone", sortable: true, searchable: true },
  { key: "eventDate", label: "Event Date", sortable: true, searchable: false },
  { key: "eventName", label: "Event Name", sortable: true, searchable: true },
  { key: "chapterName", label: "Chapter Name", sortable: true, searchable: true },
  { key: "area", label: "Area", sortable: true, searchable: true },
  { key: "actions", label: "Actions" },
];

const VOLUNTEER_CATEGORY_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "EVENT_COORDINATOR", label: "Event Coordinator" },
  { value: "FUNDRAISER", label: "Fundraiser" },
  { value: "OUTREACH", label: "Outreach" },
  { value: "LOGISTICS", label: "Logistics" },
  { value: "MARKETING", label: "Marketing" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "HOSPITALITY", label: "Hospitality" },
  { value: "OTHER", label: "Other" },
];

// Helper to format date as DD/MM/YYYY
const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB");
};

export default function ManageVolunteersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAppSelector((s) => s.auth.user);
  const { showToast } = useToast();
  const [updateVolunteer, { isLoading: isUpdatingVolunteer }] =
    useUpdateUserSocialVolunteerMutation();
  const [removeVolunteer, { isLoading: isDeletingVolunteer }] =
    useRemoveUserSocialVolunteerMutation();

  const [viewingVolunteer, setViewingVolunteer] = useState<any | null>(null);
  const [editingVolunteer, setEditingVolunteer] = useState<any | null>(null);
  const [deletingVolunteerId, setDeletingVolunteerId] = useState<string | null>(null);

  // Extract countryId, regionId, and socialChapterId from user assignments
  const userCountryId = authUser?.assignments?.[0]?.scope?.country || "";
  const userRegionId = authUser?.assignments?.[0]?.scope?.region || "";
  const userSocialChapterId = authUser?.assignments?.[0]?.scope?.socialChapter || "";

  // Default to current week for date range
  const firstDayOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(d.setDate(diff));
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(monday.getDate()).padStart(2, "0");
    return `${y}-${m}-${dayOfMonth}`;
  };

  const lastDayOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Adjust for Sunday end
    const sunday = new Date(d.setDate(diff));
    const y = sunday.getFullYear();
    const m = String(sunday.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(sunday.getDate()).padStart(2, "0");
    return `${y}-${m}-${dayOfMonth}`;
  };

  // Pending (UI) filters
  const [pendingStartDate, setPendingStartDate] = useState<string>("");
  const [pendingEndDate, setPendingEndDate] = useState<string>("");
  const [pendingChapter, setPendingChapter] = useState<string>("");

  // Applied filters
  const [startDate, setStartDate] = useState(firstDayOfWeek());
  const [endDate, setEndDate] = useState(lastDayOfWeek());
  const [selectedChapter, setSelectedChapter] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnSearches, setColumnSearches] = useState<{ [key: string]: string }>({});
  const [page, setPage] = useState(1);

  // ✅ ADD: Fetch chapters dynamically
  const { data: chaptersResponse } = useListSocialChaptersQuery(
    userRegionId ? { regionId: userRegionId, limit: 100 } : undefined,
    { skip: !userRegionId }
  );

  // ✅ ADD: Format chapters for dropdown
  const chapterOptions = useMemo(() => {
    const options = [{ label: "All Chapters", value: "" }];
    if (chaptersResponse?.data) {
      chaptersResponse.data.forEach((chapter: any) => {
        options.push({
          label: chapter.name,
          value: chapter.id,
        });
      });
    }
    return options;
  }, [chaptersResponse]);

  // User-facing endpoint: scoped to the member's chapter automatically by the backend
  const { data: volunteersResponse, isLoading, error } = useGetUserSocialVolunteersQuery(
    {
      socialChapterId: selectedChapter || userSocialChapterId || undefined,
      q: searchTerm || undefined,
      page,
      limit: entriesPerPage,
    },
  );

  // ✅ ADD: Handle refresh after adding volunteer
  useEffect(() => {
    const state = location.state as { refresh?: boolean } | null;
    if (state?.refresh) {
      // Clear the state to prevent repeated refetches
      navigate(location.pathname, { replace: true, state: {} });
      // RTK Query will automatically refetch due to cache invalidation
    }
  }, [location.state, navigate, location.pathname]);

  // ✅ ADD: Create a chapter ID to name map
  const chapterMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (chaptersResponse?.data) {
      chaptersResponse.data.forEach((chapter: any) => {
        map[chapter.id] = chapter.name;
      });
    }
    return map;
  }, [chaptersResponse]);

  // Format data for display
  const formattedVolunteers = useMemo(() => {
    if (!volunteersResponse?.data?.items) return [];

    return volunteersResponse.data.items.map((volunteer: any) => {
      const chapterName =
        volunteer.chapterName ||
        volunteer.socialChapterId?.name ||
        (volunteer.socialChapterId && chapterMap[volunteer.socialChapterId]) ||
        "N/A";

      const eventName =
        volunteer.eventName ||
        volunteer.eventId?.title ||
        (volunteer.eventId ? "Event assigned" : "Not assigned to event");

      const eventDate =
        volunteer.eventDate ||
        volunteer.eventId?.startsAt ||
        volunteer.createdAt ||
        "";

      return {
        id: volunteer._id || volunteer.id,
        name: volunteer.name || "N/A",
        email: volunteer.email || "N/A",
        phone: volunteer.phone || "N/A",
        eventDate: formatDate(eventDate),
        eventName: eventName,
        chapterName: chapterName,
        area: volunteer.area || "N/A",
        __raw: volunteer,
      };
    });
  }, [volunteersResponse, chapterMap]);

  const editVolunteerFields: FormField[] = useMemo(
    () => [
      { name: "firstName", label: "First Name", type: "text", required: true, placeholder: "First name" },
      { name: "lastName", label: "Last Name", type: "text", placeholder: "Last name" },
      { name: "email", label: "Email", type: "text", placeholder: "name@example.com" },
      { name: "phone", label: "Phone", type: "text", placeholder: "Phone" },
      {
        name: "category",
        label: "Category",
        type: "select",
        placeholder: "Select category",
        options: VOLUNTEER_CATEGORY_OPTIONS,
      },
      { name: "city", label: "City", type: "text", placeholder: "City" },
      { name: "state", label: "State", type: "text", placeholder: "State" },
    ],
    [],
  );

  const editInitial = useMemo(() => {
    const v = editingVolunteer?.__raw || editingVolunteer;
    if (!v) return undefined;
    const fallbackFirst = (v.firstName as string) || (v.name as string)?.split(" ")[0] || "";
    const fallbackLast =
      (v.lastName as string) ||
      (v.name as string)?.split(" ").slice(1).join(" ") ||
      "";
    return {
      firstName: fallbackFirst,
      lastName: fallbackLast,
      email: v.email || "",
      phone: v.phone || "",
      category: v.category || "",
      city: v.city || (v.area && v.area !== "N/A" ? v.area : "") || "",
      state: v.state || "",
    };
  }, [editingVolunteer]);

  const handleEditVolunteerSubmit = async (
    form: Record<string, string>,
  ): Promise<{ errors?: Record<string, string> } | void> => {
    const id = editingVolunteer?.id || editingVolunteer?._id;
    if (!id) return;
    const firstName = form.firstName?.trim();
    if (!firstName) return { errors: { firstName: "First name is required" } };
    try {
      await updateVolunteer({
        id,
        firstName,
        lastName: form.lastName?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        category: (form.category as any) || undefined,
        city: form.city?.trim() || undefined,
        state: form.state?.trim() || undefined,
      }).unwrap();
      showToast({
        title: "Volunteer updated",
        description: "Changes saved successfully.",
        kind: "success",
      });
      setEditingVolunteer(null);
    } catch (err: any) {
      return {
        errors: {
          form:
            err?.data?.errors?.[0]?.message ||
            err?.data?.message ||
            "Failed to update volunteer",
        },
      };
    }
  };

  const handleConfirmDeleteVolunteer = async () => {
    if (!deletingVolunteerId) return;
    try {
      await removeVolunteer(deletingVolunteerId).unwrap();
      showToast({
        title: "Volunteer removed",
        description: "Volunteer has been deleted.",
        kind: "success",
      });
      setDeletingVolunteerId(null);
    } catch (err: any) {
      showToast({
        title: "Failed to delete",
        description: err?.data?.message || "Could not delete volunteer",
        kind: "error",
      });
    }
  };

  // Filter data based on column searches (client-side filtering for specific columns)
  const filteredData = useMemo(() => {
    let result = [...formattedVolunteers];

    // Apply column searches
    if (Object.keys(columnSearches).length > 0) {
      result = result.filter((volunteer) => {
        return Object.entries(columnSearches).every(([key, value]) => {
          if (!value) return true;
          const fieldValue = volunteer[key as keyof typeof volunteer];
          return String(fieldValue)
            .toLowerCase()
            .includes(value.toLowerCase());
        });
      });
    }

    return result;
  }, [formattedVolunteers, columnSearches]);

  const handleSearch = () => {
    if (pendingStartDate) setStartDate(pendingStartDate);
    if (pendingEndDate) setEndDate(pendingEndDate);
    // ✅ FIX: Always update selectedChapter, even if empty (to clear filter)
    setSelectedChapter(pendingChapter);
    setPage(1); // Reset to first page on new search
  };

  const handleColumnSearchChange = (key: string, value: string) => {
    setColumnSearches((prev) => ({ ...prev, [key]: value }));
  };

  const handleEntriesChange = (newLimit: number) => {
    setEntriesPerPage(newLimit);
    setPage(1); // Reset to first page when changing entries per page
  };

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page when searching
  };

  const shownOnceRef = useRef(false);
  useEffect(() => {
    if (shownOnceRef.current) return;
    shownOnceRef.current = true;
    const state = location.state as { toast?: any } | null;
    if (state?.toast) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const breadcrumbs = [
    { label: "Social", onClick: () => navigate("/dashboard") },
    { label: "Manage Volunteers" },
  ];

  // Get total from API response
  const totalRecords = volunteersResponse?.data?.total || 0;

  // The user-facing endpoint resolves the member's chapter from auth; no countryId guard needed.

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={authUser?.name || ""} />

      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <PageHeader breadcrumbs={breadcrumbs} />

        {/* Filters Section */}
        <FilterSection
          startDate={pendingStartDate || startDate}
          endDate={pendingEndDate || endDate}
          onStartDateChange={setPendingStartDate}
          onEndDateChange={setPendingEndDate}
          onSearch={handleSearch}
          showSearchButton={true}
          showDropdown={true}
          dropdownLabel="Chapter"
          dropdownOptions={chapterOptions} // ✅ CHANGED: Use dynamic chapters
          dropdownValue={pendingChapter || selectedChapter}
          onDropdownChange={setPendingChapter}
          onAdd={() => navigate('/social/add-volunteer', {
            state: {
              countryId: userCountryId,
              regionId: userRegionId,
              socialChapterId: userSocialChapterId,
            }
          })}
          addButtonLabel="Add Voluntary +"
        />

        {/* Table Section */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            {/* Table Controls */}
            <TableControls
              entriesPerPage={entriesPerPage}
              onEntriesChange={handleEntriesChange}
              searchTerm={searchTerm}
              onSearchChange={handleSearchTermChange}
            />

            {/* Error State */}
            {error && (
              <div className="p-4 text-red-400 text-center">
                Error loading volunteers. Please try again.
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="p-8 text-gray-400 text-center">
                Loading volunteers...
              </div>
            )}

            {/* Data Table */}
            {!isLoading && !error && (
              <DataTable
                columns={columns}
                data={filteredData}
                searchValues={columnSearches}
                onSearchChange={handleColumnSearchChange}
                total={totalRecords}
                page={page}
                pageSize={entriesPerPage}
                onPageChange={setPage}
                renderCell={(col, row) => {
                  if (col.key !== "actions") return null;
                  return (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingVolunteer(row);
                        }}
                        className="rounded-full border border-white/30 px-3 py-1 text-xs font-medium text-white hover:bg-white/10"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingVolunteer(row);
                        }}
                        className="rounded-full border border-[#D85D27] px-3 py-1 text-xs font-medium text-[#D85D27] hover:bg-[#D85D27] hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingVolunteerId(row.id);
                        }}
                        className="rounded-full border border-red-500 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  );
                }}
              />
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredData.length === 0 && (
              <div className="p-8 text-gray-400 text-center">
                No volunteers found. Try adjusting your filters.
              </div>
            )}
          </div>
        </GradientContainer>
      </main>

      <CreateModal
        key={`vol-edit-${editingVolunteer?.id || "none"}`}
        isOpen={!!editingVolunteer}
        onClose={() => setEditingVolunteer(null)}
        title="Edit Volunteer"
        fields={editVolunteerFields}
        onSubmit={handleEditVolunteerSubmit}
        initialValues={editInitial}
        submitButtonText={isUpdatingVolunteer ? "Saving..." : "Update"}
      />

      {viewingVolunteer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setViewingVolunteer(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1A2230] p-6 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Volunteer Details</h3>
              <button
                type="button"
                onClick={() => setViewingVolunteer(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <VolViewRow label="Name" value={viewingVolunteer.name || "—"} />
              <VolViewRow label="Email" value={viewingVolunteer.email || "—"} />
              <VolViewRow label="Phone" value={viewingVolunteer.phone || "—"} />
              <VolViewRow label="Chapter" value={viewingVolunteer.chapterName || "—"} />
              <VolViewRow label="Area" value={viewingVolunteer.area || "—"} />
              <VolViewRow label="Event" value={viewingVolunteer.eventName || "—"} />
              <VolViewRow label="Event Date" value={viewingVolunteer.eventDate || "—"} />
              <VolViewRow
                label="Category"
                value={
                  viewingVolunteer.__raw?.category ||
                  viewingVolunteer.__raw?.customCategory ||
                  "—"
                }
              />
            </dl>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deletingVolunteerId}
        onClose={() => setDeletingVolunteerId(null)}
        onConfirm={handleConfirmDeleteVolunteer}
        actionType="delete"
        isSubmitting={isDeletingVolunteer}
      />
    </div>
  );
}

function VolViewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-2">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-right text-white font-medium break-all">{value}</dd>
    </div>
  );
}
