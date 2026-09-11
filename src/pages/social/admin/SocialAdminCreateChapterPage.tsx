import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import GradientContainer from "../../../components/common/GradientContainer";
import FormInput from "../../../components/forms/FormInput";
import DatePicker from "../../../components/common/DatePicker";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import { useAppSelector } from "../../../app/store";
import { useCreateSocialChapterMutation } from "../../../services/social/chaptersApi";

export default function SocialAdminCreateChapterPage() {
  const navigate = useNavigate();

  const authUser = useAppSelector((s) => s.auth.user);
  const [createChapter, { isLoading, error }] = useCreateSocialChapterMutation();

  const [chapterName, setChapterName] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [areaName, setAreaName] = useState("");

  // Derive regionId from user's assignments (from /me API response)
  const regionId = useMemo(() => {
    const assignments = (authUser as any)?.assignments || [];
    const socialAssignment = assignments.find(
      (a: any) => a.role === "SOCIAL_CHAIRPERSON" && a.scope?.region,
    );
    return socialAssignment?.scope?.region || "";
  }, [authUser]);

  const handleSubmit = async () => {
    if (!chapterName) return;

    try {
      // regionId is only present when the role carries it on user.assignments. A Social
      // Chairperson gets theirs from their Partner row, which /users/me does not return,
      // so leave it out and let the server use the caller's own region.
      await createChapter({
        name: chapterName,
        regionId: regionId || undefined,
        area: areaName || undefined,
      }).unwrap();
      navigate("/social/admin/regional-board", { state: { chapterCreated: true } });
    } catch {
      // error is handled via error state below
    }
  };

  const handleCancel = () => {
    navigate("/social/admin/regional-board");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <button
            onClick={() => navigate("/social/admin/regional-board")}
            className="hover:text-white transition-colors"
          >
            Regional Board
          </button>
          <span>›</span>
          <span className="text-white">Create Chapter</span>
        </div>

        <div className="max-w-3xl mx-auto">
          <GradientContainer>
            <div className="rounded-2xl px-8 py-10">
              <div className="space-y-6">
                {/* Error message */}
                {error && (
                  <div className="mb-2 rounded-md border border-red-500 bg-red-950/30 px-4 py-2 text-sm text-red-200">
                    Failed to create chapter. Please check your details and try again.
                  </div>
                )}

                {/* Chapter Name */}
                <FormInput
                  label="Chapter Name"
                  type="text"
                  placeholder="Enter chapter name"
                  value={chapterName}
                  onChange={(e) => setChapterName(e.target.value)}
                />

                {/* Launch Date */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Launch Date</label>
                  <DatePicker
                    value={launchDate}
                    onChange={setLaunchDate}
                    iconSrc={CalendarIcon}
                  />
                </div>

                {/* Area */}
                <FormInput
                  label="Area"
                  type="text"
                  placeholder="Enter area name"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                />

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={!chapterName || isLoading}
                    className="flex-1 h-11 px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Submitting..." : "Submit"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 h-11 px-6 rounded-md bg-gray-500 hover:bg-gray-400 text-white font-medium text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </GradientContainer>
        </div>
      </main>
    </div>
  );
}
