import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit3, Mail, MapPin, Phone } from "lucide-react";
import Navbar from "../../components/navigation/Navbar";
import GradientContainer from "../../components/common/GradientContainer";
import { useMeQuery } from "../../services/authApi";
import {
  useGetMySocialChaptersQuery,
  useGetUserSocialConnectionsProfileSummaryQuery,
  useGetUserSocialEventsQuery,
} from "../../services/social";
import ProfileBG from "../../assets/icons/profilebg.svg";

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
};

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const textFrom = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return /^[a-f0-9]{24}$/i.test(value) ? "" : value;
  if (typeof value === "object") return value.name || value.title || value.label || "";
  return String(value);
};

export default function SocialAccountPage() {
  const navigate = useNavigate();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const { data: meRes, isLoading: meLoading, error: meError } = useMeQuery();
  const { data: summaryRes } = useGetUserSocialConnectionsProfileSummaryQuery();
  const { data: chaptersRes } = useGetMySocialChaptersQuery();
  const { data: eventsRes, isLoading: eventsLoading } = useGetUserSocialEventsQuery({
    tab: "mine",
    limit: 3,
  });

  React.useEffect(() => {
    const err = meError as any;
    if (err && typeof err === "object" && "status" in err && err.status === 401) {
      navigate("/login");
    }
  }, [meError, navigate]);

  const profileData = (meRes?.data as any) || {};
  const profile = profileData.profile || {};
  const personal = profileData.personal || {};
  const business = profileData.business || {};
  const professional = profileData.professional || {};
  const basicInfo = profileData.basicInfo || {};
  const summary = summaryRes?.data;
  const chapters = chaptersRes?.data?.items || [];
  const primaryChapter = chapters[0];
  const events = eventsRes?.data?.items || [];

  const avatarUrl =
    summary?.avatarUrl ||
    basicInfo?.profilePhotoUrlResolved ||
    profile?.avatarUrl ||
    personal?.avatarUrl ||
    undefined;

  const displayName = summary?.name || profile?.name || "User";
  const initial = (displayName.trim()[0] || "?").toUpperCase();
  const company = summary?.company || business?.businessName || "";
  const role = summary?.role || professional?.role || "";

  const address = useMemo(() => {
    const cityState = [textFrom(personal?.city || basicInfo?.city), textFrom(personal?.state || basicInfo?.state)]
      .filter(Boolean)
      .join(", ");
    return basicInfo?.streetAddress || cityState || "";
  }, [basicInfo, personal]);

  const rawExpiry: string | undefined = profileData?.membership?.expiresAt;
  const expiryDate = rawExpiry ? new Date(rawExpiry) : undefined;
  const daysLeft = expiryDate
    ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : undefined;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: "url('/auth-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="min-h-screen bg-[#0B1220]/85">
        <Navbar userName={displayName} userAvatar={avatarUrl} />

        <main className="container mx-auto px-4 py-6">
          {meLoading && <div className="mb-4 text-sm text-gray-300">Loading your profile...</div>}
          {meError && <div className="mb-4 text-sm text-red-400">Failed to load profile.</div>}
          <h1 className="mb-4 text-2xl font-semibold text-white">My Account</h1>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-2">
              <GradientContainer className="h-full min-h-[300px]">
                <div className="flex h-full min-h-[300px] flex-col overflow-hidden rounded-[14px]">
                  <div className="relative h-24 w-full">
                    <img src={ProfileBG} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute left-1/2 -bottom-9 -translate-x-1/2">
                      <div className="grid h-[74px] w-[74px] place-items-center overflow-hidden rounded-full bg-[#2a3445] ring-4 ring-white/90">
                        {avatarUrl && !avatarFailed ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="h-full w-full object-cover"
                            onError={() => setAvatarFailed(true)}
                          />
                        ) : (
                          <span className="text-2xl font-semibold text-white">{initial}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col px-5 pb-5 pt-14 text-center">
                    <h2 className="text-lg font-semibold text-white">{displayName}</h2>
                    <p className="mt-1 text-xs text-gray-300">{company}</p>
                    <p className="text-xs text-gray-400">{role}</p>
                    <div className="mx-auto my-5 h-px w-10/12 bg-white/20" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xl font-bold text-white">{summary?.eventsCount ?? eventsRes?.data?.total ?? 0}</p>
                        <p className="mt-1 text-xs text-gray-300">Events</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-white">{summary?.connectionsCount ?? 0}</p>
                        <p className="mt-1 text-xs text-gray-300">Connections</p>
                      </div>
                    </div>
                  </div>
                </div>
              </GradientContainer>
            </div>

            <div className="lg:col-span-5">
              <GradientContainer className="h-full min-h-[300px]">
                <div className="relative h-full rounded-[14px] p-5">
                  <button
                    type="button"
                    onClick={() => navigate("/profile/update/personal")}
                    className="absolute right-5 top-5 rounded-md p-1.5 text-white hover:bg-white/10"
                    aria-label="Edit personal details"
                  >
                    <Edit3 className="h-5 w-5" />
                  </button>

                  <h3 className="mb-4 text-base font-medium text-white">Personal Details</h3>
                  <div className="space-y-3 pr-8 text-sm text-gray-200">
                    {personal?.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-[#D85D27]" />
                        <span>{personal.phone}</span>
                      </div>
                    )}
                    {personal?.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-[#D85D27]" />
                        <span>{personal.email}</span>
                      </div>
                    )}
                    {address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#D85D27]" />
                        <span>{address}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 grid border-t border-white/10 pt-5 sm:grid-cols-2">
                    <div className="border-white/10 pb-5 sm:border-r sm:pb-0 sm:pr-6">
                      <p className="text-sm text-white">Social Chapter Details</p>
                      <p className="mt-2 text-2xl font-semibold text-[#D85D27]">
                        {primaryChapter?.name || basicInfo?.socialChapterName || basicInfo?.chapterName || "Not assigned"}
                      </p>
                      <p className="text-xs text-gray-300">
                        {[primaryChapter?.area, primaryChapter?.city, primaryChapter?.regionName].filter(Boolean).join(" | ")}
                      </p>
                    </div>
                    <div className="pt-5 sm:pt-0 sm:pl-6">
                      <p className="text-sm text-white">Expiry date</p>
                      <p className="mt-2 text-2xl font-medium text-white">{expiryDate ? formatDate(rawExpiry) : "-"}</p>
                      {typeof daysLeft === "number" && (
                        <span className="mt-2 inline-flex rounded bg-[#D85D27] px-2 py-0.5 text-[10px] font-medium text-white">
                          {daysLeft} Days Left
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </GradientContainer>
            </div>

            <div className="lg:col-span-5">
              <GradientContainer className="h-full min-h-[300px]">
                <div className="h-full rounded-[14px] p-5">
                  <h3 className="mb-5 text-base font-medium text-white">My Events</h3>
                  {eventsLoading ? (
                    <div className="py-10 text-center text-sm text-gray-400">Loading events...</div>
                  ) : events.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">No events to display</div>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => navigate(`/social/event-details/${event.id}`, { state: { from: "my-events" } })}
                          className="flex w-full items-stretch overflow-hidden rounded-lg border border-white/15 bg-[#111923] text-left transition hover:border-[#D85D27]/70"
                        >
                          {event.imageUrl ? (
                            <img
                              src={event.imageUrl}
                              alt={event.title}
                              className="h-20 w-28 flex-shrink-0 object-cover"
                            />
                          ) : (
                            <div className="h-20 w-28 flex-shrink-0 bg-gradient-to-br from-[#2B2B2B] to-[#111722] flex items-center justify-center">
                              <span className="text-white/60 text-[10px] uppercase tracking-wider">
                                Event
                              </span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="truncate text-base font-medium text-white">{event.title}</h4>
                                <p className="mt-1 text-xs text-gray-300">
                                  {formatDate(event.startsAt)} {formatTime(event.startsAt)}
                                </p>
                              </div>
                              <span className="rounded-full border border-[#D85D27] px-3 py-1 text-[10px] text-white">
                                View More
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs text-gray-400">{event.chapterName || "Social Chapter"}</p>
                            <p className="truncate text-xs text-gray-400">{event.location}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </GradientContainer>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
