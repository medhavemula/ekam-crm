import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import { SocialLayout } from "../../components/social";
import GradientContainer from "../../components/common/GradientContainer";
import { useGetUserSocialConnectionProfileQuery } from "../../services/social";
import { useReportContentMutation } from "../../services/moderationApi";
import type { ModerationReason } from "../../services/moderationApi";
import { ReportDialog } from "../../components/common/ReportDialog";
import { useToast } from "../../components/toast/ToastProvider";

export default function SocialProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [reportContent] = useReportContentMutation();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const { data, isLoading, isError } =
    useGetUserSocialConnectionProfileQuery(userId || "", {
      skip: !userId,
    });

  const confirmReportProfile = async (reason: ModerationReason, details: string) => {
    if (!userId) return;
    try {
      setIsReporting(true);
      await reportContent({
        contentType: "SOCIAL_PROFILE",
        contentId: userId,
        targetUserId: userId,
        reason,
        details: details || undefined,
      }).unwrap();
      showToast({
        title: "Profile reported",
        description: "Thanks. Our admins will review this profile within 24 hours.",
        kind: "success",
      });
      setIsReportOpen(false);
    } catch (error: any) {
      showToast({
        title: "Failed to report profile",
        description: error?.data?.message || "Please try again.",
        kind: "error",
      });
    } finally {
      setIsReporting(false);
    }
  };

  // ✅ Safe text normalizer
  const normalizeText = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") {
      if (/^[a-f0-9]{24}$/i.test(value)) return "";
      return value;
    }
    if (typeof value === "object") {
      return value.name || value.title || value.label || "";
    }
    return "";
  };

  const profile = data?.data;
  const primaryChapter = profile?.chapters?.[0];

  return (
    <SocialLayout>
      <div className="pt-0 px-4 md:px-6 -mt-6">
        <button
          onClick={() => navigate("/social/connections")}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1 mb-2"
        >
          <span className="text-lg">‹</span> Back
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-medium">My Account</h1>
          {userId && !isLoading && !isError && profile && (
            <button
              onClick={() => setIsReportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-amber-300 border border-amber-500/60 hover:bg-amber-500/10 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 2H20l-3 6 3 6h-7.5l-1-2H5a2 2 0 00-2 2z" />
              </svg>
              Report
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError || !profile ? (
          <div className="border border-red-500/30 bg-red-500/10 text-red-200 rounded-xl p-4 text-sm">
            Failed to load profile
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT */}
            <div className="lg:col-span-3">
              <GradientContainer>
                <div className="p-6 rounded-[14px] flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-[#4a5568] overflow-hidden flex items-center justify-center border-2 border-[#D85D27]">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl text-white">
                        {profile.name?.charAt(0) || "?"}
                      </span>
                    )}
                  </div>

                  <h2 className="text-white text-lg font-semibold mt-4">
                    {profile.name}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {profile.company}
                  </p>
                  <p className="text-gray-500 text-sm">{profile.role}</p>

                  <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-gray-700 w-full">
                    <div>
                      <div className="text-white text-xl font-bold">0</div>
                      <div className="text-gray-500 text-xs">Events</div>
                    </div>
                    <div>
                      <div className="text-white text-xl font-bold">
                        {profile.connectionsCount ?? 0}
                      </div>
                      <div className="text-gray-500 text-xs">Connections</div>
                    </div>
                  </div>
                </div>
              </GradientContainer>
            </div>

            {/* CENTER */}
            <div className="lg:col-span-5 space-y-4">
              <GradientContainer>
                <div className="p-5 rounded-[14px]">
                  <h3 className="text-white text-base font-medium mb-4">
                    Personal Details
                  </h3>

                  <div className="space-y-3">
                    {profile.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-[#D85D27]" />
                        <span className="text-gray-300 text-sm">
                          {profile.phone}
                        </span>
                      </div>
                    )}

                    {profile.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-[#D85D27]" />
                        <span className="text-gray-300 text-sm">
                          {profile.email}
                        </span>
                      </div>
                    )}

                    {(normalizeText(profile.city) ||
                      normalizeText(profile.state)) && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-[#D85D27] mt-0.5" />
                        <span className="text-gray-300 text-sm">
                          {[normalizeText(profile.city), normalizeText(profile.state)]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {primaryChapter && (
                    <div className="mt-6 pt-4 border-t border-gray-700">
                      <div className="text-gray-500 text-xs mb-1">
                        Social Chapter Details
                      </div>
                      <div className="text-[#D85D27] font-semibold">
                        {primaryChapter.name}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {[normalizeText(primaryChapter.area), normalizeText(primaryChapter.city)]
                          .filter(Boolean)
                          .join(" ")}
                      </div>
                    </div>
                  )}
                </div>
              </GradientContainer>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-4">
              <GradientContainer>
                <div className="p-5 rounded-[14px]">
                  <h3 className="text-white text-base font-medium mb-4">
                    My Events
                  </h3>
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No events to display
                  </div>
                </div>
              </GradientContainer>
            </div>
          </div>
        )}
      </div>

      <ReportDialog
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onConfirm={confirmReportProfile}
        isSubmitting={isReporting}
        contentLabel="profile"
        title="Report this profile?"
        description="Tell us what's wrong with this social profile. Our admins will review the reported details and act within 24 hours."
      />
    </SocialLayout>
  );
}
