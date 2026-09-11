import React from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { SocialLayout } from "../../components/social";
import GradientContainer from "../../components/common/GradientContainer";
import { StatCard } from "../../components/dashboard";

import { useToast } from "../../components/toast/ToastProvider";
import {
  useGetUserSocialEventQuery,
  useJoinUserEventMutation,
  useUpdateUserSocialVolunteerMutation,
  useRemoveUserSocialVolunteerMutation,
  useGetUserSocialEventMembersQuery,
  useGetUserSocialEventVolunteersQuery,
  useListEventDonationsQuery,
  useRemoveEventDonationMutation,
  useUpdateMemberAttendanceMutation,
} from "../../services/social";
import { useUsersMeQuery } from "../../services/authApi";
import type { UserSocialVolunteerItem, CreateUserSocialVolunteerParams } from "../../services/social/volunteersApi";
import AddVolunteerModal from "../../components/modals/AddVolunteerModal";
import RecordDonationModal from "../../components/modals/RecordDonationModal";
import DataTable from "../../components/common/DataTable";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";

interface EventDetails {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  description: string;
  imageUrl?: string | null;
  location?: string;
  chapterName?: string | null;
  socialChapterId?: string | null;
  countryId?: string | null;
  regionId?: string | null;
  countryName?: string | null;
  regionName?: string | null;
  status: string;
  mode?: string;
  type?: string;
  link?: string | null;
  eventType?: string;
  category?: string;
  categoryLabel?: string;
  contactPerson?: string;
  costForMembers?: number;
  costForNonMembers?: number;
  currency?: string;
  maxAttendees?: number;
  numberOfRegistrations?: number;
  createdBy?: string;
}

function prettifyEnum(value?: string): string {
  if (!value) return "N/A";
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatDateTime(dateString?: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  let hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

const fmtMoney = (n?: number, currency?: string) =>
  `${currency || "INR"} ${Number(n ?? 0).toFixed(2)}`;

type PageTab = "event-details" | "members" | "volunteers" | "donations";

export default function ViewEventPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  React.useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) navigate("/login");
  }, [navigate]);

  const { data: meData } = useUsersMeQuery();

  const { data, isLoading, isError, error } = useGetUserSocialEventQuery(id!, {
    skip: !id,
    refetchOnMountOrArgChange: true,
  });

  const [joinUserEvent, { isLoading: isJoining }] = useJoinUserEventMutation();

  // ── Member attendance edit mode ──
  const [updateMemberAttendance] = useUpdateMemberAttendanceMutation();
  const [isMembersEditing, setIsMembersEditing] = React.useState(false);
  const [editableAttendance, setEditableAttendance] = React.useState<Record<string, "P" | "A">>({});
  const [isSavingAttendance, setIsSavingAttendance] = React.useState(false);

  // ── Volunteer edit/delete (update + remove stay here; create moved to modal) ──
  const [updateUserVolunteer, { isLoading: isUpdatingVolunteer }] =
    useUpdateUserSocialVolunteerMutation();
  const [removeUserVolunteer, { isLoading: isRemovingVolunteer }] =
    useRemoveUserSocialVolunteerMutation();

  // ── Volunteer modal state ──
  const [isVoluntaryOpen, setIsVoluntaryOpen] = React.useState(false);
  const [viewingVolunteer, setViewingVolunteer] =
    React.useState<UserSocialVolunteerItem | null>(null);
  const [editingVolunteer, setEditingVolunteer] = React.useState<
    (UserSocialVolunteerItem & { countryId?: string; regionId?: string }) | null
  >(null);
  const [deletingVolunteerId, setDeletingVolunteerId] = React.useState<string | null>(null);

  // ── Donation modal state ──
  const [donationTarget, setDonationTarget] = React.useState<{
    donorUserId?: string;
    donorName: string;
    donorEmail?: string;
    donorPhone?: string;
  } | null>(null);
  const [editingDonation, setEditingDonation] = React.useState<{
    id: string;
    donorName: string;
    donorEmail?: string;
    donorPhone?: string;
    amount: number;
    currency: string;
    note?: string;
  } | null>(null);
  const [viewingDonation, setViewingDonation] = React.useState<{
    id: string;
    donorName: string;
    donorEmail?: string;
    donorPhone?: string;
    amount: number;
    currency: string;
    note?: string;
    createdAt: string;
  } | null>(null);
  const [deletingDonationId, setDeletingDonationId] = React.useState<string | null>(null);

  const isDonationModalOpen = !!donationTarget || !!editingDonation;

  // ── Page tab ──
  const [pageTab, setPageTab] = React.useState<PageTab>("event-details");

  const [membersSearch, setMembersSearch] = React.useState("");
  const [volunteersSearch, setVolunteersSearch] = React.useState("");
  const [memberPage, setMemberPage] = React.useState(1);
  const [volunteerPage, setVolunteerPage] = React.useState(1);
  const tableLimit = 10;

  const {
    data: membersResp,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers,
  } = useGetUserSocialEventMembersQuery(
    {
      eventId: id || "",
      search: membersSearch || undefined,
      page: memberPage,
      limit: tableLimit,
    },
    { skip: !id || pageTab !== "members" },
  );

  const {
    data: volunteersResp,
    isLoading: volunteersLoading,
    isError: volunteersError,
    refetch: refetchVolunteers,
  } = useGetUserSocialEventVolunteersQuery(
    {
      eventId: id || "",
      search: volunteersSearch || undefined,
      page: volunteerPage,
      limit: tableLimit,
    },
    { skip: !id || pageTab !== "volunteers" },
  );

  const memberSearchValues = React.useMemo(
    () => ({ name: membersSearch }),
    [membersSearch],
  );
  const volunteerSearchValues = React.useMemo(
    () => ({ name: volunteersSearch }),
    [volunteersSearch],
  );

  const handleMembersSearch = (key: string, value: string) => {
    if (key !== "name") return;
    setMembersSearch(value);
    setMemberPage(1);
  };
  const handleVolunteersSearch = (key: string, value: string) => {
    if (key !== "name") return;
    setVolunteersSearch(value);
    setVolunteerPage(1);
  };

  const membersRows = React.useMemo(
    () =>
      (membersResp?.data?.items || []).map((m) => ({
        name: m.name || "N/A",
        attendance: m.attendance || "N/A",
        phone: m.phone || "N/A",
        chapter: m.chapterName || "N/A",
        area: m.area || "N/A",
        __member: m,
      })),
    [membersResp],
  );

  const handleMembersEdit = () => {
    const initial: Record<string, "P" | "A"> = {};
    (membersResp?.data?.items || []).forEach((m) => {
      if (m.id) initial[m.id] = (m.attendance || "").toUpperCase() === "P" ? "P" : "A";
    });
    setEditableAttendance(initial);
    setIsMembersEditing(true);
  };

  const handleMembersSubmit = async () => {
    if (!id) return;
    setIsSavingAttendance(true);
    try {
      await Promise.all(
        Object.entries(editableAttendance).map(([memberId, attendance]) =>
          updateMemberAttendance({ eventId: id, memberId, attendance }).unwrap()
        )
      );
      showToast({ title: "Attendance updated", kind: "success" });
      setIsMembersEditing(false);
      await refetchMembers();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      showToast({ title: "Failed to update", description: e?.data?.message || "Could not update attendance", kind: "error" });
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const volunteersRows = React.useMemo(
    () =>
      (volunteersResp?.data?.items || []).map((v) => ({
        name: v.name || "N/A",
        attendance: v.attendance || "N/A",
        phone: v.phone || "N/A",
        chapter: v.chapterName || "N/A",
        voluntaryCount: v.noOfVoluntary ?? 0,
        fundsDonated: v.fundsDonated ?? 0,
        city: v.city || "N/A",
        __raw: v,
      })),
    [volunteersResp],
  );

  // ── Donations ──
  const [donationsPage, setDonationsPage] = React.useState(1);
  const [donationsSearch, setDonationsSearch] = React.useState("");

  const {
    data: donationsResp,
    isLoading: donationsLoading,
    isError: donationsError,
    refetch: refetchDonations,
  } = useListEventDonationsQuery(
    {
      eventId: id || "",
      search: donationsSearch || undefined,
      page: donationsPage,
      limit: tableLimit,
    },
    { skip: !id || pageTab !== "donations" },
  );

  const donationsRows = React.useMemo(
    () =>
      (donationsResp?.data?.items || []).map((d) => ({
        id: d.id,
        name: d.donorName || "Donor",
        email: d.donorEmail || "N/A",
        phone: d.donorPhone || "N/A",
        amount: `${d.currency || "INR"} ${Number(d.amount || 0).toFixed(2)}`,
        note: d.note || "—",
        createdAt: new Date(d.createdAt).toLocaleString("en-GB"),
        __raw: d,
      })),
    [donationsResp],
  );

  const handleDonationsSearch = (key: string, value: string) => {
    if (key !== "name") return;
    setDonationsSearch(value);
    setDonationsPage(1);
  };

  const [removeDonation, { isLoading: isRemovingDonation }] =
    useRemoveEventDonationMutation();

  const handleConfirmDeleteDonation = async () => {
    if (!deletingDonationId || !id) return;
    try {
      await removeDonation({ donationId: deletingDonationId, eventId: id }).unwrap();
      await refetchDonations();
      showToast({ title: "Donation removed", description: "Donation has been deleted.", kind: "success" });
      setDeletingDonationId(null);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      showToast({
        title: "Failed to delete",
        description: e?.data?.message || "Could not delete donation",
        kind: "error",
      });
    }
  };

  // ── Volunteer edit submit ──
  const handleVolunteerEditSubmit = async (
    form: Record<string, string>,
  ): Promise<{ errors?: Record<string, string> } | void> => {
    if (!editingVolunteer)
      return { errors: { form: "No volunteer selected for editing." } };
    const firstName = form.firstName?.trim();
    if (!firstName) return { errors: { firstName: "First name is required." } };
    try {
      await updateUserVolunteer({
        id: editingVolunteer.id,
        firstName,
        lastName: form.lastName?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        category: (form.category as CreateUserSocialVolunteerParams["category"]) || undefined,
        attendance: (form.attendance as CreateUserSocialVolunteerParams["attendance"]) || undefined,
        city: form.city?.trim() || undefined,
        state: form.state?.trim() || undefined,
      }).unwrap();
      await refetchVolunteers();
      showToast({ title: "Volunteer updated", kind: "success" });
      setEditingVolunteer(null);
    } catch (err: unknown) {
      const e = err as { data?: { errors?: { message?: string }[]; message?: string }; message?: string };
      const message =
        e?.data?.errors?.[0]?.message ||
        e?.data?.message ||
        e?.message ||
        "Failed to update volunteer.";
      return { errors: { form: message } };
    }
  };

  const handleConfirmDeleteVolunteer = async () => {
    if (!deletingVolunteerId) return;
    try {
      await removeUserVolunteer(deletingVolunteerId).unwrap();
      await refetchVolunteers();
      showToast({ title: "Volunteer deleted", kind: "success" });
      setDeletingVolunteerId(null);
    } catch {
      showToast({ title: "Failed to delete volunteer", kind: "error" });
    }
  };

  // ── Derived stats ──
  const totalMembers = membersResp?.data?.total ?? 0;
  const totalAttendees = React.useMemo(
    () =>
      (membersResp?.data?.items || []).filter(
        (m) => (m.attendance || "").toUpperCase() === "P",
      ).length,
    [membersResp],
  );
  const totalVolunteers = volunteersResp?.data?.total ?? 0;
  const totalDonationsAmount = donationsResp?.data?.totalAmount ?? 0;
  const totalDonationsCount = donationsResp?.data?.total ?? 0;

  const navSource = React.useMemo(() => {
    return location.state?.from || "all-events";
  }, [location.state]);

  const isFromMyEvents = navSource === "my-events";
  const currentUserId = meData?.data?._id;
  const eventCreatedBy = data?.data?.createdBy;
  const isEventOwner =
    Boolean(data?.data?.isCreatedByMe) ||
    (!!currentUserId && !!eventCreatedBy && currentUserId === eventCreatedBy);

  const isFromUpcomingEvents =
    navSource === "upcoming-events";

  const shouldShowManagementTabs = true;

  const pageTabs: { key: PageTab; label: string }[] = [
    {
      key: "event-details",
      label: "Event Details",
    },

    ...(shouldShowManagementTabs
      ? [
        {
          key: "members" as PageTab,
          label: "Members",
        },
        {
          key: "volunteers" as PageTab,
          label: "Volunteers",
        },
        {
          key: "donations" as PageTab,
          label: "Donations",
        },
      ]
      : []),
  ];

  const [hasJoined, setHasJoined] = React.useState(false);

  React.useEffect(() => {
    if (data?.data) {
      setHasJoined(
        isFromMyEvents || data.data.isUserJoined || data.data.status === "joined",
      );
    }
  }, [data, isFromMyEvents]);

  const handleJoinEvent = async () => {
    if (!id || isJoining) return;
    try {
      await joinUserEvent(id).unwrap();
      setHasJoined(true);
      showToast({ title: "Joined", description: "You have successfully joined this event.", kind: "success" });
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { message?: string } };
      const msg = String(e?.data?.message || "").toLowerCase();
      if (e?.status === 409 || msg.includes("already")) {
        setHasJoined(true);
        showToast({ title: "Already joined", description: "You have already joined this event.", kind: "success" });
      } else {
        showToast({ title: "Failed to join", description: e?.data?.message || "Something went wrong", kind: "error" });
      }
    }
  };

  const shouldShowJoinNow = isFromUpcomingEvents && !hasJoined;

  // ── Loading / error states ──
  if (isLoading) {
    return (
      <SocialLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
        </div>
      </SocialLayout>
    );
  }

  if (isError || !data?.data) {
    return (
      <SocialLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-400 text-lg mb-4">
              {error && "data" in error && (error.data as { message?: string })?.message
                ? (error.data as { message?: string }).message
                : "Failed to load event details"}
            </p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </SocialLayout>
    );
  }

  const eventDetails: EventDetails = data.data;


  return (
    <SocialLayout>
      {/* ── Tab bar + action buttons ── */}
      <div className="flex items-end justify-between border-b border-white/10 mb-6">
        <nav className="flex gap-2 sm:gap-6">
          {pageTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPageTab(tab.key)}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors whitespace-nowrap ${pageTab === tab.key
                  ? "border-[#D85D27] text-white"
                  : "border-transparent text-gray-400 hover:text-white"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 pb-2">
          {shouldShowJoinNow && (
            <button
              onClick={handleJoinEvent}
              disabled={isJoining}
              className="px-6 py-2.5 bg-[#D85D27] hover:bg-[#C24F20] disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isJoining ? "Joining..." : "Join Now"}
            </button>
          )}
          {isEventOwner && pageTab === "volunteers" && (
            <button
              onClick={() => setIsVoluntaryOpen(true)}
              className="px-6 py-2.5 border border-[#D85D27] text-[#D85D27] hover:bg-[#D85D27] hover:text-white font-medium rounded-lg transition-colors"
            >
              Add Voluntary +
            </button>
          )}
          {isEventOwner && pageTab === "donations" && (
            <button
              onClick={() => setDonationTarget({ donorName: "" })}
              className="px-6 py-2.5 border border-[#D85D27] text-[#D85D27] hover:bg-[#D85D27] hover:text-white font-medium rounded-lg transition-colors"
            >
              Record Donation +
            </button>
          )}
        </div>
      </div>

      {/* ══ TAB: Event Details ══ */}
      {pageTab === "event-details" && (
        <>
          <section className="mb-8">
            <div className="flex flex-col md:flex-row items-stretch gap-6 md:gap-10">
              <div className="w-full md:w-[400px] lg:w-[460px] h-[260px] md:h-[320px] rounded-[18px] overflow-hidden flex-shrink-0 bg-black/20">
                {eventDetails.imageUrl ? (
                  <img
                    src={eventDetails.imageUrl}
                    alt={eventDetails.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[#2B2B2B] to-[#111722] flex items-center justify-center">
                    <span className="text-white/70 text-sm font-medium uppercase tracking-wider">
                      {eventDetails.eventType || eventDetails.category || "Event"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-[28px] md:text-[40px] leading-[1.1] font-extrabold text-white mb-3">
                  {eventDetails.title}
                </h1>
                <div className="space-y-2 text-gray-300">
                  <p className="text-sm md:text-base font-medium">
                    {formatDateTime(eventDetails.startsAt)} to{" "}
                    {formatDateTime(eventDetails.endsAt)}
                  </p>
                  <p className="text-sm md:text-base font-semibold">
                    {eventDetails.chapterName || "N/A"}
                  </p>
                  <p className="text-sm md:text-base leading-7 text-gray-300/90 whitespace-pre-line">
                    {eventDetails.description}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border-2 border-[#D85D27] bg-[#2B2B2B]/80 overflow-hidden">
            <div className="bg-[#D85D27] px-6 md:px-8 py-4 md:py-5">
              <h2 className="text-xl md:text-2xl font-extrabold text-white">Event Details</h2>
            </div>
            <div className="px-6 md:px-8 py-6 md:py-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
              <DetailRow label="Event Type" value={prettifyEnum(eventDetails.eventType)} />
              <DetailRow label="Category" value={prettifyEnum(eventDetails.categoryLabel)} />
              <DetailRow label="Mode" value={prettifyEnum(eventDetails.mode)} />
              <DetailRow label="Type" value={eventDetails.type || prettifyEnum(eventDetails.mode)} />
              <DetailRow label="Country" value={eventDetails.countryName || "N/A"} />
              <DetailRow label="Region" value={eventDetails.regionName || "N/A"} />
              <DetailRow label="Chapter" value={eventDetails.chapterName || "N/A"} />
              <DetailRow label="Contact Person" value={eventDetails.contactPerson || "N/A"} />
              <DetailRow label="Cost for Members" value={fmtMoney(eventDetails.costForMembers, eventDetails.currency)} />
              <DetailRow label="Cost for Non-Members" value={fmtMoney(eventDetails.costForNonMembers, eventDetails.currency)} />
              <DetailRow label="Max. no. of Attendees" value={eventDetails.maxAttendees ? String(eventDetails.maxAttendees) : "N/A"} />
              <DetailRow label="Number of Registrations" value={eventDetails.numberOfRegistrations !== undefined ? String(eventDetails.numberOfRegistrations) : "0"} />
              <DetailRow label="Status" value={prettifyEnum(eventDetails.status)} />
              <DetailRow
                label="Link"
                value={
                  eventDetails.link ? (
                    <a href={eventDetails.link} target="_blank" rel="noreferrer" className="text-[#FF8A4C] underline break-all">
                      {eventDetails.link}
                    </a>
                  ) : (
                    "N/A"
                  )
                }
              />
            </div>
          </section>
        </>
      )}

      {/* ══ TAB: Members ══ */}
      {shouldShowManagementTabs && pageTab === "members" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
            <GradientContainer>
              <StatCard title="Total Members" value={String(totalMembers)} icon="social-users" />
            </GradientContainer>
            <GradientContainer>
              <StatCard title="No of Attendees" value={String(totalAttendees)} icon="tick-calender" />
            </GradientContainer>
          </div>

          {isEventOwner && (
            <div className="flex justify-end mb-4">
              <button
                onClick={isMembersEditing ? handleMembersSubmit : handleMembersEdit}
                disabled={isSavingAttendance}
                className="px-6 py-2.5 bg-[#D85D27] hover:bg-[#C24F20] disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {isMembersEditing ? (isSavingAttendance ? "Submitting..." : "Submit") : "Edit"}
              </button>
            </div>
          )}

          {membersLoading && <div className="p-8 text-center text-gray-400">Loading members...</div>}
          {membersError && <div className="p-4 text-center text-red-400">Error loading members.</div>}
          {!membersLoading && !membersError && (
            <DataTable
              noMinWidth
              columns={[
                { key: "name", label: "Name", searchable: true },
                { key: "attendance", label: "Attendance" },
                { key: "phone", label: "Phone" },
                { key: "chapter", label: "Chapter Name" },
                { key: "area", label: "Area" },
              ]}
              data={membersRows}
              searchValues={memberSearchValues}
              onSearchChange={handleMembersSearch}
              total={membersResp?.data?.total || membersRows.length}
              page={memberPage}
              pageSize={tableLimit}
              onPageChange={setMemberPage}
              renderCell={(col, row) => {
                if (col.key === "attendance" && isMembersEditing) {
                  const member = (row as Record<string, unknown>).__member as { id?: string } | undefined;
                  if (!member?.id) return null;
                  return (
                    <select
                      value={editableAttendance[member.id] ?? "A"}
                      onChange={(e) =>
                        setEditableAttendance((prev) => ({
                          ...prev,
                          [member.id!]: e.target.value as "P" | "A",
                        }))
                      }
                      className="bg-[#1A2230] border border-white/20 rounded px-2 py-1 text-sm text-white"
                    >
                      <option value="P">Present</option>
                      <option value="A">Absent</option>
                    </select>
                  );
                }
                return null;
              }}
            />
          )}
        </>
      )}

      {/* ══ TAB: Volunteers ══ */}
      {shouldShowManagementTabs && pageTab === "volunteers" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
            <GradientContainer>
              <StatCard title="Total Volunteers" value={String(totalVolunteers)} icon="social-users" />
            </GradientContainer>
          </div>

          {volunteersLoading && <div className="p-8 text-center text-gray-400">Loading volunteers...</div>}
          {volunteersError && <div className="p-4 text-center text-red-400">Error loading volunteers.</div>}
          {!volunteersLoading && !volunteersError && (
            <DataTable
              noMinWidth
              columns={[
                { key: "name", label: "Name", searchable: true },
                { key: "attendance", label: "Attendance" },
                { key: "phone", label: "Phone" },
                { key: "chapter", label: "Chapter Name" },
                { key: "city", label: "City" },
                { key: "actions", label: "Actions" },
              ]}
              data={volunteersRows}
              searchValues={volunteerSearchValues}
              onSearchChange={handleVolunteersSearch}
              total={volunteersResp?.data?.total || volunteersRows.length}
              page={volunteerPage}
              pageSize={tableLimit}
              onPageChange={setVolunteerPage}
              renderCell={(col, row) => {
                if (col.key !== "actions") return null;
                const raw = (row as Record<string, unknown>).__raw as UserSocialVolunteerItem | undefined;
                if (!raw) return null;
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    {isEventOwner && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditingVolunteer(raw); }}
                          className="rounded-full border border-[#D85D27] px-3 py-1 text-xs font-medium text-[#D85D27] hover:bg-[#D85D27] hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeletingVolunteerId(raw.id); }}
                          className="rounded-full border border-red-500 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                );
              }}
            />
          )}
        </>
      )}

      {/* ══ TAB: Donations ══ */}
      {shouldShowManagementTabs && pageTab === "donations" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
            <GradientContainer>
              <StatCard title="Total Donations" value={String(totalDonationsCount)} icon="funds-raised" />
            </GradientContainer>
            <GradientContainer>
              <StatCard title="Total Amount" value={`₹ ${Number(totalDonationsAmount).toLocaleString("en-IN")}`} icon="funds-donated" />
            </GradientContainer>
          </div>

          {donationsLoading && <div className="p-8 text-center text-gray-400">Loading donations...</div>}
          {donationsError && <div className="p-4 text-center text-red-400">Error loading donations.</div>}
          {!donationsLoading && !donationsError && (
            <DataTable
              noMinWidth
              onRowClick={(row) => {
                const raw = (row as Record<string, unknown>).__raw as (typeof donationsRows)[0]["__raw"] | undefined;
                if (!raw) return;
                setViewingDonation({
                  id: raw.id,
                  donorName: raw.donorName,
                  donorEmail: raw.donorEmail,
                  donorPhone: raw.donorPhone,
                  amount: raw.amount,
                  currency: raw.currency,
                  note: raw.note,
                  createdAt: raw.createdAt,
                });
              }}
              columns={[
                { key: "name", label: "Donor", searchable: true },
                { key: "email", label: "Email" },
                { key: "phone", label: "Phone" },
                { key: "amount", label: "Amount" },
                { key: "note", label: "Note" },
                { key: "createdAt", label: "Recorded" },
                { key: "actions", label: "Actions" },
              ]}
              data={donationsRows}
              searchValues={{ name: donationsSearch }}
              onSearchChange={handleDonationsSearch}
              total={donationsResp?.data?.total || donationsRows.length}
              page={donationsPage}
              pageSize={tableLimit}
              onPageChange={setDonationsPage}
              renderCell={(col, row) => {
                if (col.key !== "actions") return null;
                const raw = (row as Record<string, unknown>).__raw as (typeof donationsRows)[0]["__raw"] | undefined;
                if (!raw) return null;
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    {isEventOwner && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDonation({
                              id: raw.id,
                              donorName: raw.donorName,
                              donorEmail: raw.donorEmail,
                              donorPhone: raw.donorPhone,
                              amount: Number(raw.amount || 0),
                              currency: raw.currency || "INR",
                              note: raw.note,
                            });
                          }}
                          className="rounded-full border border-[#D85D27] px-3 py-1 text-xs font-medium text-[#D85D27] hover:bg-[#D85D27] hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeletingDonationId(raw.id); }}
                          className="rounded-full border border-red-500 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                );
              }}
            />
          )}
        </>
      )}

      {/* ══ MODALS & DIALOGS ══ */}

      {/* Add Volunteer */}
      <AddVolunteerModal
        isOpen={isVoluntaryOpen}
        onClose={() => setIsVoluntaryOpen(false)}
        onSuccess={async () => {
          await refetchVolunteers();
        }}
        eventId={eventDetails.id}
        eventName={eventDetails.title}
        eventType={eventDetails.eventType}
        eventDate={eventDetails.startsAt}
        socialChapterId={eventDetails.socialChapterId ?? undefined}
        countryId={eventDetails.countryId ?? undefined}
        regionId={eventDetails.regionId ?? undefined}
      />

      {/* Edit Volunteer — reuses AddVolunteerModal with editingVolunteer prop */}
      {editingVolunteer && (
        <AddVolunteerModal
          key={`volunteer-edit-${editingVolunteer.id}`}
          isOpen={!!editingVolunteer}
          onClose={() => setEditingVolunteer(null)}
          onSuccess={async () => {
            await refetchVolunteers();
          }}
          eventId={eventDetails.id}
          eventName={eventDetails.title}
          eventType={eventDetails.eventType}
          eventDate={eventDetails.startsAt}
          socialChapterId={eventDetails.socialChapterId ?? undefined}
          countryId={eventDetails.countryId ?? undefined}
          regionId={eventDetails.regionId ?? undefined}
          editingVolunteer={editingVolunteer}
          onEditSubmit={handleVolunteerEditSubmit}
          isUpdating={isUpdatingVolunteer}
        />
      )}

      {/* Record / Edit Donation */}
      <RecordDonationModal
        key={`donation-${editingDonation?.id || donationTarget?.donorUserId || "new"}`}
        isOpen={isDonationModalOpen}
        onClose={() => { setDonationTarget(null); setEditingDonation(null); }}
        onSuccess={async () => {
          await refetchDonations();
        }}
        eventId={eventDetails.id}
        editingDonation={editingDonation}
        donationTarget={donationTarget}
      />

      {/* View Donation detail */}
      {viewingDonation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setViewingDonation(null)}
        >
          <div
            className="w-full max-w-lg rounded-[24px] border border-white/10 bg-[#131B27] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/10 bg-gradient-to-r from-[#1B2635] to-[#141C28] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D85D27]/90">
                    Donation Record
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-white">
                    {viewingDonation.donorName || "Donation Details"}
                  </h3>
                </div>
                <div className="rounded-full border border-[#D85D27]/30 bg-[#D85D27]/10 px-4 py-2 text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFB38E]">Amount</p>
                  <p className="mt-1 text-xl font-extrabold text-[#FF8A4C]">
                    {`${viewingDonation.currency || "INR"} ${Number(viewingDonation.amount || 0).toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Recorded on{" "}
                  <span className="font-medium text-white">
                    {new Date(viewingDonation.createdAt).toLocaleString("en-GB")}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setViewingDonation(null)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  Close
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Donor</p>
                  <p className="mt-2 text-base font-semibold text-white break-words">
                    {viewingDonation.donorName || "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Phone</p>
                  <p className="mt-2 text-base font-semibold text-white break-words">
                    {viewingDonation.donorPhone || "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Email</p>
                  <p className="mt-2 text-base font-semibold text-white break-all">
                    {viewingDonation.donorEmail || "—"}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Note</p>
                <p className="mt-2 text-sm leading-7 text-white/90">
                  {viewingDonation.note || "No note added for this donation."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!deletingDonationId}
        onClose={() => setDeletingDonationId(null)}
        onConfirm={handleConfirmDeleteDonation}
        actionType="delete"
        isSubmitting={isRemovingDonation}
      />

      {/* View Volunteer detail */}
      {viewingVolunteer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setViewingVolunteer(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1A2230] p-6 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Volunteer Details</h3>
              <button type="button" onClick={() => setViewingVolunteer(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            {isEventOwner && (
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => { setEditingVolunteer(viewingVolunteer); setViewingVolunteer(null); }}
                  className="px-3 py-1.5 text-sm bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => { setDeletingVolunteerId(viewingVolunteer.id); setViewingVolunteer(null); }}
                  className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
            <dl className="space-y-2 text-sm">
              <ViewRow label="Name" value={viewingVolunteer.name || "—"} />
              <ViewRow label="Email" value={viewingVolunteer.email || "—"} />
              <ViewRow label="Phone" value={viewingVolunteer.phone || "—"} />
              <ViewRow label="Category" value={viewingVolunteer.category || "—"} />
              <ViewRow label="Chapter" value={viewingVolunteer.chapterName || "—"} />
              <ViewRow label="Area" value={viewingVolunteer.area || "—"} />
              <ViewRow label="Event" value={viewingVolunteer.eventName || "—"} />
              <ViewRow
                label="Added"
                value={
                  viewingVolunteer.createdAt
                    ? new Date(viewingVolunteer.createdAt).toLocaleString("en-GB")
                    : "—"
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
        isSubmitting={isRemovingVolunteer}
      />
    </SocialLayout>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[14px] md:text-[15px]">
      <span className="text-white min-w-[180px]">{label}</span>
      <span className="text-white font-medium">: {value}</span>
    </div>
  );
}

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-2">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-right text-white font-medium break-all">{value}</dd>
    </div>
  );
}
