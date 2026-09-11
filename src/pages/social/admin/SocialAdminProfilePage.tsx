import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import GradientContainer from "../../../components/common/GradientContainer";
import { ProfileCard } from "../../../components/profile";
import { useMeQuery } from "../../../services/authApi";
import { useRole } from "../../../hooks/useRole";

export default function SocialAdminProfilePage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const { role } = useRole();

  const { data: meRes, isLoading: meLoading, error: meError } = useMeQuery();

  // Redirect to login if unauthorized
  React.useEffect(() => {
    const err = meError as any;
    if (err && typeof err === "object" && "status" in err && err.status === 401) {
      navigate("/login");
    }
  }, [meError, navigate]);

  const profileData = (meRes?.data as any) || {};

  React.useEffect(() => {
    const name = profileData.profile?.name;
    if (name) setUserName(name);
  }, [profileData]);

  const profile = profileData.profile || {};
  const personal = profileData.personal || {};
  const business = profileData.business || {};
  const stats = profileData.stats || {};
  const basicInfo = profileData.basicInfo || {};
  const membership = profileData.membership || {};
  const social = profileData.social || {};
  const edData = profileData.edData || {};

  const avatarUrl = basicInfo?.profilePhotoUrlResolved || profile?.avatarUrl || personal?.avatarUrl || undefined;

  const roleLabel = useMemo(() => {
    if (role && role !== "USER") {
      return role;
    }
    
    return "SOCIAL_ADMIN";
  }, [role]);

  const regionName =
    edData?.regionName ||
    basicInfo?.regionName ||
    basicInfo?.region?.name ||
    basicInfo?.region ||
    social?.region?.name ||
    "-";


  const registrationRaw =
    edData?.registrationDate ||
    membership?.registeredAt ||
    membership?.registrationDate ||
    membership?.startDate ||
    profileData?.createdAt ||
    "";
  const renewalRaw =
    edData?.renewalDate ||
    membership?.renewedAt ||
    membership?.renewalDate ||
    membership?.lastRenewedAt ||
    "";
  const expiryRaw =
    edData?.expiryDate ||
    membership?.expiresAt ||
    membership?.expiryDate ||
    membership?.endDate ||
    "";

  const fmt = (v: any) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB");
  };

  const expiryDate = expiryRaw ? new Date(expiryRaw) : undefined;
  const daysLeft = expiryDate
    ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : undefined;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `url('${import.meta.env.BASE_URL}auth-bg.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="min-h-screen bg-[#0B1220]/85">
        <Navbar userName={userName} />

        <main className="container mx-auto px-4 py-6">
          {meLoading && <div className="mb-4 text-sm text-gray-300">Loading your profile...</div>}
          {meError && <div className="mb-4 text-sm text-red-400">Failed to load profile.</div>}

          <h1 className="text-2xl font-semibold text-white mb-4">Social Admin Profile</h1>

          <section className="relative md:pt-2">
            <div className="grid grid-cols-12 gap-6 items-stretch">
              {/* Left profile card */}
              <div className="col-span-12 lg:col-span-3">
                <div className="h-full min-h-[240px]">
                  <ProfileCard
                    name={profile?.name || "User"}
                    company={business?.businessName || ""}
                    role={roleLabel}
                    postsCount={String(stats?.posts ?? "0")}
                    connectionsCount={String(stats?.connections ?? "0")}
                    avatarUrl={avatarUrl}
                    className="h-full"
                  />
                </div>
              </div>

              {/* Right details card */}
              <div className="col-span-12 lg:col-span-9">
                <GradientContainer className="h-full">
                  <div className="rounded-2xl p-5 md:p-7">
                    <h3 className="text-white text-base md:text-lg font-semibold">Social Admin Details</h3>

                    <div className="h-px bg-white/10 my-4" />

                    {/* Contact Information at Top */}
                    <div className="space-y-3 mb-6">
                      {personal?.phone ? (
                        <div className="flex items-center gap-3">
                          <span className="text-[#D85D27]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59 2 2 0 0 0 2.11-.45l1.27-1.27a1 1 0 0 1 1.11-.22c1 .41 2.09.69 3.2.82a1 1 0 0 1 .88 1v3a2 2 0 0 1-2.18 2 19.7 19.7 0 0 1-8.64-3.08 19.5 19.5 0 0 1-6-6A19.7 19.7 0 0 1 2 4.18 2 2 0 0 1 4 2h3a1 1 0 0 1 1 .88c.13 1.11.41 2.2.82 3.2a1 1 0 0 1-.22 1.11L7.33 8.46a2 2 0 0 0-.71 2.33z" />
                            </svg>
                          </span>
                          <span className="text-gray-200 text-sm">{personal.phone}</span>
                        </div>
                      ) : null}

                      {profile?.email ? (
                        <div className="flex items-center gap-3">
                          <span className="text-[#D85D27]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm-1.4 4.25-6.07 4.21a1 1 0 0 1-1.06 0L5.4 8.25a1 1 0 1 1 1.2-1.6L12 10.6l5.4-3.95a1 1 0 1 1 1.2 1.6Z" />
                            </svg>
                          </span>
                          <span className="text-gray-200 text-sm">{profile.email}</span>
                        </div>
                      ) : null}

                      {(basicInfo?.streetAddress || basicInfo?.city || basicInfo?.state || basicInfo?.pincode) ? (
                        <div className="flex items-start gap-3">
                          <span className="text-[#D85D27] mt-0.5">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2a8 8 0 0 0-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
                            </svg>
                          </span>
                          <span className="text-gray-200 text-sm leading-relaxed">
                            {[basicInfo?.streetAddress, basicInfo?.city, basicInfo?.state, basicInfo?.pincode]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="h-px bg-white/10 my-5" />

                    {/* 4-column boxes for dates and info */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-0 rounded-xl overflow-hidden border border-white/10">
                      <div className="p-4 bg-white/0">
                        <div className="text-gray-400 text-xs mb-2 font-semibold">Region</div>
                        <div className="text-[#D85D27] font-semibold text-xl">{String(regionName || "-")}</div>
                      </div>

                      <div className="p-4 border-t md:border-t-0 md:border-l border-white/10">
                        <div className="text-gray-400 text-xs mb-2 font-semibold">Registration date</div>
                        <div className="text-white font-semibold">{fmt(registrationRaw)}</div>
                      </div>

                      <div className="p-4 border-t md:border-t-0 md:border-l border-white/10">
                        <div className="text-gray-400 text-xs mb-2 font-semibold">Renewal Date</div>
                        <div className="text-white font-semibold">{fmt(renewalRaw)}</div>
                      </div>

                      <div className="p-4 border-t md:border-t-0 md:border-l border-white/10">
                        <div className="text-gray-400 text-xs mb-2 font-semibold">Expiry date</div>
                        <div className="text-white font-semibold">{fmt(expiryRaw)}</div>
                        {typeof daysLeft === "number" ? (
                          <div className="inline-block mt-2 px-3 py-1 rounded-md bg-[#D85D27] text-white text-xs">
                            {daysLeft} Days Left
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </GradientContainer>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
