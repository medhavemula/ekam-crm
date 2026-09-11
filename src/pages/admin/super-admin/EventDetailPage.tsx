import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import { useGetEdEventQuery } from "../../../services/ed/edEventsApi";
import { useGetSaEventQuery } from "../../../services/admin/saEventsApi";
import { useRole } from "../../../hooks/useRole";
import { skipToken } from "@reduxjs/toolkit/query";

interface EventDetails {
  id: number;
  title: string;
  startDateTime: string;
  endDateTime: string;
  description: string;
  contactPerson: string;
  costForMembers: string;
  costForNonMembers: string;
  numberOfRegistrations: number;
  maxAttendees: number;
  type: string;
  link: string;
  imageUrl?: string;
}

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { role } = useRole();
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'SUPER_ADMIN_TEAM';
  const queryArg = id ?? skipToken;
  const edQ = useGetEdEventQuery(queryArg as any, { skip: isSuperAdmin });
  const saQ = useGetSaEventQuery(queryArg as any, { skip: !isSuperAdmin });
  const data = isSuperAdmin ? saQ.data : edQ.data;
  const isLoading = isSuperAdmin ? saQ.isLoading : edQ.isLoading;
  const isError = isSuperAdmin ? Boolean(saQ.error) : Boolean(edQ.error);

  const raw = data?.data as any;
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

  // Build venue display text
  const venueObj = (raw?.venue && typeof raw.venue === "object") ? raw.venue : undefined;
  const venueParts: string[] = [];
  if (venueObj?.address1) venueParts.push(String(venueObj.address1));
  if (venueObj?.city) venueParts.push(String(venueObj.city));
  if (venueObj?.state) venueParts.push(String(venueObj.state));
  if (venueObj?.country) venueParts.push(String(venueObj.country));
  if (venueObj?.postcode) venueParts.push(String(venueObj.postcode));
  const venueText = venueParts.join(", ") || (typeof raw?.venue === "string" ? raw.venue : (raw?.location || ""));

  const currency = raw?.pricing?.currency ?? "INR";
  const fmtMoney = (n?: number) =>
    `${currency} ${Number(n ?? 0).toFixed(2)}`;

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

  const pickImage = () =>
    toAbsolute(
      // common banner/cover fields
      (raw as any)?.bannerUrl ||
      (raw as any)?.bannerURL ||
      (raw as any)?.banner_url ||
      (raw as any)?.coverUrl ||
      (raw as any)?.coverURL ||
      (raw as any)?.cover_url ||
      (raw as any)?.banner?.url ||
      (raw as any)?.banner?.imageUrl ||
      (raw as any)?.banner?.image ||
      (raw as any)?.cover?.url ||
      (raw as any)?.cover?.image ||
      (raw as any)?.media?.banner?.url ||
      (raw as any)?.media?.cover?.url ||
      (raw as any)?.media?.banner?.image ||
      (raw as any)?.image?.url ||
      (raw as any)?.image?.imageUrl ||
      // flat image fields
      (raw as any)?.imageUrl ||
      (raw as any)?.imageURL ||
      (raw as any)?.thumbnailUrl ||
      (raw as any)?.thumbnailURL ||
      // arrays
      ((raw as any)?.images && (Array.isArray((raw as any)?.images) ? (raw as any)?.images[0]?.url : undefined)) ||
      ""
    );

  const eventDetails: EventDetails = {
    id: Number(id) || 1,
    title: raw?.title ?? "",
    startDateTime: toDateTime(raw?.startsAt || raw?.startDate),
    endDateTime: toDateTime(raw?.endsAt || raw?.endDate),
    description: raw?.description ?? "",
    contactPerson: raw?.contactPerson ?? "",
    costForMembers: fmtMoney(raw?.pricing?.member),
    costForNonMembers: fmtMoney(raw?.pricing?.nonMember),
    numberOfRegistrations: Number(raw?.counters?.registrationsTotal ?? 0),
    maxAttendees: Number(raw?.maxAttendees ?? 0),
    type: (raw?.mode ?? raw?.category ?? raw?.eventType ?? "").replace(/_/g, ' '),
    link: raw?.link ?? "",
    imageUrl: pickImage(),
  };

  const breadcrumbs = [
    { label: "Events", onClick: () => navigate("/admin/events") },
    { label: "View Events" },
  ];

  const handleEditEvent = () => {
    navigate(`/admin/events/edit/${id}`);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader breadcrumbs={breadcrumbs} />

        {isLoading && (
          <div className="text-center py-8 text-white">Loading...</div>
        )}
        {isError && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
            Failed to load event.
          </div>
        )}

        {/* Hero Section */}
        <section className="mb-8">
          <div className="flex flex-col md:flex-row items-stretch gap-6 md:gap-10">
            {/* Event Image */}
            <div className="w-full md:w-[400px] lg:w-[460px] h-[260px] md:h-[320px] rounded-[18px] overflow-hidden flex-shrink-0 bg-black/20">
              {eventDetails.imageUrl ? (
                <img
                  src={eventDetails.imageUrl}
                  alt={eventDetails.title}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#2B2B2B] to-[#111722] flex items-center justify-center">
                  <span className="text-white/70 text-sm font-medium uppercase tracking-wider">
                    {eventDetails.title || "Event"}
                  </span>
                </div>
              )}
            </div>

            {/* Event Info */}
            <div className="flex-1">
              <h1 className="text-[28px] md:text-[40px] leading-[1.1] font-extrabold text-white mb-3">
                {eventDetails.title}
              </h1>
              <div className="space-y-2 text-gray-300">
                <p className="text-sm md:text-base font-medium">
                  {eventDetails.startDateTime} to {eventDetails.endDateTime}
                </p>
                <p className="text-sm md:text-base leading-7 text-gray-300/90">
                  {eventDetails.description}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="mb-8">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleEditEvent}
              className="px-6 py-3 bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Event
            </button>
          </div>
        </section>

        {/* Event Details Section */}
        <section className="rounded-[22px] border-2 border-[#D85D27] bg-[#111722]/80 overflow-hidden">
          <div className="bg-[#D85D27] px-6 md:px-8 py-4 md:py-5">
            <h2 className="text-xl md:text-2xl font-extrabold text-white">Event Details</h2>
          </div>

          <div className="px-6 md:px-8 py-6 md:py-8">
            <div className="flex flex-col space-y-3">
              <DetailRow label="Contact Person" value={eventDetails.contactPerson} />
              <DetailRow label="Cost for Members" value={eventDetails.costForMembers} />
              <DetailRow label="Cost for Non-Members" value={eventDetails.costForNonMembers} />
              <DetailRow
                label="Number of Registrations"
                value={String(eventDetails.numberOfRegistrations)}
              />
              <DetailRow
                label="Max. no. of Attendees"
                value={String(eventDetails.maxAttendees)}
              />
              <DetailRow label="Type" value={eventDetails.type} />
              <DetailRow label="Link" value={eventDetails.link} />
              <DetailRow label="Venue" value={venueText} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[14px] md:text-[15px]">
      <span className="text-gray-400 min-w-[180px]">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
