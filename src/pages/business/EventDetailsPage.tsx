import React, { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { useEventByIdOrSlugQuery } from "../../services/eventsApi";
import { skipToken } from "@reduxjs/toolkit/query";

interface EventDetails {
  id: number;
  eventName: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  description: string;
  contactPerson: string;
  contactPhone: string;
  costForMembers: string;
  costForNonMembers: string;
  numberOfRegistrations: number;
  maxAttendees: number;
  type: string;
  imageUrl?: string;
  link?: string;
}

export default function EventDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [userName] = useState("Mike");

  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) navigate("/login");
  }, [navigate]);

  const eventFromState = (location.state as { event?: any } | undefined)?.event;
  const queryArg = id ? { idOrSlug: id } : (skipToken as any);
  const { data, isLoading, isError } = useEventByIdOrSlugQuery(queryArg as any);
  // A refusal must not fall back to the event passed in navigation state: the server
  // hides drafts, cancelled events and other chapters' events, and rendering the
  // handed-over copy would put back exactly what it withheld.
  const raw = isError ? {} : ((data?.data as any) || eventFromState || {});

  
  const toDateTime = (iso?: string): string => {
    if (!iso) return "";
  
    const date = new Date(iso);
  
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
  
    let hours = date.getUTCHours();
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // convert 0 → 12
  
    return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
  };
  

  const currency = raw?.pricing?.currency ?? "INR";
  const fmtMoney = (n?: number) => `${currency} ${Number(n ?? 0).toFixed(2)}`;

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

  // Prefer explicit imageUrl from business events API; fall back to a few common fields
  const pickImage = () =>
    toAbsolute(
      (raw as any)?.imageUrl ||
      (raw as any)?.coverUrl ||
      (raw as any)?.image?.url ||
      ((raw as any)?.images && (Array.isArray((raw as any)?.images) ? (raw as any)?.images[0]?.url : undefined)) ||
      ""
    );

  const eventDetails: EventDetails = {
    id: Number(raw?.id ?? 0),
    eventName: raw?.title ?? "",
    startDateTime: toDateTime(raw?.startsAt || raw?.startDate),
    endDateTime: toDateTime(raw?.endsAt || raw?.endDate),
    location: raw?.locationLabel || raw?.location || "",
    description: raw?.description ?? "",
    contactPerson: (raw?.contactPerson && typeof raw.contactPerson === 'object'
      ? raw.contactPerson.name
      : raw?.contactPerson) || "",
    contactPhone: raw?.contactPhone || "",
    costForMembers: fmtMoney(raw?.pricing?.member),
    costForNonMembers: fmtMoney(raw?.pricing?.nonMember),
    numberOfRegistrations: Number(raw?.counters?.registrationsTotal ?? 0),
    maxAttendees: Number(raw?.maxAttendees ?? 0),
    type: (raw?.mode ?? raw?.category ?? raw?.eventType ?? "").replace(/_/g, ' '),
    imageUrl: pickImage(),
    link: raw?.link || "",
  };

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Events", onClick: () => navigate("/business/upcoming-events") },
    { label: "Event Details" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="mx-auto max-w-[1600px] px-4 lg:px-6 py-8">
        <PageHeader breadcrumbs={breadcrumbs} />

        {isLoading && (
          <div className="py-16 text-center text-blue-300">Loading the event...</div>
        )}
        {isError && (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/10 bg-[#141a22] p-8 text-center">
            <h2 className="text-xl font-semibold text-white">This event isn't available</h2>
            <p className="mt-2 text-sm text-gray-400">
              It may have been withdrawn, or it isn't open to your chapter.
            </p>
            <button
              onClick={() => navigate("/business/upcoming-events")}
              className="mt-6 rounded-lg bg-[#D85D27] px-4 py-2 text-sm font-medium text-white hover:bg-[#C24F20]"
            >
              Back to events
            </button>
          </div>
        )}
        {!isLoading && !isError && (
          <>

        {/* --- HERO SECTION --- */}
        <section className="mb-8">
          <div className="flex flex-col md:flex-row items-stretch gap-6 md:gap-10">
            {/* Wider Image */}
            <div className="w-full md:w-[400px] lg:w-[460px] h-[260px] md:h-[320px] rounded-[18px] overflow-hidden flex-shrink-0 bg-black/20">
              {eventDetails.imageUrl ? (
                <img
                  src={eventDetails.imageUrl}
                  alt={eventDetails.eventName}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#2B2B2B] to-[#111722] flex items-center justify-center">
                  <span className="text-white/70 text-sm font-medium uppercase tracking-wider">
                    {eventDetails.eventName || "Event"}
                  </span>
                </div>
              )}
            </div>

            {/* Text column */}
            <div className="flex-1">
              <h1 className="text-[28px] md:text-[40px] leading-[1.1] font-extrabold text-white mb-3">
                {eventDetails.eventName}
              </h1>
              <div className="space-y-2 text-gray-300">
                <p className="text-sm md:text-base font-medium">
                  {eventDetails.startDateTime} to {eventDetails.endDateTime}
                </p>
                {eventDetails.location && (
                  <p className="text-sm md:text-base font-semibold">{eventDetails.location}</p>
                )}
                <p className="text-sm md:text-base leading-7 text-gray-300/90">
                  {eventDetails.description}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- EVENT DETAILS SECTION --- */}
        <section className="rounded-[22px] border-2 border-[#D85D27] bg-[#111722]/80 overflow-hidden">
          <div className="bg-[#D85D27] px-6 md:px-8 py-4 md:py-5">
            <h2 className="text-xl md:text-2xl font-extrabold text-white">Event Details</h2>
          </div>

          <div className="px-6 md:px-8 py-6 md:py-8">
            <div className="flex flex-col space-y-3">
              <DetailRow label="Contact Person" value={eventDetails.contactPerson} />
              {eventDetails.contactPhone && (
                <DetailRow label="Contact Number" value={eventDetails.contactPhone} />
              )}
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
              {eventDetails.link && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[14px] md:text-[15px]">
                  <span className="text-gray-400 min-w-[180px]">Event Link:</span>
                  <a 
                    href={eventDetails.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF6A21] hover:text-[#FF8C42] underline transition-colors duration-200"
                  >
                    {eventDetails.link}
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
          </>
        )}
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
      <span className="text-gray-400 min-w-[180px]">{label}:</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}