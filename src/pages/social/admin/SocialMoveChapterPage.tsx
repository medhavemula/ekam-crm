import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useToast } from "../../../components/toast/ToastProvider";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import { FormSelect } from "../../../components/forms";
import { useGetSocialRegionalBoardQuery } from "../../../services/social/socialAdminDashboardApi";
import { useUpdateSocialUserChapterMutation } from "../../../services/social/dashboardApi";
import { useGrantSocialAccessMutation } from "../../../services/social/socialAdminDashboardApi";
import { useAppDispatch } from "../../../app/store";
import { socialRegionalBoardApi } from "../../../services/social/regionalBoardApi";

interface MemberRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  country?: string;
  region?: string;
  currentChapterId?: string;
  currentChapterName?: string;
}

interface LocationState {
  member?: MemberRecord;
  mode?: "grant-social";
}

const PAGE_LIMIT = 15;

export default function SocialMoveChapterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { chapterId, userId } = useParams<{ chapterId?: string; userId: string }>();
  const { showToast } = useToast();
  const dispatch = useAppDispatch();

  const state = (location.state as LocationState) || {};
  const member = state.member;
  const grantSocialMode = state.mode === "grant-social";
  const isPlatformMembersMode = location.pathname.includes("/social/admin/regional-board/platform-members");

  const [selectedChapter, setSelectedChapter] = useState(member?.currentChapterId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allChapters, setAllChapters] = useState<{ label: string; value: string }[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const [updateSocialUserChapter] = useUpdateSocialUserChapterMutation();
  const [grantSocialAccess] = useGrantSocialAccessMutation();

  // Fetch page 1 via hook to get total count
  const { data: page1Data } = useGetSocialRegionalBoardQuery({ page: 1, limit: PAGE_LIMIT });

  // Once we have page 1, accumulate all pages
  useEffect(() => {
    if (!page1Data?.data) return;

    const items: any[] = [...(page1Data.data.items || [])];
    const total: number = page1Data.data.total || 0;
    const totalPages = Math.ceil(total / PAGE_LIMIT);

    if (totalPages <= 1) {
      setAllChapters(items.map((c) => ({ label: c.name || String(c.id), value: String(c.id) })));
      setIsFetching(false);
      return;
    }

    // Fetch remaining pages in parallel
    const pagePromises: Promise<any>[] = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(
        dispatch(
          socialRegionalBoardApi.endpoints.getSocialRegionalBoard.initiate(
            { page: p, limit: PAGE_LIMIT },
            { forceRefetch: false }
          )
        )
      );
    }

    Promise.all(pagePromises)
      .then((results) => {
        const extra = results.flatMap((r) => r?.data?.data?.items || []);
        const combined = [...items, ...extra];
        setAllChapters(combined.map((c) => ({ label: c.name || String(c.id), value: String(c.id) })));
      })
      .finally(() => setIsFetching(false));
  }, [page1Data, dispatch]);

  useEffect(() => {
    if (!member?.id) {
      showToast({ title: "Error", description: "Member information is missing.", kind: "error" });
      navigate(-1);
    }
  }, [member, navigate, showToast]);

  const handleSubmit = async () => {
    const targetUserId = userId || member?.id;
    if (!targetUserId || !selectedChapter) return;
    setIsSubmitting(true);
    try {
      if (grantSocialMode) {
        await grantSocialAccess({ userId: targetUserId, socialChapterId: selectedChapter }).unwrap();
        showToast({
          title: "Success",
          description: "Social module access granted successfully.",
          kind: "success",
        });
      } else {
        await updateSocialUserChapter({ userId: targetUserId, socialChapterId: selectedChapter }).unwrap();
        showToast({ title: "Success", description: "Member moved to new chapter successfully.", kind: "success" });
      }
      sessionStorage.setItem("refreshMemberData", "true");
      navigate(
        isPlatformMembersMode
          ? "/social/admin/regional-board/platform-members"
          : `/social/admin/regional-board/chapter/${chapterId}/members`,
        { replace: true }
      );
    } catch (e: any) {
      showToast({ title: "Error", description: e?.data?.message || e?.message || "Failed to move member.", kind: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar />
      <main className="container mx-auto px-2 py-6">
        <PageHeader
          breadcrumbs={[
            { label: "Regional Board", onClick: () => navigate("/social/admin/regional-board") },
            {
              label: isPlatformMembersMode ? "Add Platform Member" : "Members",
              onClick: () =>
                navigate(
                  isPlatformMembersMode
                    ? "/social/admin/regional-board/platform-members"
                    : chapterId
                      ? `/social/admin/regional-board/chapter/${chapterId}/members`
                      : "/social/admin/regional-board"
                ),
            },
            { label: member?.name || "Member" },
            { label: "Move Chapter" },
          ]}
        />

        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1419] to-[#141a22] px-28 py-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-4 gap-x-6">
            <div className="md:col-span-3"><label className="text-sm text-white/70">Name</label></div>
            <div className="md:col-span-9 text-white/90">{member?.name || "N/A"}</div>

            <div className="md:col-span-3"><label className="text-sm text-white/70">Phone</label></div>
            <div className="md:col-span-9 text-white/90">{member?.phone || "N/A"}</div>

            <div className="md:col-span-3"><label className="text-sm text-white/70">Email</label></div>
            <div className="md:col-span-9 text-white/90 break-all">{member?.email || "N/A"}</div>

            {member?.currentChapterName && (
              <>
                <div className="md:col-span-3"><label className="text-sm text-white/70">{grantSocialMode ? "Current Social Chapter" : "Current Chapter"}</label></div>
                <div className="md:col-span-9 text-white/90">{member.currentChapterName}</div>
              </>
            )}
          </div>

          <div className="mt-8 max-w-xl mx-auto space-y-4">
            {isFetching ? (
              <div className="flex items-center gap-2 text-white/50 text-sm py-2">
                <div className="w-4 h-4 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
                Loading chapters...
              </div>
            ) : (
              <FormSelect
                label={grantSocialMode ? "Assign Social Chapter" : "Move to Chapter"}
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                options={allChapters}
                placeholder="Select a chapter"
              />
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-4 pt-10 max-w-xl mx-auto">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedChapter || isFetching}
              className="flex-1 px-6 py-3 rounded-lg bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? grantSocialMode
                  ? "Granting..."
                  : "Moving..."
                : grantSocialMode
                  ? "Assign Chapter & Grant Social"
                  : "Move Member"}
            </button>
            <button
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
