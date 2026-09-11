import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import lockIcon from "../../assets/icons/lock.svg";
import publicIcon from "../../assets/icons/public.svg";
import GMemIcon from "../../assets/icons/GMem.svg";
import { ModernConnectionCard } from "../../components/connections/ModernConnectionCard";
import CreatePostInput from "../../components/feed/CreatePostInput";
import CreatePostModal from "../../components/feed/CreatePostModal";
import EditPostModal from "../../components/feed/EditPostModal";
import RepostModal from "../../components/feed/RepostModal";
import ProfessionalFeedPost from "../../components/professional/ProfessionalFeedPost";
import { PageHeader } from "../../components/common/PageHeader";
import GradientContainer from "../../components/common/GradientContainer";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { useLazyConnectionsSearchDirectoryQuery } from "../../services/connectionsApi";
import { useGetGroupQuery, useListGroupMembersQuery, useGetGroupFeedQuery, useCreateGroupPostMutation, useUpdateGroupPostMutation, useDeleteGroupPostMutation, useGetGroupFeedPresignUrlBatchMutation, useInviteUserMutation, useListPendingRequestsQuery, useHandleJoinRequestMutation, useLeaveGroupMutation, useListGroupPostCommentsQuery, useAddGroupPostCommentMutation, useUpdateGroupPostCommentMutation, useDeleteGroupPostCommentMutation, useLikeGroupPostMutation, useUnlikeGroupPostMutation, useSaveGroupPostMutation, useUnsaveGroupPostMutation, useDeleteGroupMutation as useDeleteGroupMutationHook, useListGroupInvitesQuery, useCancelInviteMutation, useRepostGroupPostMutation } from "../../services/groupsApi";
import { useMeQuery } from "../../services/authApi";
import { useAppSelector } from "../../app/store";
import { uploadFiles, type PresignedUrlParams, type UploadedFile } from "../../utils/fileUpload";
import { useToast } from "../../components/toast/ToastProvider";
import { formatStepwiseDescription, hasStepwiseFormat } from "../../utils/descriptionFormatter";
import { useBlockUserMutation, useReportContentMutation } from "../../services/moderationApi";
import type { ModerationReason } from "../../services/moderationApi";
import { ReportDialog } from "../../components/common/ReportDialog";

// Type for transformed feed posts
interface TransformedFeedPost {
  id: string;
  authorUserId?: string;
  body: string;
  authorName: string;
  authorAvatar: string;
  authorTitle?: string;
  createdAt: string;
  shareUrl?: string;
  imageUrl?: string; // Keep for backward compatibility
  media?: Array<{ url: string; type: "image" | "video" }>; // Add full media array
  likes: number;
  reposts: number;
  comments: number;
  isLiked: boolean;
  isSaved?: boolean;
  isOwner?: boolean;
  isRepost?: boolean;
  originalPost?: {
    id: string;
    text: string;
    media?: Array<{ url: string; type: "image" | "video" }>;
    authorName: string;
    authorAvatar: string;
    createdAt: string;
    shareUrl?: string;
  } | null;
}

const getFilteredTabs = (
  _status: 'none' | 'pending' | 'requested' | 'joined' | 'rejected',
  _groupId: string, // Parameter prefixed with underscore to indicate unused
  isAdminView: boolean = false,
  isPrivateGroup: boolean = true,
  isGroupAdmin: boolean = false
) => {
  const baseTabs = ["Feed", "Members", "About"] as const;
  const tabsWithInvites = ["Feed", "Members", "My Invites", "About"] as const;
  const tabsWithRequests = ["Feed", "Members", "Requests", "My Invites", "About"] as const;
  
  // For admin view, never show Requests tab
  if (isAdminView) {
    return baseTabs;
  }
  
  if (!isGroupAdmin) {
    return baseTabs;
  }

  return isPrivateGroup ? tabsWithRequests : tabsWithInvites;
};

const getDescriptionLines = (description?: string) =>
  (hasStepwiseFormat(description) ? formatStepwiseDescription(description) : description || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const renderDescription = (description?: string, fallback = "") => {
  const descriptionLines = getDescriptionLines(description);

  if (descriptionLines.length === 0) {
    return <span>{fallback}</span>;
  }

  if (descriptionLines.length === 1) {
    return <span>{descriptionLines[0]}</span>;
  }

  return (
    <div className="space-y-2">
      {descriptionLines.map((line, index) => (
        <div key={index} className="flex gap-2 text-sm">
          <span className="mt-[8px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-500" />
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
};

const formatFeedDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
  });
};

const getActionButtons = (
  status: 'none' | 'pending' | 'requested' | 'joined' | 'rejected',
  onInvite: () => void,
  onLeaveGroup: () => void,
  onDeleteGroup: () => void,
  isOwner: boolean = false,
  isAdmin: boolean = false,
  isApproved: boolean = true
) => {
  switch (status) {
    case 'none':
      return null;
    case 'joined':
      return (
        <div className="flex gap-2 flex-wrap">
          {(isOwner || isAdmin) && isApproved && (
            <button
              className="px-3 py-2 sm:px-4 rounded-full border border-orange-500 text-white hover:bg-orange-600/10 text-sm sm:text-base whitespace-nowrap"
              onClick={onInvite}
            >
              Invite +
            </button>
          )}
          {!isOwner && (
            <button 
              className="px-3 py-2 sm:px-4 rounded-full bg-gray-400 text-white hover:bg-gray-600/10 text-sm sm:text-base whitespace-nowrap"
              onClick={onLeaveGroup}
            >
              Leave This Group
            </button>
          )}
          {isOwner && (
            <>
              {!isApproved && (
                <button
                  disabled
                  className="px-3 py-2 sm:px-4 rounded-full bg-orange-500 text-white text-sm sm:text-base whitespace-nowrap opacity-70 cursor-not-allowed"
                >
                  Pending
                </button>
              )}
              <button
                className="px-3 py-2 sm:px-4 rounded-full border border-red-500 text-red-400 hover:bg-red-500/10 text-sm sm:text-base whitespace-nowrap"
                onClick={onDeleteGroup}
              >
                Delete Group
              </button>
            </>
          )}
        </div>
      );
    case 'pending':
      return (
        <button className="px-3 py-2 sm:px-4 rounded-full bg-orange-500 text-white hover:bg-orange-600 text-sm sm:text-base whitespace-nowrap">Pending</button>
      );
    case 'requested':
      return (
        <button className="px-3 py-2 sm:px-4 rounded-full bg-gray-400 text-white text-sm sm:text-base whitespace-nowrap">Requested</button>
      );
    case 'rejected':
      return null;
    default:
      return null;
  }
};

// Inline comments section component for group posts
const GroupCommentsSection: React.FC<{
  postId: string;
  groupId: string;
  commentText: string;
  setCommentText: (v: string) => void;
  onSubmit: () => void;
  refreshToken?: number;
  profileAvatar?: string;
  currentUserId?: string;
  canModerate?: boolean;
}> = ({ postId, groupId, commentText, setCommentText, onSubmit, refreshToken, profileAvatar, currentUserId, canModerate }) => {
  const { data, isLoading, error, refetch: refetchComments } = useListGroupPostCommentsQuery({ groupId, postId, limit: 10, t: refreshToken } as any, { refetchOnMountOrArgChange: true });
  const [deleteComment] = useDeleteGroupPostCommentMutation();
  const comments = data?.data ?? [];
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentText, setEditedCommentText] = useState("");
  const [deleteConfirmComment, setDeleteConfirmComment] = useState<string | null>(null);
  const { showToast } = useToast();
  const [reportContent] = useReportContentMutation();
  const [pendingReportComment, setPendingReportComment] = useState<{ id: string; authorId?: string } | null>(null);
  const [isReportingComment, setIsReportingComment] = useState(false);

  const confirmReportComment = async (reason: ModerationReason, details: string) => {
    if (!pendingReportComment) return;
    try {
      setIsReportingComment(true);
      await reportContent({
        contentType: "GROUP_COMMENT",
        contentId: pendingReportComment.id,
        targetUserId: pendingReportComment.authorId,
        contextId: groupId,
        reason,
        details: details || undefined,
      }).unwrap();
      showToast({
        title: "Comment reported",
        description: "This comment is hidden from your view and sent to admins for review.",
        kind: "success",
      });
      setPendingReportComment(null);
      refetchComments();
    } catch (error) {
      showToast({ title: "Failed to report comment", description: "Please try again.", kind: "error" });
    } finally {
      setIsReportingComment(false);
    }
  };

  const handleStartEdit = (comment: any) => {
    setEditingCommentId(comment._id);
    setEditedCommentText(comment.text);
  };

  const [updateComment] = useUpdateGroupPostCommentMutation();

  const confirmDeleteComment = async () => {
    if (!deleteConfirmComment) return;
    
    try {
      await deleteComment({ groupId, postId, commentId: deleteConfirmComment }).unwrap();
      refetchComments();
      setDeleteConfirmComment(null);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    setDeleteConfirmComment(commentId);
  };

  const handleSaveEdit = async () => {
    if (!editingCommentId) return;

    try {
      await updateComment({
        groupId,
        postId,
        commentId: editingCommentId,
        text: editedCommentText
      }).unwrap();
      setEditingCommentId(null);
      setEditedCommentText("");
      refetchComments();
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditedCommentText("");
  };

  return (
    <div className="mt-3 p-4 bg-[#1a1f29] border-t border-gray-800">
      {/* Add comment */}
      <div className="flex items-start gap-2.5 mb-3">
        {/* Avatar with profile photo or initial */}
        <div className="w-9 h-9 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
          {profileAvatar ? (
            <img
              src={profileAvatar}
              alt="User"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.parentElement?.querySelector('.avatar-initial') as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <span
            className="w-full h-full flex items-center justify-center bg-gray-700 text-white text-base font-bold avatar-initial"
            style={{ display: profileAvatar ? 'none' : 'flex' }}
          >
            U
          </span>
        </div>

        {/* Comment input with send button */}
        <div className="flex-1 flex items-center bg-[#1E293B] border border-gray-600 rounded-full overflow-hidden">
          <input
            type="text"
            className="flex-1 bg-transparent px-3 py-1.5 text-gray-200 focus:outline-none text-sm h-9"
            placeholder="Write a comment…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          />
          <button
            onClick={onSubmit}
            disabled={!commentText.trim()}
            className={`px-3 h-9 flex items-center justify-center ${commentText.trim()
                ? 'bg-[#D85D27] text-white hover:bg-[#C24F20]'
                : 'text-gray-500 cursor-not-allowed'
              } transition-colors text-sm`}
          >
            Send
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="mt-3 ml-2 pl-2 border-l-2 border-gray-700">
        {isLoading && <div className="text-gray-300 text-sm py-2">Loading comments…</div>}
        {error && <div className="text-red-400 text-sm py-2">Failed to load comments</div>}
        {!isLoading && !error && (
          <div className="space-y-3">
            {comments.length === 0 ? (
              <div className="text-gray-400 text-xs py-1">No comments yet</div>
            ) : (
              comments.map((c: any, idx: number) => {
                const commentId = String(c._id || c.id || idx);
                const commentAuthorId = String(c.authorId || c.author?.id || "");
                const canManageComment = Boolean(canModerate || (currentUserId && commentAuthorId === currentUserId));

                return (
                <div key={commentId} className="group flex items-start gap-2 p-1.5 hover:bg-gray-800/30 rounded transition-colors">
                  <div className="w-7 h-7 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {(c.authorProfilePhotoUrl || c.author?.photoUrlDecrypted || c.author?.avatarUrl) ? (
                      <img
                        src={c.authorProfilePhotoUrl || c.author?.photoUrlDecrypted || c.author?.avatarUrl}
                        alt={(c.authorName || c.author?.name || 'User')}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-white">
                        {String(c.authorName || c.author?.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white">{c.authorName || c.author?.name || 'User'}</span>
                        <span className="text-[10px] text-gray-400">
                          {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      {canManageComment ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit({ ...c, _id: commentId })}
                            className="rounded-full border border-[#D85D27] px-3 py-1 text-[11px] font-medium text-[#D85D27] hover:bg-[#D85D27] hover:text-white transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(commentId)}
                            className="rounded-full border border-red-500 px-3 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingReportComment({ id: commentId, authorId: commentAuthorId || undefined })}
                          className="rounded-full border border-amber-500 px-3 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
                        >
                          Report
                        </button>
                      )}
                    </div>
                    {editingCommentId === commentId ? (
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          value={editedCommentText}
                          onChange={(e) => setEditedCommentText(e.target.value)}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-200 mt-0.5 break-words">{c.text}</div>
                    )}
                  </div>
                </div>
              )})
            )}
          </div>
        )}
      </div>
      
      {/* Comment Delete Confirmation Modal */}
      {deleteConfirmComment !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-xl shadow-xl">
            <div className="p-5 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Delete comment?</h2>
                <p className="mt-1 text-sm text-gray-300">
                  Are you sure you want to delete this comment? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmComment(null)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-200 bg-gray-700 hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteComment}
                  className="px-4 py-2 rounded-lg text-sm text-white bg-[#D85D27] hover:bg-[#C24F20]"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ReportDialog
        isOpen={pendingReportComment !== null}
        onClose={() => setPendingReportComment(null)}
        onConfirm={confirmReportComment}
        isSubmitting={isReportingComment}
        contentLabel="comment"
      />
    </div>
  );
};

// Media grid rendering function aligned with ProfessionalFeedPost sizing
const renderMediaGrid = (
  items: Array<{ url: string; type: "image" | "video" }>,
  compact = false,
) => {
  const list = items.filter((m) => !!m?.url);
  const count = list.length;
  if (count === 0) return null;

  const pairHeightClass = compact ? "h-44 md:h-56" : "h-72 md:h-96";
  const multiHeightClass = compact ? "h-44 md:h-56" : "h-72 md:h-96";

  const renderTile = (item: { url: string; type: "image" | "video" }, className: string, onClick: () => void) => (
    <div className={`relative overflow-hidden bg-gray-800 ${className}`}>
      {item.type === "video" ? (
        <video src={item.url} className="w-full h-full object-cover" />
      ) : (
        <img src={item.url} alt="Post media" className="w-full h-full object-cover cursor-pointer" loading="lazy" onClick={onClick} />
      )}
    </div>
  );

  const openPreview = (index: number) => {
    // Simple preview - you can enhance this later
    window.open(list[index].url, '_blank');
  };

  if (count === 1) {
    const m = list[0];
    return (
      <div className="mb-3 rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
        {m.type === "video" ? (
          <div className="relative pt-[56.25%] h-0">
            <video src={m.url} controls className="absolute top-0 left-0 w-full h-full object-cover" />
          </div>
        ) : (
          <div className="flex items-center justify-center max-h-[500px] overflow-hidden">
            <img src={m.url} alt="Post media" className="w-full h-auto max-h-[500px] object-contain cursor-pointer" loading="lazy" onClick={() => openPreview(0)} />
          </div>
        )}
      </div>
    );
  }
  if (count === 2) {
    return (
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
        <div className={`${pairHeightClass} min-h-0`}>{renderTile(list[0], "w-full h-full", () => openPreview(0))}</div>
        <div className={`${pairHeightClass} min-h-0`}>{renderTile(list[1], "w-full h-full", () => openPreview(1))}</div>
      </div>
    );
  }
  // 3 or more -> always show 3 tiles: big left + two stacked right
  const extra = count - 3;
  return (
    <div className={`mb-3 ${multiHeightClass} grid grid-cols-3 gap-1 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 min-h-0`}>
      <div className="col-span-2 h-full min-h-0">
        {renderTile(list[0], "w-full h-full", () => openPreview(0))}
      </div>
      <div className="col-span-1 grid grid-rows-2 gap-1 h-full min-h-0">
        <div className="h-full min-h-0">{renderTile(list[1], "w-full h-full", () => openPreview(1))}</div>
        <div className="relative h-full min-h-0">
          {renderTile(list[2], "w-full h-full", () => openPreview(2))}
          {extra > 0 && (
            <button
              type="button"
              className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-2xl font-semibold"
              onClick={() => openPreview(3)}
            >
              +{extra}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const renderGroupRepostPreview = (post: TransformedFeedPost) => {
  const source = post.originalPost;
  if (!source) return null;

  return (
    <div className="mt-3 rounded-lg border border-gray-700 bg-[#0f1419] p-3">
      <div className="mb-2 flex items-start gap-2">
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-600">
          <img src={source.authorAvatar} alt={source.authorName} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white">{source.authorName}</div>
          <div className="text-[10px] text-gray-500">
            {new Date(source.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>
      </div>
      {source.text ? (
        <div className="mb-2 whitespace-pre-wrap break-words text-[13px] text-gray-300">{source.text}</div>
      ) : null}
      {source.media && source.media.length > 0 ? (
        <div className="overflow-hidden rounded-lg">
          {renderMediaGrid(source.media, true)}
        </div>
      ) : null}
    </div>
  );
};

const GroupDetailPage: React.FC = () => {
  const { id = "1" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminView = location.pathname.startsWith("/admin/groups") || location.state?.fromAdmin;
  const initialStatus: 'none' | 'pending' | 'requested' | 'joined' | 'rejected' = 'none';
  const adminStatus = location.state?.groupStatus as
    | "approved"
    | "requested"
    | "rejected"
    | undefined;
  const mappedAdminStatus: 'none' | 'pending' | 'requested' | 'joined' | 'rejected' = adminStatus
    ? adminStatus === "approved"
      ? "joined"
      : adminStatus === "requested"
      ? "pending"
      : "rejected"
    : initialStatus;

  const [groupStatus, setGroupStatus] = useState<'none' | 'pending' | 'requested' | 'joined' | 'rejected'>(mappedAdminStatus);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isEditPostOpen, setIsEditPostOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<TransformedFeedPost | null>(null);
  const [adminConfirmState, setAdminConfirmState] = useState<{
    open: boolean;
    action: "accept" | "reject" | "block" | null;
  }>({ open: false, action: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [triggerSearch, { data: searchResults, isFetching: isSearching }] = useLazyConnectionsSearchDirectoryQuery();
  
  // Comment state
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [commentsRefreshTick, setCommentsRefreshTick] = useState(0);
  
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<string | null>(null);
  const [pendingReportPostId, setPendingReportPostId] = useState<string | number | null>(null);
  const [isReportingPost, setIsReportingPost] = useState(false);
  const [openRepostFor, setOpenRepostFor] = useState<string | null>(null);
  const [repostPopoverPos, setRepostPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isRepostModalOpen, setIsRepostModalOpen] = useState(false);
  const [repostSourcePostId, setRepostSourcePostId] = useState<string | null>(null);
  const [savedOverrides, setSavedOverrides] = useState<Record<string, boolean>>({});
  
  // const [commentTexts, setCommentTexts] = useState<Record<string, string>>({}); // Removed as unused
  const { showToast } = useToast();
  
  // Tab state type that includes all possible tabs
  type TabType = "Feed" | "Members" | "About" | "Requests" | "My Invites";
  const [activeTab, setActiveTab] = useState<TabType>("Feed");

  const { data: groupData, isLoading, error } = useGetGroupQuery(id);
  
  // Get current user profile
  const { data: userData } = useMeQuery();
  
  // Get user data from Redux store (alternative source)
  const storeUser = useAppSelector((s) => s.auth.user);
  
  
  // Get user avatar with multiple fallback options
  const getUserAvatar = () => {
    // Try Redux store first
    if (storeUser?.basicInfo?.profilePhotoUrl) return storeUser.basicInfo.profilePhotoUrl;
    if (storeUser?.basicInfo?.avatar) return storeUser.basicInfo.avatar;
    if (storeUser?.basicInfo?.photo) return storeUser.basicInfo.photo;
    
    // Try API data
    if (userData?.data?.basicInfo?.profilePhotoUrl) return userData.data.basicInfo.profilePhotoUrl;
    if (userData?.data?.basicInfo?.avatar) return userData.data.basicInfo.avatar;
    if (userData?.data?.basicInfo?.photo) return userData.data.basicInfo.photo;
    
    return undefined;
  };
  
  const userAvatar = getUserAvatar();
  const currentUserId = String(
    storeUser?._id ||
    (storeUser as any)?.userId ||
    (storeUser as any)?.id ||
    userData?.data?._id ||
    (userData?.data as any)?.id ||
    "",
  );
  
  // Get group members
  const { data: membersData, isLoading: isLoadingMembers, refetch: refetchMembers } = useListGroupMembersQuery({
    groupId: id,
    page: 1,
    limit: 20,
  });

  // Get group feed posts
  const { data: feedData, isLoading: isLoadingFeed, error: feedError, refetch: refetchGroupFeed } = useGetGroupFeedQuery({
    groupId: id,
    page: 1,
    limit: 10,
  });

  // Mutations for feed actions
  const [createGroupPost] = useCreateGroupPostMutation();
  const [updateGroupPost] = useUpdateGroupPostMutation();
  const [deleteGroupPost] = useDeleteGroupPostMutation();
  const [getPresignedUrls] = useGetGroupFeedPresignUrlBatchMutation();
  const [handleJoinRequest] = useHandleJoinRequestMutation();
  const [cancelInvite] = useCancelInviteMutation();
  const [repostGroupPost] = useRepostGroupPostMutation();
  const [leaveGroup] = useLeaveGroupMutation();
  const [deleteGroup] = useDeleteGroupMutationHook();
  const [reportContent] = useReportContentMutation();
  const [blockUser] = useBlockUserMutation();
  
  // Handle delete group
  const handleDeleteGroup = async () => {
    if (!id || !group) return;
    
    try {
      await deleteGroup(id).unwrap();
      showToast({
        title: "Group deleted",
        description: "The group has been successfully deleted.",
        kind: "success"
      });
      // Navigate back to groups page after deletion
      navigate('/groups');
    } catch (error: any) {
      showToast({
        title: "Error",
        description: error?.data?.message || "Failed to delete group",
        kind: "error"
      });
    }
  };
  
  // Comment mutations
  const [addComment] = useAddGroupPostCommentMutation();
  const [likePost] = useLikeGroupPostMutation();
  const [unlikePost] = useUnlikeGroupPostMutation();
  const [saveGroupPost] = useSaveGroupPostMutation();
  const [unsaveGroupPost] = useUnsaveGroupPostMutation();

  const confirmReportPost = async (reason: ModerationReason, details: string) => {
    if (!pendingReportPostId) return;
    const postId = pendingReportPostId;
    const post = transformedFeedPosts.find((item) => String(item.id) === String(postId));
    try {
      setIsReportingPost(true);
      await reportContent({
        contentType: "GROUP_POST",
        contentId: String(postId),
        contextId: id,
        targetUserId: post?.authorUserId,
        reason,
        details: details || undefined,
      }).unwrap();
      showToast({
        title: "Post reported",
        description: "This post is hidden from your group feed.",
        kind: "success",
      });
      setPendingReportPostId(null);
      refetchGroupFeed();
    } catch {
      showToast({
        title: "Failed to report post",
        description: "Please try again.",
        kind: "error",
      });
    } finally {
      setIsReportingPost(false);
    }
  };

  const handleBlockAuthor = async (authorUserId: string, postId: string | number) => {
    try {
      await blockUser({
        userId: authorUserId,
        reason: "HARASSMENT",
        sourceContentType: "GROUP_POST",
        sourceContentId: String(postId),
      }).unwrap();
      showToast({
        title: "Member blocked",
        description: "Their content is hidden from your feed.",
        kind: "success",
      });
      refetchGroupFeed();
    } catch {
      showToast({
        title: "Failed to block member",
        description: "Please try again.",
        kind: "error",
      });
    }
  };
  
  // Handle leave group
  const handleLeaveGroup = async () => {
    if (!id) return;
    
    try {
      await leaveGroup(id).unwrap();
      showToast({
        title: "Success",
        description: "You have left the group successfully",
        kind: "success"
      });
      // Navigate back to groups page after leaving
      navigate('/groups');
    } catch (error: any) {
      showToast({
        title: "Error",
        description: error?.data?.message || "Failed to leave group",
        kind: "error"
      });
    }
  };
  
  // Transform API data to match component expectations
  const group = useMemo(() => {
    if (!groupData?.data) return null;
    
    const apiGroup = groupData.data;
    
    // Determine group status based on API status and approvalStatus
    let groupStatus: 'none' | 'pending' | 'requested' | 'joined' | 'rejected';
    
    if ((apiGroup as any).membership?.role) {
      // User has a membership (owner/admin/member) — always treat as joined
      groupStatus = 'joined';
    } else if (apiGroup.status === "REJECTED" || apiGroup.approvalStatus === "REJECTED") {
      groupStatus = 'rejected';
    } else if (apiGroup.status === "PENDING_APPROVAL" && apiGroup.approvalStatus === "PENDING") {
      groupStatus = 'pending';
    } else if (apiGroup.status === "APPROVED" && apiGroup.approvalStatus === "APPROVED") {
      groupStatus = 'none';
    } else {
      groupStatus = 'none';
    }
    
    return {
      id: apiGroup.id,
      title: apiGroup.name || 'Untitled Group',
      description: apiGroup.description,
      cover: apiGroup.coverImageUrl,
      avatar: apiGroup.coverImageUrl,
      isPrivate: apiGroup.privacy === "PRIVATE",
      members: apiGroup.memberCount,
      status: groupStatus,
      role: (apiGroup as any).membership?.role,
      apiStatus: apiGroup.status,
      apiApprovalStatus: apiGroup.approvalStatus,
      canJoin: apiGroup.canJoin,
      canRequestJoin: apiGroup.canRequestJoin,
    };
  }, [groupData]);

  const canModeratePosts = Boolean(group?.role === 'OWNER' || group?.role === 'ADMIN');


  // Get group join requests (only for admins) - moved after group initialization
  const { data: requestsData, isLoading: isLoadingRequests, refetch: refetchRequests } = useListPendingRequestsQuery({
    groupId: id,
    page: 1,
    limit: 20,
  }, {
    // Skip the query if user is not an admin or owner
    skip: !(group?.role === 'OWNER' || group?.role === 'ADMIN')
  });

  const { data: groupInvitesData, isLoading: isLoadingGroupInvites, refetch: refetchGroupInvites } = useListGroupInvitesQuery({
    groupId: id,
    page: 1,
    limit: 20,
  }, {
    skip: !(group?.role === 'OWNER' || group?.role === 'ADMIN')
  });

  const groupInvites = (groupInvitesData?.items || groupInvitesData?.data || []).filter(
    (invite: any) => String(invite.status).toUpperCase() !== 'ACCEPTED'
  );

  // Get filtered tabs based on status, group type, and admin view
  const filteredTabs = useMemo(() => getFilteredTabs(groupStatus, id, isAdminView, group?.isPrivate || false, group?.role === 'OWNER' || group?.role === 'ADMIN'), [groupStatus, id, isAdminView, group?.isPrivate, group?.role]);

  // Transform members API data to match component expectations
  const [transformedMembers, setTransformedMembers] = useState<Array<{
    id: string | number;
    name: string;
    company: string;
    role: string;
    avatarUrl: string;
    status: 'connected' | 'sent' | 'received';
    connectionCount: number;
    isAdmin: boolean;
  }>>([]);

  // Update transformedMembers when membersData changes
  useEffect(() => {
    if (membersData?.items) {
      setTransformedMembers(
        membersData.items.map((member: any) => ({
          id: member.id,
          name: member.user?.name || 'Unknown User',
          company: member.user?.company || "Not specified",
          role: member.user?.professionalRole || "Member",
          avatarUrl: member.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user?.name || 'Unknown')}&background=111823&color=fff&size=200`,
          status: 'connected',
          connectionCount: 0,
          isAdmin: member.role === 'OWNER',
        }))
      );
    }
  }, [membersData]);

  // Remove this duplicate mapping since we're now using state
  // const transformedMembers = useMemo(() => {
  //   if (!membersData?.items) return [];
    
  //   console.log('Members data:', membersData.items); // Debug log
    
  //   return membersData.items.map((member: any) => ({
  //   }));
  // }, [membersData]);

  // Transform feed API data to match component expectations
  const transformedFeedPosts = useMemo((): TransformedFeedPost[] => {
    if (!feedData?.items) return [];

    return feedData.items.map((post): TransformedFeedPost => {
      const text = post.text || '';
      const authorName = post.author?.name || 'Unknown Author';

      return {
        id: post.id,
        authorUserId: post.authorUserId || post.author?.id,
        body: text,
        authorName,
        authorAvatar:
          post.author?.photoUrlDecrypted ||
          post.author?.photoUrl ||
          post.author?.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=111823&color=fff&size=200`,
        authorTitle: undefined,
        createdAt: post.createdAt,
        shareUrl: post.shareUrl,
        imageUrl: post.media && post.media.length > 0 ? post.media[0].url : undefined,
        media: (post.media || []).map((item) => ({
          url: item.url,
          type: item.type,
        })),
        likes: post.stats?.likes || 0,
        reposts: post.stats?.reposts || 0,
        comments: post.commentsCount || post.stats?.comments || 0,
        isLiked: Boolean((post as any).youLiked ?? post.meta?.liked ?? post.isLiked),
        isSaved: Boolean((post as any).youSaved ?? post.meta?.saved ?? post.isSaved),
        isOwner: Boolean(post.meta?.canEdit),
        isRepost: !!post.isRepost,
        originalPost: post.originalPost
          ? {
              id: post.originalPost.id,
              text: post.originalPost.text || '',
              media: (post.originalPost.media || []).map((item) => ({
                url: item.url,
                type: item.type,
              })),
              authorName: post.originalPost.author?.name || 'Unknown Author',
              authorAvatar:
                post.originalPost.author?.photoUrlDecrypted ||
                post.originalPost.author?.photoUrl ||
                post.originalPost.author?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(post.originalPost.author?.name || 'Unknown')}&background=111823&color=fff&size=200`,
              createdAt: post.originalPost.createdAt,
              shareUrl: post.originalPost.shareUrl,
            }
          : null,
      };
    });
  }, [feedData]);

  useEffect(() => {
    setSavedOverrides({});
  }, [feedData]);
  
  // Check if coming from suggestions page

  // Update groupStatus when the group changes for non-admin views only
  React.useEffect(() => {
    if (!isAdminView && group) {
      setGroupStatus(group.status as "requested" | "none" | "pending" | "rejected" | "joined");
    }
  }, [group, isAdminView]);

  const handleInvite = useCallback(() => {
    // Only allow owners or admins to invite members
    if (!group || (group.role !== 'OWNER' && group.role !== 'ADMIN')) {
      showToast({
        title: 'Access Denied',
        description: 'Only group owners or admins can invite members.',
        kind: 'error'
      });
      return;
    }
    
    // Fetch connections when opening the modal
    triggerSearch({ q: "" });
    setSelectedMembers(new Set());
    setSearchQuery("");
    setIsInviteModalOpen(true);
  }, [triggerSearch, group, showToast]);

  const [inviteUser] = useInviteUserMutation();

  const handleSelectMember = useCallback((memberId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  }, []);


  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    triggerSearch({ q: query });
  }, [triggerSearch]);

  const handleInviteSubmit = useCallback(async () => {
    if (selectedMembers.size === 0) {
      showToast({ 
        title: 'No Members Selected', 
        description: 'Please select at least one member to invite.',
        kind: 'error' 
      });
      return;
    }

    try {
      // Convert Set to array of member IDs
      const memberIds = Array.from(selectedMembers);
      
      // Call invite API for each member
      const results = await Promise.all(
        memberIds.map(memberId => 
          inviteUser({
            groupId: id,
            invitedUserId: memberId, // Changed from email to invitedUserId
            message: `You've been invited to join the group "${group?.title}"`
          }).unwrap()
        )
      );

      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        showToast({ 
          title: 'Success', 
          description: `Invitation${successCount > 1 ? 's' : ''} sent successfully to ${successCount} member${successCount > 1 ? 's' : ''}!`, 
          kind: 'success' 
        });
        setIsInviteModalOpen(false);
        setSelectedMembers(new Set());
        
        // Refresh members list after successful invite
        if (refetchMembers) {
          await refetchMembers();
        }
        if (refetchGroupInvites) {
          await refetchGroupInvites();
        }
      } else {
        throw new Error('Failed to send invitations');
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      showToast({ 
        title: 'Error', 
        description: 'An error occurred while sending the invitations. Please try again.', 
        kind: 'error' 
      });
    }
  }, [selectedMembers, id, group?.title, inviteUser, showToast, refetchMembers, refetchGroupInvites]);

  const handleCreatePost = async (content: string, files?: File[]) => {
    try {
      if (repostSourcePostId) {
        await repostGroupPost({
          groupId: id,
          postId: repostSourcePostId,
          text: content.trim() || undefined,
        }).unwrap();
        showToast({
          title: "Reposted",
          description: "Post reposted successfully.",
          kind: "success",
        });
        setRepostSourcePostId(null);
        setIsRepostModalOpen(false);
        return;
      }

      // Validate that we have either content or files
      if (!content.trim() && (!files || files.length === 0)) {
        throw new Error('Post must have either text or media content');
      }

      let media: { url: string; type: "image" | "video" }[] | undefined = undefined;

      // Upload files if provided
      if (files && files.length > 0) {
        // Create an adapter function to convert the API response to the expected format
        const getPresignedUrlsAdapter = async (params: PresignedUrlParams) => {
          try {
            const response = await getPresignedUrls({ groupId: id, data: params }).unwrap();
            // Handle different response structures
            const responseData = response.data || response;
            const filesArray = Array.isArray(responseData) ? responseData : ((responseData as any)?.files || []);
            
            // Transform the response to match the expected PresignedUrlResponse format
            return {
              success: response.success,
              data: {
                files: filesArray.map((item: any) => ({
                  uploadUrl: item.uploadUrl,
                  url: item.url,
                  key: item.key,
                  fileName: item.fileName || '',
                  expiresIn: item.expiresIn || item.expiresIn
                }))
              }
            };
          } catch (error: any) {
            console.error('Error getting presigned URLs:', error);
            // Re-throw with more descriptive error
            throw new Error(error?.data?.message || 'Failed to get upload permissions. Please try again.');
          }
        };

        const uploadedFiles = await uploadFiles(files, getPresignedUrlsAdapter);
        
        media = uploadedFiles.map((file: UploadedFile) => ({
          url: file.url,
          type: file.type
        }));
      }

      // Handle regular post creation
      await createGroupPost({
        groupId: id,
        data: {
          text: content.trim(),
          media,
        },
      }).unwrap();
      showToast({
        title: "Posted!",
        description: "Your post has been published to the group.",
        kind: "success",
      });
      
      setIsCreatePostOpen(false);
      // The feed will automatically refresh due to RTK Query cache invalidation
    } catch (error: any) {
      console.error("Failed to create post:", error);
      // Re-throw the error to be handled by the modal
      throw new Error(error.message || 'Failed to create post');
    }
  };

  const handleRepost = (postId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = (e?.currentTarget as HTMLElement) || null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const popWidth = 320;
      const estHeight = 160;
      const padding = 16;
      const gap = 8;
      const maxLeft = Math.max(0, window.innerWidth - popWidth - padding);
      const x = Math.min(Math.max(rect.left, padding), maxLeft);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      let y: number;
      if (spaceBelow >= estHeight + gap) {
        y = rect.bottom + gap;
      } else if (spaceAbove >= estHeight + gap) {
        y = Math.max(padding, rect.top - estHeight - gap);
      } else {
        y = Math.max(padding, Math.min(rect.bottom + gap, window.innerHeight - estHeight - padding));
      }
      setRepostPopoverPos({ x, y });
    }
    setOpenRepostFor((prev) => (prev === postId ? null : postId));
  };

  const handleRepostAction = async (postId: string, withThoughts: boolean) => {
    if (withThoughts) {
      setRepostSourcePostId(postId);
      setIsRepostModalOpen(true);
      setOpenRepostFor(null);
      setRepostPopoverPos(null);
      return;
    }

    try {
      await repostGroupPost({ groupId: id, postId }).unwrap();
      setOpenRepostFor(null);
      setRepostPopoverPos(null);
      showToast({
        title: "Reposted",
        description: "Post reposted successfully.",
        kind: "success",
      });
    } catch (error) {
      console.error("Failed to repost:", error);
      showToast({
        title: "Failed to repost",
        description: "Please try again.",
        kind: "error",
      });
    }
  };

  const handleOpenComments = (postId: string) => {
    setOpenCommentsFor((prev) => (prev === postId ? null : postId));
    setCommentTexts(prev => ({
      ...prev,
      [String(postId)]: ""
    }));
  };

  const handleCommentTextChange = (postId: string, text: string) => {
    setCommentTexts(prev => ({
      ...prev,
      [String(postId)]: text
    }));
  };

  const handleCommentSubmit = async (postId: string) => {
    const commentText = commentTexts[String(postId)] || "";
    if (!commentText.trim()) return;

    try {
      await addComment({ groupId: id, postId: String(postId), text: commentText.trim() }).unwrap();
      setCommentTexts(prev => ({
        ...prev,
        [String(postId)]: ""
      }));
      // Force comments query to refetch by updating refresh token
      setCommentsRefreshTick(v => v + 1);
      showToast({
        title: "Comment posted",
        description: "Your comment has been added.",
        kind: "success"
      });
    } catch (e) {
      console.error("Failed to add comment", e);
      showToast({
        title: "Failed to add comment",
        description: "Please try again.",
        kind: "error"
      });
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      await likePost({ groupId: id, postId: String(postId) }).unwrap();
      showToast({ title: "Liked", description: "Post liked successfully.", kind: "success" });
    } catch (e) {
      console.error("Failed to like post", e);
      showToast({ title: "Failed to like post", description: "Please try again.", kind: "error" });
    }
  };

  const handleUnlikePost = async (postId: string) => {
    try {
      await unlikePost({ groupId: id, postId: String(postId) }).unwrap();
      showToast({ title: "Unliked", description: "Post unliked successfully.", kind: "success" });
    } catch (e) {
      console.error("Failed to unlike post", e);
      showToast({ title: "Failed to unlike post", description: "Please try again.", kind: "error" });
    }
  };

  const handleShare = async (postId: string) => {
    try {
      const post = transformedFeedPosts.find((item) => String(item.id) === String(postId));
      const sharePath = post?.shareUrl || `/groups/post/${postId}`;
      const url = sharePath.startsWith('http') ? sharePath : `${window.location.origin}${sharePath}`;
      const title = "Ekam Post";
      const text = "Check out this post";

      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showToast({
          title: "Link copied",
          description: "Post link copied to clipboard.",
          kind: "success",
        });
      } else {
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        showToast({
          title: "Link copied",
          description: "Post link copied to clipboard.",
          kind: "success",
        });
      }
    } catch (error) {
      console.error("Failed to share post", error);
      showToast({
        title: "Failed to share",
        description: "Please try again.",
        kind: "error",
      });
    }
  };

  const handleSavePost = async (postId: string) => {
    const post = transformedFeedPosts.find((item) => String(item.id) === String(postId));
    const isSaved = savedOverrides[String(postId)] ?? Boolean(post?.isSaved);

    try {
      setSavedOverrides((prev) => ({ ...prev, [String(postId)]: !isSaved }));

      if (isSaved) {
        await unsaveGroupPost({ groupId: id, postId: String(postId) }).unwrap();
        showToast({ title: "Post unsaved", description: "Removed from saved posts.", kind: "success" });
      } else {
        await saveGroupPost({ groupId: id, postId: String(postId) }).unwrap();
        showToast({ title: "Post saved", description: "Added to saved posts.", kind: "success" });
      }
    } catch (error) {
      console.error("Failed to toggle save", error);
      setSavedOverrides((prev) => ({ ...prev, [String(postId)]: isSaved }));
      showToast({
        title: isSaved ? "Failed to unsave post" : "Failed to save post",
        description: "Please try again.",
        kind: "error",
      });
    }
  };

  // Post management handlers for Owner
  const handleEditPost = (postId: string) => {
    const post = transformedFeedPosts.find((item) => String(item.id) === String(postId));
    if (!post) {
      showToast({ title: "Post not found", description: "Unable to load this post for editing.", kind: "error" });
      return;
    }

    setEditingPost(post);
    setIsEditPostOpen(true);
  };

  const handleUpdatePost = async (
    content: string,
    media?: Array<File | { key?: string; url?: string; type?: "image" | "video" }>,
  ) => {
    if (!editingPost) return;

    try {
      const existingMedia = (media || []).filter(
        (item): item is { key?: string; url?: string; type?: "image" | "video" } => !(item instanceof File),
      );
      const newFiles = (media || []).filter((item): item is File => item instanceof File);

      let uploadedMedia: { url: string; type: "image" | "video" }[] = [];

      if (newFiles.length > 0) {
        const getPresignedUrlsAdapter = async (params: PresignedUrlParams) => {
          try {
            const response = await getPresignedUrls({ groupId: id, data: params }).unwrap();
            const responseData = response.data || response;
            const filesArray = Array.isArray(responseData) ? responseData : ((responseData as any)?.files || []);

            return {
              success: response.success,
              data: {
                files: filesArray.map((item: any) => ({
                  uploadUrl: item.uploadUrl,
                  url: item.url,
                  key: item.key,
                  fileName: item.fileName || '',
                  expiresIn: item.expiresIn || item.expiresIn,
                })),
              },
            };
          } catch (error: any) {
            console.error('Error getting presigned URLs:', error);
            throw new Error(error?.data?.message || 'Failed to get upload permissions. Please try again.');
          }
        };

        const uploadedFiles = await uploadFiles(newFiles, getPresignedUrlsAdapter);
        uploadedMedia = uploadedFiles.map((file: UploadedFile) => ({
          url: file.url,
          type: file.type,
        }));
      }

      await updateGroupPost({
        groupId: id,
        postId: editingPost.id,
        data: {
          text: content.trim(),
          media: [
            ...existingMedia.map((item) => ({
              url: item.url || item.key || '',
              type: item.type || 'image',
            })),
            ...uploadedMedia,
          ].filter((item) => item.url),
        },
      }).unwrap();

      showToast({ title: "Post updated", description: "Your post has been updated successfully.", kind: "success" });
      setIsEditPostOpen(false);
      setEditingPost(null);
    } catch (error: any) {
      console.error('Failed to update post:', error);
      throw new Error(error?.data?.message || error?.message || 'Failed to update post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    setDeleteConfirmPost(postId);
  };

  const confirmDeletePost = async () => {
    if (!deleteConfirmPost) return;
    
    try {
      await deleteGroupPost({ groupId: id, postId: deleteConfirmPost }).unwrap();
      showToast({ title: "Post Deleted", description: "Post has been deleted successfully.", kind: "success" });
      setDeleteConfirmPost(null);
    } catch (e) {
      console.error("Failed to delete post", e);
      showToast({ title: "Failed to delete post", description: "Please try again.", kind: "error" });
    }
  };

  const handleRemoveMember = useCallback(async (memberId: string | number) => {
    if (!window.confirm('Are you sure you want to remove this member from the group?')) {
      return;
    }
    
    try {
      // Call your API to remove the member
      // await groupsApi.removeGroupMember(groupId, memberId);
      
      // Update the local state to remove the member
      setTransformedMembers((prev: Array<{
        id: string | number;
        name: string;
        company: string;
        role: string;
        avatarUrl: string;
        status: 'connected' | 'sent' | 'received';
        connectionCount: number;
        isAdmin: boolean;
      }>) => prev.filter((member: { id: string | number }) => member.id !== memberId));
      
      showToast({
        title: 'Success',
        description: 'Member removed successfully',
        kind: 'success'
      });
    } catch (error) {
      console.error('Error removing member:', error);
      showToast({
        title: 'Error',
        description: 'Failed to remove member',
        kind: 'error'
      });
    }
  }, [id, showToast]);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await handleJoinRequest({
        groupId: id,
        requestId,
        action: "approve"
      }).unwrap();
      
      showToast({
        title: "Request accepted",
        description: "Member request has been approved.",
        kind: "success"
      });
      
      // Refresh requests list and members list
      refetchRequests();
      refetchMembers();
    } catch (error) {
      console.error("Failed to accept request", error);
      showToast({
        title: "Failed to accept request",
        description: "Please try again.",
        kind: "error"
      });
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await handleJoinRequest({
        groupId: id,
        requestId,
        action: "reject"
      }).unwrap();
      
      showToast({
        title: "Request declined",
        description: "Member request has been declined.",
        kind: "success"
      });
      
      // Refresh requests list
      refetchRequests();
    } catch (error) {
      console.error("Failed to decline request", error);
      showToast({
        title: "Failed to decline request",
        description: "Please try again.",
        kind: "error"
      });
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelInvite({
        groupId: id,
        inviteId,
      }).unwrap();

      showToast({
        title: "Invite cancelled",
        description: "The pending group invite has been cancelled.",
        kind: "success"
      });

      refetchGroupInvites();
    } catch (error) {
      console.error("Failed to cancel invite", error);
      showToast({
        title: "Failed to cancel invite",
        description: "Please try again.",
        kind: "error"
      });
    }
  };

  const breadcrumbs = useMemo(() => [
    { label: "Groups", onClick: () => window.history.back() },
    { label: group?.title || "Group Details" }
  ], [group?.title]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={breadcrumbs} />
        <div className="text-center py-20">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-800 rounded-xl mb-4 mx-auto max-w-4xl"></div>
            <div className="flex items-center gap-4 mb-6 justify-center">
              <div className="w-24 h-24 bg-gray-800 rounded-xl"></div>
              <div className="flex-1 max-w-md">
                <div className="h-8 bg-gray-800 rounded mb-2"></div>
                <div className="h-4 bg-gray-800 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={breadcrumbs} />
        <div className="text-center py-20">
          <div className="text-gray-400 text-lg">
            {error ? "Failed to load group details. Please try again." : "Group not found"}
          </div>
          <button 
            className="mt-4 px-4 py-2 rounded-full border border-orange-600 text-white hover:bg-orange-600/10"
            onClick={() => window.history.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }


  const isGroupJoined = groupStatus === 'joined' || group?.status === 'joined';
  const shouldShowJoinPrompt = !isGroupJoined && groupStatus !== 'rejected' && group?.status !== 'rejected';
  const isGroupPendingApproval = group?.apiStatus === 'PENDING_APPROVAL' || group?.apiApprovalStatus === 'PENDING';

  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={breadcrumbs} />
      {/* Cover Image */}
      <div className="h-64 bg-gray-800/60 rounded-xl overflow-hidden relative">
        {group?.cover ? (
          <>
            <img
              src={group.cover}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-105 object-cover opacity-45 blur-md"
            />
            <div className="absolute inset-0 bg-black/20" />
            <img
              src={group.cover}
              alt={group?.title}
              className="relative z-10 mx-auto h-full max-w-full object-contain"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800">
            <div className="w-24 h-24 rounded-full bg-gray-900/30 flex items-center justify-center">
              <span className="text-gray-100 text-4xl font-bold">
                {group?.title?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Profile Image - Overlapping with cover */}
      <div className="relative -mt-22 ml-6">
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-700 border-2 border-[#111823]">
          {group?.avatar && group.avatar.trim() !== '' ? (
            <img src={group.avatar} alt={group?.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800">
              <div className="w-16 h-16 rounded-full bg-gray-900/30 flex items-center justify-center">
                <span className="text-gray-100 text-2xl font-bold">
                  {group?.title?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Group Details */}
      <div className="px-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-white text-2xl font-semibold">{group?.title}</h1>
            <p className="text-gray-400 text-sm mt-2 max-w-3xl">
              {renderDescription(group?.description)}
            </p>
                        <div className="flex items-center gap-2 text-base text-gray-400 mt-1">
              <img 
                src={group?.isPrivate ? lockIcon : publicIcon} 
                alt={group?.isPrivate ? "Private" : "Public"} 
                className="w-4 h-4" 
              />
              <span>{group?.isPrivate ? "Private Group" : "Public Group"}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <img src={GMemIcon} alt="Members" className="w-4 h-4" />
                <span>{group?.members?.toLocaleString() || 0} {(group?.members ?? 0) === 1 ? 'Member' : 'Members'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {group?.role === 'OWNER' && !isAdminView && group?.status !== 'rejected' && (
              <button
                className="px-3 py-2 sm:px-4 rounded-full border border-blue-500 text-blue-400 hover:bg-blue-500/10 transition text-sm sm:text-base whitespace-nowrap"
                onClick={() => navigate(`/groups/${group?.id}/edit`)}
              >
                Edit Group
              </button>
            )}
            {isAdminView ? (
              <>
                {(groupStatus === 'requested' || groupStatus === 'pending') && (
                  <>
                    <button
                      className="px-3 py-2 sm:px-4 rounded-full bg-green-600 text-white hover:bg-green-700 text-sm sm:text-base whitespace-nowrap"
                      onClick={() =>
                        setAdminConfirmState({ open: true, action: "accept" })
                      }
                    >
                      Accept
                    </button>
                    <button
                      className="px-3 py-2 sm:px-4 rounded-full bg-red-600 text-white hover:bg-red-700 text-sm sm:text-base whitespace-nowrap"
                      onClick={() =>
                        setAdminConfirmState({ open: true, action: "reject" })
                      }
                    >
                      Reject
                    </button>
                  </>
                )}
                {groupStatus === 'rejected' && (
                  <button
                    className="px-3 py-2 sm:px-4 rounded-full bg-red-500 text-white hover:bg-red-600 text-sm sm:text-base whitespace-nowrap"
                    onClick={() =>
                      setAdminConfirmState({ open: true, action: "reject" })
                    }
                  >
                    Rejected
                  </button>
                )}
                {groupStatus !== 'rejected' &&
                  groupStatus !== 'requested' &&
                  groupStatus !== 'pending' && (
                    <button
                      className="px-3 py-2 sm:px-4 rounded-full border border-red-500 text-red-400 hover:bg-red-500/10 text-sm sm:text-base whitespace-nowrap"
                      onClick={() =>
                        setAdminConfirmState({ open: true, action: "block" })
                      }
                    >
                      Block
                    </button>
                  )}
              </>
            ) : (
              getActionButtons(groupStatus, handleInvite, handleLeaveGroup, handleDeleteGroup, group?.role === 'OWNER', group?.role === 'ADMIN', group?.apiApprovalStatus === 'APPROVED')
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="px-6">
        <div className="flex flex-nowrap items-center gap-4 sm:gap-8 border-b border-gray-700 overflow-x-auto">
          {filteredTabs.map((t) => (
            <button
              key={t}
              className={`pb-2 text-sm whitespace-nowrap flex-shrink-0 flex items-center gap-2 ${
                activeTab === t ? "text-white border-b-2 border-orange-500" : "text-gray-400"
              }`}
              onClick={() => setActiveTab(t as TabType)}
            >
              {t}
              {t === 'Requests' && requestsData?.items && requestsData.items.length > 0 && (
                <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {requestsData.items.length}
                </span>
              )}
              {t === 'My Invites' && groupInvites.length > 0 && (
                <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {groupInvites.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="px-6 pb-6">
        <div className="text-gray-400 min-h-[300px]">
          {(() => {
            switch (activeTab) {
              case 'Feed':
                return (
                  <div className="mx-auto w-full max-w-3xl space-y-4">
                    {isGroupPendingApproval ? (
                      <div className="rounded-xl bg-[#151a22] border border-gray-800 px-6 py-8 text-center">
                        <div className="text-gray-400 mb-4">
                          <svg className="w-12 h-12 mx-auto mb-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-lg font-medium text-white">This group is pending admin approval</p>
                          <p className="text-sm mt-2">Posting will be available once the group has been approved by an administrator.</p>
                        </div>
                      </div>
                    ) : (groupStatus === 'pending' || groupStatus === 'requested') ? (
                      <div className="rounded-xl bg-[#151a22] border border-gray-800 px-6 py-8 text-center">
                        <div className="text-gray-400 mb-4">
                          <svg className="w-12 h-12 mx-auto mb-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-lg font-medium text-white">Your membership request is pending</p>
                          <p className="text-sm mt-2">Once a group admin approves your request, you'll be able to view and create posts.</p>
                        </div>
                      </div>
                    ) : shouldShowJoinPrompt ? (
                      <div className="rounded-xl bg-[#151a22] border border-gray-800 px-6 py-8 text-center">
                        <div className="text-gray-400 mb-4">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <p className="text-lg font-medium">Join this group to access the feed and create posts</p>
                          <p className="text-sm mt-2">Become a member to see what's happening in this group.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Create a Post Bar - Only show if user is a member */}
                        <div className="mb-6 mt-4">
                          <CreatePostInput
                            userName={storeUser?.name || userData?.data?.name || 'User'}
                            userAvatar={userAvatar}
                            onClick={() => setIsCreatePostOpen(true)}
                          />
                        </div>

                    {/* Posts List */}
                    <div className="w-full space-y-6 pb-6">
                      {isLoadingFeed ? (
                        // Loading skeleton for feed posts
                        Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="rounded-xl bg-[#151a22] border border-gray-800 overflow-hidden animate-pulse">
                            <div className="flex flex-col md:flex-row">
                              <div className="md:w-2/5 w-full bg-black max-h-56 md:max-h-60"></div>
                              <div className="md:w-3/5 w-full p-4 md:p-4.5 space-y-3">
                                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-700 rounded w-full"></div>
                                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : feedError ? (
                        <div className="text-center py-8">
                          <p className="text-gray-400">Failed to load feed posts. Please try again.</p>
                        </div>
                      ) : transformedFeedPosts?.length ? (
                        <div className="space-y-4">
                          {transformedFeedPosts.map((post: TransformedFeedPost) => {
                            const isPostOwner = Boolean(
                              post.isOwner ||
                              (post.authorUserId && currentUserId && String(post.authorUserId) === String(currentUserId))
                            );
                            const isRepost = Boolean(
                              post.originalPost && (
                                post.originalPost.id ||
                                (typeof post.originalPost.text === 'string' && post.originalPost.text.trim().length > 0) ||
                                (Array.isArray(post.originalPost.media) && post.originalPost.media.length > 0) ||
                                post.originalPost.createdAt
                              )
                            );
                            const hasOwnContent = post.body && post.body.trim().length > 0;
                            const attachment = post.originalPost
                              ? {
                                authorName: post.originalPost.authorName,
                                  postDate: formatFeedDate(post.originalPost.createdAt || post.createdAt),
                                  content: post.originalPost.text,
                                  imageUrl: post.originalPost.media?.[0]?.url,
                                  mediaType: post.originalPost.media?.[0]?.type as "image" | "video" | undefined,
                                  media: post.originalPost.media,
                                  avatarUrl: post.originalPost.authorAvatar,
                                }
                              : null;
                            const contextText = isRepost ? `${post.authorName || "Unknown User"} reposted` : undefined;

                            return (
                              <div key={post.id} id={`post-${post.id}`} className="space-y-3">
                                <ProfessionalFeedPost
                                  id={post.id}
                                  authorName={post.authorName}
                                  authorTitle={post.authorTitle}
                                  postDate={formatFeedDate(post.createdAt)}
                                  content={post.body}
                                  imageUrl={!isRepost ? post.imageUrl : undefined}
                                  mediaType={!isRepost ? (post.media?.[0]?.type as "image" | "video" | undefined) : undefined}
                                  media={!isRepost ? post.media : undefined}
                                  avatarUrl={post.authorAvatar}
                                  initialLikes={post.likes}
                                  initialComments={post.comments}
                                  repostCount={post.reposts}
                                  contextText={contextText}
                                  attachment={attachment}
                                  isRepostOnly={isRepost && !hasOwnContent}
                                  isLiked={post.isLiked}
                                  isSaved={savedOverrides[String(post.id)] ?? Boolean(post.isSaved)}
                                  isOwner={isPostOwner}
                                  authorUserId={post.authorUserId}
                                  canEdit={isPostOwner}
                                  canDelete={isPostOwner}
                                  onLike={(postId) => post.isLiked ? handleUnlikePost(String(postId)) : handleLikePost(String(postId))}
                                  onComment={(postId) => handleOpenComments(String(postId))}
                                  onRepost={(postId, e) => handleRepost(String(postId), e)}
                                  onShare={(postId) => handleShare(String(postId))}
                                  onSave={(postId) => handleSavePost(String(postId))}
                                  onUpdate={(postId) => handleEditPost(String(postId))}
                                  onDelete={() => handleDeletePost(String(post.id))}
                                  onReport={setPendingReportPostId}
                                  onBlockAuthor={handleBlockAuthor}
                                  isCommentActive={openCommentsFor === post.id}
                                  isRepostActive={openRepostFor === post.id}
                                >
                                  {openCommentsFor === post.id && (
                                    <GroupCommentsSection
                                      key={post.id}
                                      postId={post.id}
                                      groupId={id}
                                      commentText={commentTexts[post.id] || ""}
                                      setCommentText={(text) => handleCommentTextChange(post.id, text)}
                                      onSubmit={() => handleCommentSubmit(post.id)}
                                      refreshToken={commentsRefreshTick}
                                      profileAvatar={userAvatar}
                                      currentUserId={currentUserId}
                                      canModerate={canModeratePosts}
                                    />
                                  )}
                                </ProfessionalFeedPost>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-400">No posts in this group yet. Be the first to share something!</p>
                        </div>
                      )}
                    </div>
                      </>
                    )}
                  </div>
                );

              case 'Members':
                const maxVisibleMembers = 5;
                const visibleMembers = transformedMembers?.slice(0, maxVisibleMembers) || [];

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {isLoadingMembers ? (
                        // Loading skeleton for members
                        Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="bg-[#111823] rounded-xl p-4 animate-pulse">
                            <div className="h-32 bg-gray-700 rounded-lg mb-3"></div>
                            <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                            <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                          </div>
                        ))
                      ) : visibleMembers.length ? (
                        visibleMembers.map((member: any) => (
                          <div key={member.id} className="relative">
                            <ModernConnectionCard
                              id={member.id}
                              name={member.name}
                              company={member.company}
                              role={member.isAdmin ? 'Admin' : member.role}
                              avatarUrl={member.avatarUrl}
                              status="connected"
                              connectionCount={member.connectionCount}
                              isAdmin={member.isAdmin}
                              onSendMessage={(!member.isAdmin && (isAdminView || group?.role === 'OWNER')) ? 
                                (id) => handleRemoveMember(id) : undefined}
                              buttonText="Remove"
                              showButtonText={!member.isAdmin && (isAdminView || group?.role === 'OWNER')}
                            />
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-400">No members found in this group.</p>
                        </div>
                      )}
                    </div>
                    
                    {transformedMembers?.length > maxVisibleMembers && (
                      <div className="flex justify-center mt-4">
                        <button
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                        >
                          View All Members ({transformedMembers.length})
                        </button>
                      </div>
                    )}
                  </div>
                );

              case 'About':
                return (
                  <div className="bg-[#111823] rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">About {group?.title}</h3>
                    <p className="text-gray-300 leading-relaxed">
                      {renderDescription(group?.description, 'No description available for this group.')}
                    </p>
                  </div>
                );

              case 'Requests':
                return (
                  <div className="space-y-4">
                    {isGroupPendingApproval && (
                      <div className="rounded-xl bg-[#151a22] border border-orange-500/30 px-6 py-5 flex items-center gap-4">
                        <svg className="w-8 h-8 flex-shrink-0 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-white font-medium">This group is pending admin approval</p>
                          <p className="text-sm text-gray-400 mt-0.5">Join requests cannot be managed until the group has been approved by an administrator.</p>
                        </div>
                      </div>
                    )}
                    {!isGroupPendingApproval && isLoadingRequests ? (
                      // Loading skeleton for requests
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="bg-[#111823] rounded-xl p-4 animate-pulse h-32">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-gray-700 rounded-full"></div>
                              <div className="flex-1">
                                <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                                <div className="h-3 bg-gray-700 rounded w-48 mb-1"></div>
                                <div className="h-3 bg-gray-700 rounded w-24"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : !isGroupPendingApproval && requestsData?.items?.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {requestsData.items.map((request: any) => {
                          const userName = request.user?.name || 'Unknown User';
                          return (
                          <ModernConnectionCard
                            key={request.id}
                            id={request.id}
                            name={userName}
                            company={request.user?.email || 'No email'}
                            role="Requested to join"
                            avatarUrl={request.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=111823&color=fff&size=200`}
                            status="received"
                            onAccept={(id) => handleAcceptRequest(String(id))}
                            onReject={(id) => handleDeclineRequest(String(id))}
                            showButtonText={false}
                            buttonText=""
                          />
                          );
                        })}
                      </div>
                    ) : !isGroupPendingApproval ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400">No pending join requests.</p>
                      </div>
                    ) : null}
                  </div>
                );

              case 'My Invites':
                return (
                  <div className="space-y-4">
                    {isGroupPendingApproval && (
                      <div className="rounded-xl bg-[#151a22] border border-orange-500/30 px-6 py-5 flex items-center gap-4">
                        <svg className="w-8 h-8 flex-shrink-0 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-white font-medium">This group is pending admin approval</p>
                          <p className="text-sm text-gray-400 mt-0.5">Invites cannot be managed until the group has been approved by an administrator.</p>
                        </div>
                      </div>
                    )}
                    {!isGroupPendingApproval && isLoadingGroupInvites ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="bg-[#111823] rounded-xl p-4 animate-pulse h-32">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-gray-700 rounded-full"></div>
                              <div className="flex-1">
                                <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                                <div className="h-3 bg-gray-700 rounded w-48 mb-1"></div>
                                <div className="h-3 bg-gray-700 rounded w-24"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : !isGroupPendingApproval && groupInvites.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {groupInvites.map((invite: any) => {
                          const invitedUser = invite.invitedUser || invite.user || invite.invitee || {};
                          const userName = invitedUser.name || invite.invitedUserName || invite.email || 'Invited User';
                          const userEmail = invitedUser.email || invite.invitedUserEmail || invite.email || 'No email';
                          return (
                            <ModernConnectionCard
                              key={invite.id}
                              id={invite.id}
                              name={userName}
                              company={userEmail}
                              role={invite.status ? `${String(invite.status).charAt(0).toUpperCase() + String(invite.status).slice(1).toLowerCase()} invite` : 'Pending invite'}
                              avatarUrl={invitedUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=111823&color=fff&size=200`}
                              status="connected"
                              onSendMessage={(id) => handleCancelInvite(String(id))}
                              buttonText="Cancel"
                              showButtonText={invite.status ? String(invite.status).toUpperCase() === 'PENDING' : true}
                            />
                          );
                        })}
                      </div>
                    ) : !isGroupPendingApproval ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400">No group invites found.</p>
                      </div>
                    ) : null}
                  </div>
                );

              default:
                return (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Tab content not available.</p>
                  </div>
                );
            }
          })()}
        </div>
      </div>
      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/70" 
            onClick={() => {
              setIsInviteModalOpen(false);
              setSelectedMembers(new Set());
            }} 
          />
          <GradientContainer className="relative z-10 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Invite Members</h2>
              <button
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setSelectedMembers(new Set());
                }}
                className="text-[#D85D27] hover:text-[#D85D27] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-white/10">
                <input
                  type="text"
                  placeholder="Search by name, company, or role..."
                  className="w-full p-2 rounded-lg bg-[#111823] text-white border border-white/10 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
              
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ maxHeight: 'calc(70vh - 180px)' }}>
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : searchResults?.data?.length ? (
                  searchResults.data.map((member: any) => {
                    const memberId = member.id;
                    const memberName = member.name || 'Unknown Member';
                    const memberCompany = member.company || '';
                    const memberRole = member.role || '';
                    const memberAvatar = member.avatarUrl || '';
                    const memberChapter = member.chapter ? `Chapter: ${member.chapter}` : '';
                    
                    return (
                      <div 
                        key={memberId}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedMembers.has(memberId) 
                            ? 'bg-[#D85D27]/20 border border-[#D85D27]/50' 
                            : 'bg-[#111823] hover:bg-[#1a1f2e] border border-transparent hover:border-white/10'
                        }`}
                        onClick={() => handleSelectMember(memberId)}
                      >
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12 rounded-full bg-[#111823] overflow-hidden border-2 border-white/10">
                            {memberAvatar ? (
                              <img src={memberAvatar} alt={memberName} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-[#D85D27] text-white font-medium">
                                {memberName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
                              </div>
                            )}
                          </div>
                          <div className="ml-3 min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{memberName}</p>
                            {memberRole && (
                              <p className="text-xs text-orange-400 truncate">{memberRole}</p>
                            )}
                            <div className="flex items-center gap-2">
                              {memberCompany && (
                                <span className="text-xs text-gray-400 truncate">{memberCompany}</span>
                              )}
                              {memberChapter && (
                                <span className="text-xs text-gray-500">•</span>
                              )}
                              {memberChapter && (
                                <span className="text-xs text-gray-400 truncate">{memberChapter}</span>
                              )}
                            </div>
                          </div>
                          {selectedMembers.has(memberId) && (
                            <div className="flex-shrink-0 text-[#D85D27]">
                              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#111823] flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-300 mb-1">
                      {searchQuery ? 'No members found' : 'Search for members'}
                    </h3>
                    <p className="text-sm text-gray-500 max-w-xs">
                      {searchQuery 
                        ? 'Try different search terms or check for typos'
                        : 'Start typing to find and invite members to your group'}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-white/10 sticky bottom-0">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="text-sm text-gray-400">
                    {selectedMembers.size > 0 ? (
                      <span>{selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected</span>
                    ) : (
                      <span>Select members to invite</span>
                    )}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <button
                      onClick={() => {
                        setIsInviteModalOpen(false);
                        setSelectedMembers(new Set());
                      }}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-[#111823] hover:bg-[#1a1f2e] rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInviteSubmit}
                      disabled={selectedMembers.size === 0}
                      className={`w-full sm:w-auto px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                        selectedMembers.size > 0
                          ? 'bg-[#D85D27] hover:bg-orange-700'
                          : 'bg-gray-600 cursor-not-allowed opacity-70'
                      }`}
                    >
                      Send Invite
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </GradientContainer>
        </div>
      )}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPost={handleCreatePost}
        userName={storeUser?.name || userData?.data?.name || 'User'}
        userAvatar={userAvatar}
        modalTitle="Create a Post"
        submitText="Post"
      />

      <EditPostModal
        isOpen={isEditPostOpen}
        onClose={() => {
          setIsEditPostOpen(false);
          setEditingPost(null);
        }}
        onUpdate={handleUpdatePost}
        userName={storeUser?.name || userData?.data?.name || 'User'}
        userAvatar={userAvatar}
        initialContent={editingPost?.body || ""}
        initialMedia={editingPost?.media?.map((item) => ({
          url: item.url,
          type: item.type,
        }))}
        modalTitle="Edit Post"
        submitText="Update"
      />
      
      <ConfirmationDialog
        isOpen={adminConfirmState.open}
        actionType={adminConfirmState.action || undefined}
        onClose={() =>
          setAdminConfirmState((prev) => ({ ...prev, open: false }))
        }
        onConfirm={() => {
          if (adminConfirmState.action) {
            // Admin action confirmation logic here
          }
          setAdminConfirmState({ open: false, action: null });
        }}
      />
      
      {/* Delete Post Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmPost}
        actionType="delete"
        onClose={() => setDeleteConfirmPost(null)}
        onConfirm={confirmDeletePost}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <ReportDialog
        isOpen={pendingReportPostId !== null}
        onClose={() => setPendingReportPostId(null)}
        onConfirm={confirmReportPost}
        isSubmitting={isReportingPost}
        contentLabel="post"
      />

      {openRepostFor && repostPopoverPos && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => {
            setOpenRepostFor(null);
            setRepostPopoverPos(null);
          }}
        >
          <div
            className="absolute w-[320px] rounded-lg border border-gray-700 bg-[#161b22] shadow-xl"
            style={{ top: repostPopoverPos.y, left: repostPopoverPos.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-2">
              <button
                onClick={() => handleRepostAction(String(openRepostFor), true)}
                className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-gray-700"
              >
                <svg
                  className="mt-0.5 h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <div>
                  <div className="text-sm font-medium text-white">Repost with your thoughts</div>
                  <div className="text-xs text-gray-400">Create a new post with this post attached</div>
                </div>
              </button>
              <button
                onClick={() => handleRepostAction(String(openRepostFor), false)}
                className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-gray-700"
              >
                <svg
                  className="mt-0.5 h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  aria-hidden
                >
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                <div>
                  <div className="text-sm font-medium text-white">Repost</div>
                  <div className="text-xs text-gray-400">Instantly repost this to the group feed</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {repostSourcePostId && (
        <RepostModal
          isOpen={isRepostModalOpen}
          onClose={() => {
            setIsRepostModalOpen(false);
            setRepostSourcePostId(null);
          }}
          onRepost={(content: string) => {
            handleCreatePost(content);
          }}
          userName={storeUser?.name || userData?.data?.name || 'User'}
          userAvatar={userAvatar}
          attachment={
            transformedFeedPosts.find((post) => String(post.id) === String(repostSourcePostId))
              ? renderGroupRepostPreview(
                  transformedFeedPosts.find((post) => String(post.id) === String(repostSourcePostId))!,
                )
              : null
          }
        />
      )}
    </div>
  );
};

export default GroupDetailPage;
