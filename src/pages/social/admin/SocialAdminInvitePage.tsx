import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import { PageHeader } from "../../../components/common";
import { FormSelect } from "../../../components/forms";
import { useGetSocialRegionalBoardQuery } from "../../../services/social/socialAdminDashboardApi";

interface LocationState {
  name?: string;
  area?: string;
  regionName?: string;
  countryName?: string;
}

export default function SocialAdminInvitePage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const [inviteChapterName, setInviteChapterName] = useState("");

  // Fetch all chapters for the dropdown (max limit is 100)
  const { data: chaptersData, isLoading: isLoadingChapters } = useGetSocialRegionalBoardQuery({
    area: undefined,
    chapter: undefined,
    page: 1,
    limit: 100, // API max limit is 100
  });

  const chapterName = state.name || "-";
  const area = state.area || "-";
  const regionName = state.regionName || "-";
  const countryName = state.countryName || "-";

  // Build chapter options from API data
  const allChapters = chaptersData?.data?.items || [];
  const filteredChapters = allChapters.filter((ch) => ch.id !== chapterId); // Exclude current chapter
  
  const chapterOptions = [
    { value: "", label: "Select chapter to invite" },
    ...filteredChapters.map((ch) => ({
      value: ch.id,
      label: ch.name,
    })),
  ];

  const breadcrumbs = [
    { label: "Regional Board", onClick: () => navigate("/social/admin/regional-board") },
    { label: "Invite" }
  ];

  const handleInvite = () => {
    if (!chapterId || !inviteChapterName) return;
    // For now, redirect into existing manage volunteers flow with chapter context
    const params = new URLSearchParams();
    params.set("chapterId", chapterId);
    params.set("inviteChapter", inviteChapterName);
    navigate(`/social/manage-voluntary?${params.toString()}`);
  };

  const handleCancel = () => {
    navigate("/social/admin/regional-board");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
      <Navbar />

      <main className="container mx-auto px-2 py-6">
        <PageHeader breadcrumbs={breadcrumbs} />

        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1419] to-[#141a22] px-28 py-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-4 gap-x-6">
            {/* Chapter Information */}
            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Chapter</label>
            </div>
            <div className="md:col-span-9 text-white/90">{chapterName}</div>

            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Country</label>
            </div>
            <div className="md:col-span-9 text-white/90">{countryName}</div>

            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Region</label>
            </div>
            <div className="md:col-span-9 text-white/90">{regionName}</div>

            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Area</label>
            </div>
            <div className="md:col-span-9 text-white/90">{area}</div>
          </div>

          {/* Invite Chapter Form */}
          <div className="mt-8 max-w-xl mx-auto">
            <label className="text-sm text-white/70 mb-2 block">
              Invite Chapter
            </label>
            {isLoadingChapters ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <FormSelect
                label=""
                options={chapterOptions}
                value={inviteChapterName}
                onChange={(e) => setInviteChapterName(e.target.value)}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-4 pt-10 max-w-xl mx-auto">
            <button
              onClick={handleInvite}
              disabled={!inviteChapterName || isLoadingChapters}
              className="flex-1 px-6 py-3 rounded-lg bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Invite
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}