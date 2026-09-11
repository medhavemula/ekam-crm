import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { SocialLayout } from "../../../components/social";
import { PageHeader } from "../../../components/common";
import GradientContainer from "../../../components/common/GradientContainer";
import DataTable from "../../../components/common/DataTable";
import { StatCard } from "../../../components/dashboard";
import AddVolunteerModal from "../../../components/modals/AddVolunteerModal";
import RecordDonationModal from "../../../components/modals/RecordDonationModal";
import { useToast } from "../../../components/toast/ToastProvider";
import {
  useGetSocialEventQuery,
  useGetSocialEventMembersQuery,
  useAddSocialEventMemberMutation,
  useGetSocialEventVolunteersQuery,
  useListEventDonationsQuery,
} from "../../../services/social";
import { useGetSocialApprovedMembersQuery } from "../../../services/social/socialAdminDashboardApi";
import { useJoinUserEventMutation } from "../../../services/social";

interface SocialEventDetails {
  id: string;
  title: string;
  startDateTime: string;
  endDateTime: string;
  description: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  costForMembers: number;
  costForNonMembers: number;
  currency: string;
  numberOfRegistrations: number;
  maxAttendees: number;
  eventType: string;
  category: string;
  mode: string;
  venue: string;
  link: string;
  imageUrl?: string;
  socialChapter: {
    id?: string;
    name: string;
    area: string;
    city: string;
  };
  region: {
    id?: string;
    name: string;
  };
  country?: {
    id?: string;
    name: string;
  };
  status: string;
  approvalStatus: string;
}

type PageTab = "event-details" | "members" | "volunteers" | "donations";

export default function SocialAdminEventDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { showToast } = useToast();

  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PageTab>("event-details");
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});
  const [memberPage, setMemberPage] = useState(1);
  const [volunteerPage, setVolunteerPage] = useState(1);
  const [donationPage, setDonationPage] = useState(1);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberPickerSearch, setMemberPickerSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [isVoluntaryOpen, setIsVoluntaryOpen] = useState(false);
  const [donationTarget, setDonationTarget] = useState<{
    donorUserId?: string;
    donorName: string;
    donorEmail?: string;
    donorPhone?: string;
  } | null>(null);
  const [joinUserEvent, { isLoading: isJoining }] = useJoinUserEventMutation();
  const [addEventMember, { isLoading: isAddingMember }] = useAddSocialEventMemberMutation();
  const memberLimit = 10;
  const volunteerLimit = 10;
  const donationLimit = 10;

  // Get page type from navigation state
  const pageType = location.state?.pageType || "my-events";

  // API call to get event data
  const { data: eventApiResponse, isLoading, isError } = useGetSocialEventQuery(id || "");
  const currentSocialChapterId =
    eventApiResponse?.data?.socialChapter?.id || eventApiResponse?.data?.socialChapterId || "";
  const {
    data: membersResponse,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers,
  } =
    useGetSocialEventMembersQuery(
      {
        eventId: id || "",
        name: searchValues.name || undefined,
        area: searchValues.area || undefined,
        chapter: searchValues.chapter || undefined,
        page: memberPage,
        limit: memberLimit,
      },
      { skip: !id || activeTab !== "members" },
    );
  const {
    data: volunteersResponse,
    isLoading: volunteersLoading,
    isError: volunteersError,
    refetch: refetchVolunteers,
  } =
    useGetSocialEventVolunteersQuery(
      {
        eventId: id || "",
        search: searchValues.name || undefined,
        page: volunteerPage,
        limit: volunteerLimit,
      },
      { skip: !id || activeTab !== "volunteers" },
    );
  const {
    data: donationsResponse,
    isLoading: donationsLoading,
    isError: donationsError,
    refetch: refetchDonations,
  } =
    useListEventDonationsQuery(
      {
        eventId: id || "",
        search: searchValues.name || undefined,
        page: donationPage,
        limit: donationLimit,
      },
      { skip: !id || activeTab !== "donations" },
    );
  const { data: approvedMembersResponse, isLoading: approvedMembersLoading } =
    useGetSocialApprovedMembersQuery(
      {
        socialChapterId: currentSocialChapterId,
        search: memberPickerSearch || undefined,
        page: 1,
        limit: 20,
      },
      { skip: !memberPickerOpen || !currentSocialChapterId },
    );

  const toDateTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    // Use UTC methods to show the original UTC time
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    let hours = d.getUTCHours();
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hh = String(hours).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${minutes}${ampm}`;
  };

  const toAbsolute = (u?: string) => {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    const apiBase = (import.meta as any)?.env?.VITE_API_BASE_URL || "";
    try {
      const apiOrigin = apiBase ? new URL(apiBase).origin : window.location.origin;
      return `${apiOrigin}${u.startsWith('/') ? '' : '/'}${u}`;
    } catch {
      return u;
    }
  };

  const eventDetails: SocialEventDetails = {
    id: eventApiResponse?.data?.id || "",
    title: eventApiResponse?.data?.title || "",
    startDateTime: toDateTime(eventApiResponse?.data?.startsAt),
    endDateTime: toDateTime(eventApiResponse?.data?.endsAt),
    description: eventApiResponse?.data?.description || "",
    contactPerson: eventApiResponse?.data?.contactPerson || "",
    contactEmail: eventApiResponse?.data?.contactEmail || "",
    contactPhone: eventApiResponse?.data?.contactPhone || "",
    costForMembers: eventApiResponse?.data?.costForMembers || 0,
    costForNonMembers: eventApiResponse?.data?.costForNonMembers || 0,
    currency: eventApiResponse?.data?.currency || "INR",
    numberOfRegistrations: eventApiResponse?.data?.numberOfRegistrations || 0,
    maxAttendees: eventApiResponse?.data?.maxAttendees || 0,
    eventType: eventApiResponse?.data?.eventType || "",
    category: eventApiResponse?.data?.category || "",
    mode: eventApiResponse?.data?.mode || "",
    venue: eventApiResponse?.data?.venue || "",
    link: eventApiResponse?.data?.link || "",
    imageUrl: toAbsolute(eventApiResponse?.data?.imageUrl),
    socialChapter: {
      id: eventApiResponse?.data?.socialChapter?.id || eventApiResponse?.data?.socialChapterId,
      name: eventApiResponse?.data?.socialChapter?.name || "",
      area: eventApiResponse?.data?.socialChapter?.area || "",
      city: eventApiResponse?.data?.socialChapter?.city || "",
    },
    country: eventApiResponse?.data?.country ? {
      id: eventApiResponse.data.country.id || eventApiResponse.data.countryId,
      name: eventApiResponse.data.country.name,
    } : undefined,
    region: {
      id: eventApiResponse?.data?.region?.id || eventApiResponse?.data?.regionId,
      name: eventApiResponse?.data?.region?.name || "",
    },
    status: eventApiResponse?.data?.status || "",
    approvalStatus: eventApiResponse?.data?.approvalStatus || "",
  };

  const fmtMoney = (n?: number, currency?: string) =>
    `${currency || "INR"} ${Number(n ?? 0).toFixed(2)}`;

  const prettifyEnum = (value?: string) => {
    const v = (value || "").trim();
    if (!v) return "";
    return v
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  // Format location based on what's available from the API
  // Show: Country | Region (e.g., "INDIA | HYDERABAD")
  const formatLocation = () => {
    const parts = [];
    
    // Add country name if available
    if (eventDetails.country?.name) {
      parts.push(eventDetails.country.name);
    }
    
    // Add region name if available
    if (eventDetails.region.name && eventDetails.region.name.trim()) {
      parts.push(eventDetails.region.name);
    }
    
    // Return formatted string or N/A
    return parts.length > 0 ? parts.join(" | ") : "N/A";
  };

  const breadcrumbs = [
    {
      label: pageType === "all-events" ? "All Events" : pageType === "upcoming-events" ? "Upcoming Events" : "My Events",
      onClick: () =>
        navigate(
          pageType === "all-events"
            ? "/social/admin/all-events"
            : pageType === "upcoming-events"
              ? "/social/admin/upcoming-events"
              : "/social/admin/my-events",
        ),
    },
    { label: "Event Details" },
  ];

  const pageTabs: { key: PageTab; label: string }[] = [
    { key: "event-details", label: "Event Details" },
    { key: "members", label: "Members" },
    { key: "volunteers", label: "Volunteers" },
    { key: "donations", label: "Donations" },
  ];

  const renderActionButtons = () => {
    if (activeTab === "members") {
      return (
        <button
          type="button"
          onClick={() => setMemberPickerOpen(true)}
          className="px-6 py-2.5 border border-[#D85D27] text-[#D85D27] hover:bg-[#D85D27] hover:text-white font-medium rounded-lg transition-colors"
        >
          Add Member
        </button>
      );
    }

    if (activeTab === "volunteers") {
      return (
        <button
          type="button"
          onClick={() => setIsVoluntaryOpen(true)}
          className="px-6 py-2.5 border border-[#D85D27] text-[#D85D27] hover:bg-[#D85D27] hover:text-white font-medium rounded-lg transition-colors"
        >
          Add Volunteer
        </button>
      );
    }

    if (activeTab === "donations") {
      return (
        <button
          type="button"
          onClick={() => setDonationTarget({ donorName: "" })}
          className="px-6 py-2.5 border border-[#D85D27] text-[#D85D27] hover:bg-[#D85D27] hover:text-white font-medium rounded-lg transition-colors"
        >
          Record Donation
        </button>
      );
    }

    if (pageType === "upcoming-events" && activeTab === "event-details") {
      return (
        <button
          className="px-6 py-2.5 bg-[#D85D27] hover:bg-[#B8491F] text-white font-medium rounded-lg transition-colors"
          onClick={async () => {
            if (!id) return;
            try {
              await joinUserEvent(id).unwrap();
              setActionMessage("Joined event successfully.");
            } catch (error: any) {
              const message =
                (error && (error.data?.message || error.error || String(error))) ||
                "Failed to join event. Please try again.";
              setActionMessage(message);
              console.error("Join event failed:", error);
            }
          }}
          disabled={isJoining}
        >
          Join Now
        </button>
      );
    }

    return null;
  };

  const handleSearchChange = (key: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [key]: value }));
    if (activeTab === "members") {
      setMemberPage(1);
    } else if (activeTab === "volunteers") {
      setVolunteerPage(1);
    } else {
      setDonationPage(1);
    }
  };

  const membersTableData = useMemo(
    () =>
      (membersResponse?.data?.items || []).map((member: any) => ({
        name: member.name || "N/A",
        attendance: member.attendance || "N/A",
        phone: member.phone || "N/A",
        chapter: member.chapter || member.chapterName || "N/A",
        voluntaryCount: member.noOfVoluntary ?? 0,
        fundsDonated: member.fundsDonated ?? 0,
        area: member.area || "N/A",
      })),
    [membersResponse],
  );

  const volunteersTableData = useMemo(
    () =>
      (volunteersResponse?.data?.items || []).map((volunteer: any) => ({
        name: volunteer.name || "N/A",
        attendance: volunteer.attendance || "N/A",
        phone: volunteer.phone || "N/A",
        chapter: volunteer.chapterName || "N/A",
        voluntaryCount: volunteer.noOfVoluntary ?? 0,
        fundsDonated: volunteer.fundsDonated ?? 0,
        area: volunteer.area || "N/A",
      })),
    [volunteersResponse],
  );

  const donationsTableData = useMemo(
    () =>
      (donationsResponse?.data?.items || []).map((donation: any) => ({
        name: donation.donorName || "Donor",
        email: donation.donorEmail || "N/A",
        phone: donation.donorPhone || "N/A",
        amount: `${donation.currency || "INR"} ${Number(donation.amount || 0).toFixed(2)}`,
        note: donation.note || "—",
        recordedAt: donation.createdAt
          ? new Date(donation.createdAt).toLocaleString("en-GB")
          : "N/A",
      })),
    [donationsResponse],
  );

  const totalMembers = membersResponse?.data?.total ?? 0;
  const totalAttendees = useMemo(
    () =>
      (membersResponse?.data?.items || []).filter(
        (member: any) => (member.attendance || "").toUpperCase() === "P",
      ).length,
    [membersResponse],
  );
  const totalFundsDonated = useMemo(
    () =>
      (membersResponse?.data?.items || []).reduce(
        (sum: number, member: any) => sum + Number(member.fundsDonated ?? 0),
        0,
      ),
    [membersResponse],
  );
  const totalVolunteers = volunteersResponse?.data?.total ?? 0;
  const totalDonationsCount = donationsResponse?.data?.total ?? 0;
  const totalDonationsAmount = donationsResponse?.data?.totalAmount ?? 0;
  const approvedMembers = Array.isArray(approvedMembersResponse?.data)
    ? approvedMembersResponse.data
    : [];

  const handleAddMember = async () => {
    if (!id || !selectedMemberId) return;
    try {
      const result = await addEventMember({ eventId: id, memberId: selectedMemberId }).unwrap();
      await refetchMembers();
      setMemberPickerOpen(false);
      setSelectedMemberId("");
      setMemberPickerSearch("");
      showToast({
        title: "Member added",
        description:
          result?.data?.status === "WAITLISTED"
            ? "Member was added to the waitlist."
            : "Member has been added to the event.",
        kind: "success",
      });
    } catch (error: any) {
      showToast({
        title: "Failed to add member",
        description: error?.data?.message || "Please try again.",
        kind: "error",
      });
    }
  };

  return (
    <SocialLayout>
      <main className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader breadcrumbs={breadcrumbs} />

        {actionMessage && (
          <div className="mb-4 rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-xs text-gray-200 flex items-start justify-between gap-2">
            <span>{actionMessage}</span>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8 text-white">Loading...</div>
        )}
        {isError && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
            Failed to load event.
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 border-b border-white/10 sm:flex-row sm:items-end sm:justify-between">
          <nav className="flex overflow-x-auto gap-2 sm:gap-6">
            {pageTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearchValues({});
                  if (tab.key === "members") {
                    setMemberPage(1);
                  } else if (tab.key === "volunteers") {
                    setVolunteerPage(1);
                  } else if (tab.key === "donations") {
                    setDonationPage(1);
                  }
                }}
                className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-[#D85D27] text-white"
                    : "border-transparent text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 pb-2 sm:justify-end">
            {renderActionButtons()}
          </div>
        </div>

        {activeTab === "event-details" && (
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
                      {eventDetails.startDateTime} to {eventDetails.endDateTime}
                    </p>
                    {eventDetails.socialChapter.name && (
                      <div className="space-y-0.5">
                        <p className="text-sm md:text-base font-medium text-white">
                          {eventDetails.socialChapter.name}
                        </p>
                        <p className="text-xs md:text-sm text-gray-400">
                          {formatLocation()}
                        </p>
                      </div>
                    )}
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
                <DetailRow label="Category" value={prettifyEnum(eventDetails.category)} />
                <DetailRow label="Mode" value={prettifyEnum(eventDetails.mode)} />
                <DetailRow label="Country" value={eventDetails.country?.name || "N/A"} />
                <DetailRow label="Region" value={eventDetails.region.name || "N/A"} />
                <DetailRow label="Chapter" value={eventDetails.socialChapter.name || "N/A"} />
                <DetailRow label="Contact Person" value={eventDetails.contactPerson || "N/A"} />
                <DetailRow label="Contact Email" value={eventDetails.contactEmail || "N/A"} />
                <DetailRow label="Contact Phone" value={eventDetails.contactPhone || "N/A"} />
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

        {activeTab !== "event-details" && (
          <div>
            {activeTab === "members" && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
                  <GradientContainer>
                    <StatCard title="Total Members" value={String(totalMembers)} icon="social-users" />
                  </GradientContainer>
                  <GradientContainer>
                    <StatCard title="No of Attendees" value={String(totalAttendees)} icon="tick-calender" />
                  </GradientContainer>
                  <GradientContainer>
                    <StatCard
                      title="Funds Donated"
                      value={`₹ ${Number(totalFundsDonated).toLocaleString("en-IN")}`}
                      icon="funds-donated"
                    />
                  </GradientContainer>
                </div>
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
                      { key: "fundsDonated", label: "Funds Donated" },
                      { key: "area", label: "Area" },
                    ]}
                    data={membersTableData}
                    searchValues={searchValues}
                    onSearchChange={handleSearchChange}
                    total={membersResponse?.data?.total || membersTableData.length}
                    page={memberPage}
                    pageSize={memberLimit}
                    onPageChange={setMemberPage}
                    renderCell={(col, row) => {
                      if (col.key === "fundsDonated") {
                        const value = Number((row as Record<string, unknown>).fundsDonated || 0);
                        return value > 0 ? `INR ${value.toFixed(2)}` : "—";
                      }
                      return null;
                    }}
                  />
                )}
              </>
            )}

            {activeTab === "volunteers" && (
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
                      { key: "area", label: "Area" },
                    ]}
                    data={volunteersTableData}
                    searchValues={searchValues}
                    onSearchChange={handleSearchChange}
                    total={volunteersResponse?.data?.total || volunteersTableData.length}
                    page={volunteerPage}
                    pageSize={volunteerLimit}
                    onPageChange={setVolunteerPage}
                  />
                )}
              </>
            )}

            {activeTab === "donations" && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
                  <GradientContainer>
                    <StatCard title="Total Donations" value={String(totalDonationsCount)} icon="funds-raised" />
                  </GradientContainer>
                  <GradientContainer>
                    <StatCard
                      title="Total Amount"
                      value={`₹ ${Number(totalDonationsAmount).toLocaleString("en-IN")}`}
                      icon="funds-donated"
                    />
                  </GradientContainer>
                </div>
                {donationsLoading && <div className="p-8 text-center text-gray-400">Loading donations...</div>}
                {donationsError && <div className="p-4 text-center text-red-400">Error loading donations.</div>}
                {!donationsLoading && !donationsError && (
                  <DataTable
                    noMinWidth
                    columns={[
                      { key: "name", label: "Donor", searchable: true },
                      { key: "email", label: "Email" },
                      { key: "phone", label: "Phone" },
                      { key: "amount", label: "Amount" },
                      { key: "note", label: "Note" },
                      { key: "recordedAt", label: "Recorded" },
                    ]}
                    data={donationsTableData}
                    searchValues={searchValues}
                    onSearchChange={handleSearchChange}
                    total={donationsResponse?.data?.total || donationsTableData.length}
                    page={donationPage}
                    pageSize={donationLimit}
                    onPageChange={setDonationPage}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {memberPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => {
            setMemberPickerOpen(false);
            setSelectedMemberId("");
            setMemberPickerSearch("");
          }}
        >
          <div
            className="w-full max-w-2xl rounded-[24px] border border-white/10 bg-[#131B27] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">Add Member</h3>
                <p className="mt-1 text-sm text-white/60">Select an approved social member for this event.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMemberPickerOpen(false);
                  setSelectedMemberId("");
                  setMemberPickerSearch("");
                }}
                className="text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">
              <input
                value={memberPickerSearch}
                onChange={(e) => setMemberPickerSearch(e.target.value)}
                placeholder="Search members..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#D85D27]"
              />
            </div>

            <div className="mt-4 max-h-[360px] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03]">
              {approvedMembersLoading ? (
                <div className="p-6 text-center text-white/60">Loading members...</div>
              ) : approvedMembers.length ? (
                approvedMembers.map((member: any) => (
                  <label
                    key={member._id}
                    className="flex cursor-pointer items-start gap-3 border-b border-white/5 px-4 py-4 last:border-b-0 hover:bg-white/[0.04]"
                  >
                    <input
                      type="radio"
                      name="event-member"
                      value={member._id}
                      checked={selectedMemberId === member._id}
                      onChange={() => setSelectedMemberId(member._id)}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-white">{member.name || "Unnamed Member"}</div>
                      <div className="text-sm text-white/60">{member.email || "No email"}</div>
                      <div className="text-sm text-white/45">{member.basicInfo?.phone || "No phone"}</div>
                    </div>
                  </label>
                ))
              ) : (
                <div className="p-6 text-center text-white/60">No eligible members found.</div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setMemberPickerOpen(false);
                  setSelectedMemberId("");
                  setMemberPickerSearch("");
                }}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!selectedMemberId || isAddingMember}
                className="rounded-lg bg-[#D85D27] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#B8491F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAddingMember ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddVolunteerModal
        isOpen={isVoluntaryOpen}
        onClose={() => setIsVoluntaryOpen(false)}
        onSuccess={async () => {
          await refetchVolunteers();
        }}
        eventId={eventDetails.id}
        eventName={eventDetails.title}
        eventType={eventDetails.eventType}
        eventDate={eventApiResponse?.data?.startsAt}
        socialChapterId={eventDetails.socialChapter.id ?? undefined}
        countryId={eventDetails.country?.id ?? undefined}
        regionId={eventDetails.region.id ?? undefined}
      />

      <RecordDonationModal
        key={`admin-donation-${donationTarget?.donorUserId || "new"}`}
        isOpen={!!donationTarget}
        onClose={() => setDonationTarget(null)}
        onSuccess={async () => {
          await refetchDonations();
        }}
        eventId={eventDetails.id}
        donationTarget={donationTarget}
      />
    </SocialLayout>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[14px] md:text-[15px]">
      <span className="text-gray-400 min-w-[180px]">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
