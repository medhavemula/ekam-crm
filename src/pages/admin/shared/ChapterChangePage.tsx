import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../../../components/toast/ToastProvider";
import { Navbar } from "../../../components/navigation";
import { PageHeader } from "../../../components/common";
import { FormSelect } from "../../../components/forms";
import { useGetEdChaptersQuery } from "../../../services/ed/edChaptersApi";
import { useMarkAsMovedAwayMutation, useUpdateUserChapterMutation } from "../../../services/memberApi";

interface MemberRecord {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  profession: string;
  region?: string;
  area?: string;
  country?: string;
  regionName?: string;
  countryName?: string;
  chapterName?: string;
  status: 'Pending' | 'Joined' | 'Blocked' | 'Deleted' | 'REJECTED' | string;
  requestedAt?: string;
  isRequest?: boolean;
  approvalId?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  page?: number;
  limit?: number;
  total?: number;
  tiles?: {
    totalMembers: number;
    blockedMembers: number;
    deletedMembers: number;
    requestMembers: number;
  };
  requests?: any[];
}

interface LocationState {
  member: MemberRecord;
  currentChapterId: string;
  currentChapterName: string;
  memberData?: ApiResponse<MemberRecord[]>;
}

export default function ChapterChangePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  

  // Safely get member and chapter data from location state
  const locationState = location.state as LocationState | undefined;
  
  // Check if in approval mode
  const isApprovalMode = useMemo(() => {
    return location.pathname.includes('/approvals/');
  }, [location.pathname]);

  // Get the current chapter ID from URL if in approval mode
  const chapterIdFromUrl = useMemo(() => {
    if (isApprovalMode) {
      const pathParts = location.pathname.split('/');
      const approvalIndex = pathParts.indexOf('approvals');
      if (approvalIndex !== -1 && pathParts.length > approvalIndex + 1) {
        return pathParts[approvalIndex + 1];
      }
    }
    return '';
  }, [location.pathname, isApprovalMode]);

  // Get chapter data from location state or URL
  const { currentChapterId: stateChapterId, currentChapterName: stateChapterName } = locationState || {};
  const currentChapterId = stateChapterId || chapterIdFromUrl;
  const currentChapterName = stateChapterName || '';

  // State for form
  const [selectedChapter, setSelectedChapter] = useState(currentChapterId || "");

  // Fetch chapters list
  const { data: chaptersData, error: chaptersError } = useGetEdChaptersQuery({ limit: 100 });

  // Get member data from location state with proper typing
  const memberData = useMemo(() => {
    if (!locationState?.member) return undefined;
    
    const member = locationState.member;
    
    // Use countryName and regionName directly since profile API provides them
    // Fall back to IDs if names are not available (for other data sources)
    const countryName = member.countryName || member.country || 'N/A';
    const regionName = member.regionName || member.region || 'N/A';
    
    return {
      id: member.id,
      name: member.name || 'N/A',
      email: member.email || 'N/A',
      phone: member.phone || 'N/A',
      company: member.company || 'N/A',
      profession: member.profession || 'N/A',
      status: member.status || 'ACTIVE',
      region: member.region || 'N/A',
      country: member.country || 'N/A',
      regionName,
      countryName,
      area: member.area || 'N/A',
      chapterName: member.chapterName || 'N/A',
      // Handle request-specific fields
      ...(member.isRequest && {
        isRequest: true,
        approvalId: member.approvalId || member.id,
        requestedAt: member.requestedAt
      })
    };
  }, [locationState]);

  // Redirect if no member data
  useEffect(() => {
    if (!memberData?.id) {
      showToast({
        title: "Error",
        description: "Member information is missing. Please try again.",
        kind: "error"
      });
      navigate(-1);
    }
  }, [memberData, navigate, showToast]);

  // Handle chapters fetch error
  useEffect(() => {
    if (chaptersError) {
      showToast({
        title: "Error",
        description: "Failed to load chapters. Please try again.",
        kind: "error"
      });
    }
  }, [chaptersError, showToast]);

  // Initialize the mutations
  const [markAsMovedAway] = useMarkAsMovedAwayMutation();
  const [updateUserChapter] = useUpdateUserChapterMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Type for API error response
  interface ApiError {
    data?: {
      message?: string;
    };
    message?: string;
  }

  // Handle chapter change
  const handleChapterChange = async () => {
    if (!memberData?.id || !selectedChapter) return;
    
    setIsSubmitting(true);
    const userId = memberData.id;

    try {
      // Always use the updateUserChapter endpoint for consistency
      // This matches the API endpoint: /admin/ed/users/{userId}/chapter
      await updateUserChapter({
        userId,
        chapterId: selectedChapter
      }).unwrap();
      
      // If this was an approval request, also mark it as approved
      if (isApprovalMode && memberData.status === 'Pending') {
        try {
          await markAsMovedAway({
            approvalId: userId,
            chapterId: selectedChapter
          }).unwrap();
        } catch (approvalError) {
          console.warn("Warning: Chapter updated but approval status may not be updated:", approvalError);
          // Continue even if approval status update fails, as the main chapter update succeeded
        }
      }

      // Determine success message based on context
      let successMessage = "User's chapter updated successfully";
      if (isApprovalMode) {
        successMessage = memberData.status === 'Pending' 
          ? "Member approved and chapter updated successfully"
          : "Chapter change processed successfully";
      }

      showToast({
        title: "Success",
        description: successMessage,
        kind: "success"
      });

      // Navigate to the chapter details page for the new chapter
      const targetPath = isApprovalMode
        ? `/admin/approvals/${currentChapterId}`
        : `/admin/regional-board/chapter/${selectedChapter}/members?chapterId=${selectedChapter}`;
      
      navigate(targetPath, {
        state: { shouldRefresh: true },
        replace: true
      });
    } catch (error) {
      console.error("Error updating chapter:", error);
      const apiError = error as ApiError;
      const errorMessage = apiError?.data?.message || apiError?.message || 
        `Failed to ${isApprovalMode ? 'process approval' : 'update chapter'}. Please try again.`;
      
      showToast({
        title: "Error",
        description: errorMessage,
        kind: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    handleChapterChange();
  };

  // Transform API response to select options
  const chapterOptions = useMemo(() => {
    if (!chaptersData?.data) return [];
    // Handle both array response and paginated response
    const items = Array.isArray(chaptersData.data)
      ? chaptersData.data
      : (chaptersData.data as any)?.items || [];

    return [
      { value: '', label: 'Select chapter' },
      ...items.map((chapter: any) => ({
        value: chapter.id,
        label: `${chapter.name}${chapter.region ? ` (${chapter.region})` : ''}`,
      }))
    ];
  }, [chaptersData]);

  const breadcrumbs = useMemo(() => [
    { label: "Regional Board", onClick: () => navigate("/admin/regional-board") },
    currentChapterId
      ? { 
          label: currentChapterName || "Chapter", 
          onClick: () => navigate(`/admin/regional-board/chapter/${currentChapterId}`) 
        }
      : { label: currentChapterName || "Chapter" },
    memberData?.id
      ? { 
          label: memberData?.name || "Member", 
          onClick: () => navigate(`/admin/regional-board/chapter/${currentChapterId}/members`) 
        }
      : { label: memberData?.name || "Member" },
    { label: "Change Chapter" } // current page (non-clickable => highlighted)
  ], [currentChapterId, currentChapterName, memberData, navigate]);

  if (!memberData) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="text-white">Loading member data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar />
      <main className="container mx-auto px-2 py-6">
        <PageHeader breadcrumbs={breadcrumbs} />

        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1419] to-[#141a22] px-28 py-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-4 gap-x-6">

            {/* Member Information */}
            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Name</label>
            </div>
            <div className="md:col-span-9 text-white/90">{memberData?.name || 'N/A'}</div>
            
            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Phone</label>
            </div>
            <div className="md:col-span-9 text-white/90">{memberData?.phone || 'N/A'}</div>
            
            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Email</label>
            </div>
            <div className="md:col-span-9 text-white/90">{memberData?.email || 'N/A'}</div>
            
            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Country</label>
            </div>
            <div className="md:col-span-9 text-white/90">{memberData?.countryName || 'N/A'}</div>
            
            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Region</label>
            </div>
            <div className="md:col-span-9 text-white/90">{memberData?.regionName || 'N/A'}</div>
            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Chapter</label>
            </div>
            <div className="md:col-span-9 text-white/90">{currentChapterName || 'N/A'}</div>
          </div>
          {/* Change Chapter */}
          <div className="mt-8 max-w-xl mx-auto">
            <FormSelect
              label="Change Chapter"
              isRequired
              autoFocus
              options={chapterOptions}
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              error={!selectedChapter ? "Please select a chapter" : undefined}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-4 pt-10 max-w-xl mx-auto">
            <button
              onClick={handleSubmit}
              disabled={!selectedChapter || isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Processing..." : "Submit"}
            </button>
            <button
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div >
      </main >
    </div >
  );
}
