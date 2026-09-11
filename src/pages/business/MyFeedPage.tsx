import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDeleteCommentMutation, useUpdateCommentMutation } from "../../services/feedApi";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import {
  FeedPost,
  CreatePostModal,
  EditPostModal,
  RepostModal,
  ProfileSidebar,
  MessagesSidebar,
  GroupsSidebar,
  CreatePostInput,
  type Message,
  type Group,
} from "../../components/feed";
import {
  useFeedTimelineQuery,
  useFeedUserPostsQuery,
  useLazyFeedUserPostsQuery,
  useLazyFeedTimelineQuery,
  useFeedListSavedQuery,
  useSavePostMutation,
  useReactPostMutation,
  useListCommentsQuery,
  useAddCommentMutation,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useRepostPostMutation,
  useFeedProfileStatsQuery,
  useGetPostQuery,
  usePresignFeedMediaBatchMutation,
  type FeedMediaItem,
} from "../../services/feedApi";
import { useGetThreadsQuery } from "../../services/professional/professionalMessagesApi";
import { useAppSelector } from "../../app/store";
import { useToast } from "../../components/toast/ToastProvider";
import GradientContainer from "../../components/common/GradientContainer";
import { useListGroupsQuery } from "../../services/groupsApi";
import { useBlockUserMutation, useReportContentMutation } from "../../services/moderationApi";
import type { ModerationReason } from "../../services/moderationApi";
import { ReportDialog } from "../../components/common/ReportDialog";
// no users/me query here; user is loaded post-login into store

// Inline comments section component
const CommentsSection: React.FC<{
  postId: string;
  commentText: string;
  setCommentText: (v: string) => void;
  onSubmit: () => void;
  refreshToken?: number;
  profileAvatar?: string;
  refetchTimeline?: () => void;
}> = ({ postId, commentText, setCommentText, onSubmit, refreshToken, profileAvatar, refetchTimeline }) => {
  const { data, isLoading, error, refetch: refetchComments } = useListCommentsQuery({ postId, limit: 10, t: refreshToken } as any, { refetchOnMountOrArgChange: true });
  const user = useAppSelector((state) => state.auth.user);
  const [deleteComment] = useDeleteCommentMutation();
  const comments = data?.data ?? [];
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentText, setEditedCommentText] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmComment, setDeleteConfirmComment] = useState<string | null>(null);
  const leaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useToast();
  const [reportComment] = useReportContentMutation();
  const [pendingReportComment, setPendingReportComment] = useState<{ id: string; authorId?: string } | null>(null);
  const [isReportingComment, setIsReportingComment] = useState(false);

  const confirmReportComment = async (reason: ModerationReason, details: string) => {
    if (!pendingReportComment) return;
    try {
      setIsReportingComment(true);
      await reportComment({
        contentType: "BUSINESS_COMMENT",
        contentId: pendingReportComment.id,
        targetUserId: pendingReportComment.authorId,
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
      refetchTimeline?.();
    } catch (error) {
      showToast({
        title: "Failed to report comment",
        description: "Please try again.",
        kind: "error",
      });
    } finally {
      setIsReportingComment(false);
    }
  };

  // Handle menu hover and click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isMenuClick = target.closest('.comment-menu') || target.closest('.menu-trigger');
      const isMenuItemClick = target.closest('.menu-item');

      if (openMenuId && !isMenuClick && !isMenuItemClick) {
        setOpenMenuId(null);
      }
    };

    // Use capture phase to handle clicks before they reach the menu
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [openMenuId]);

  // Handle hover behavior with delay
  const hoverTimeout = 200; // Time in ms before menu closes when mouse leaves

  const handleMouseEnterMenu = (commentId: string) => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setOpenMenuId(commentId);
  };

  const handleMouseLeaveMenu = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = setTimeout(() => {
      setOpenMenuId(null);
      leaveTimerRef.current = null;
    }, hoverTimeout);
  };

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  const toggleMenu = (commentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenMenuId(prev => prev === commentId ? null : commentId);
  };


  const handleStartEdit = (comment: any) => {
    setOpenMenuId(null);
    setEditingCommentId(comment._id);
    setEditedCommentText(comment.text);
  };

  const [updateComment] = useUpdateCommentMutation();

  const confirmDeleteComment = async () => {
    if (!deleteConfirmComment) return;

    try {
      await deleteComment({ commentId: deleteConfirmComment }).unwrap();
      refetchComments();
      // Also refresh the timeline so counts are accurate
      refetchTimeline?.();
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

  // Check if the current user is the author of a comment
  const isCommentAuthor = (comment: any) => {
    return user?._id === comment.authorId;
  };

  return (
    <div className="mt-3">
      {/* Add comment */}
      <div className="flex items-start gap-2.5 mb-3">
        {/* Avatar with profile photo or initial */}
        <div className="w-9 h-9 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
          {profileAvatar ? (
            <img
              src={profileAvatar}
              alt={user?.name || 'User'}
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
            {user?.name?.charAt(0).toUpperCase() || 'U'}
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
              comments.map((c: any, idx: number) => (
                <div key={c._id ?? c.id ?? idx} className="group flex items-start gap-2 p-1.5 hover:bg-gray-800/30 rounded transition-colors">
                  <div className="w-7 h-7 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {(c.authorProfilePhotoUrl || c.author?.avatarUrl) ? (
                      <img
                        src={c.authorProfilePhotoUrl || c.author?.avatarUrl}
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
                      {(
                        <div
                          className="relative"
                          onMouseLeave={handleMouseLeaveMenu}
                        >
                          <button
                            className={`text-gray-400 hover:text-gray-200 cursor-pointer`}
                            onClick={(e) => toggleMenu(c._id, e)}
                            onMouseEnter={() => handleMouseEnterMenu(c._id)}
                            aria-expanded={openMenuId === c._id}
                            aria-haspopup="true"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                            </svg>
                          </button>

                          {openMenuId === c._id && (
                            <div
                              className="absolute right-0 w-40 bg-gray-800 border border-gray-700 rounded shadow-lg z-10 transition-all duration-200 comment-menu"
                              style={{
                                top: '100%',
                                marginTop: '-1px',
                                transformOrigin: 'top right'
                              }}
                              onMouseEnter={() => {
                                if (leaveTimerRef.current) {
                                  clearTimeout(leaveTimerRef.current);
                                  leaveTimerRef.current = null;
                                }
                              }}
                              onMouseLeave={handleMouseLeaveMenu}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isCommentAuthor(c) ? (
                                <>
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-700 menu-item"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEdit(c);
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Edit Comment</span>
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-gray-700 menu-item"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteComment(c._id);
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Delete Comment</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-amber-300 hover:bg-gray-700 menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setPendingReportComment({ id: c._id ?? c.id, authorId: c.authorId });
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 2H20l-3 6 3 6h-7.5l-1-2H5a2 2 0 00-2 2z" />
                                  </svg>
                                  <span>Report Comment</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {editingCommentId === c._id ? (
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          value={editedCommentText}
                          onChange={(e) => setEditedCommentText(e.target.value)}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="px-2 py-1 text-xs bg-[#D85D27] text-white rounded hover:bg-orange-700"
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
              ))
            )}
          </div>
        )}
      </div>

      {/* Comment Delete Confirmation Modal */}
      {deleteConfirmComment !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <GradientContainer className="w-full max-w-sm">
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
          </GradientContainer>
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

export default function MyFeedPage() {
  const navigate = useNavigate();
  const { postId: routePostId } = useParams<{ postId: string }>();
  const [viewMode, setViewMode] = useState<"timeline" | "my" | "saved">("timeline");
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const { showToast } = useToast();
  const [reportContent] = useReportContentMutation();
  const [blockUser] = useBlockUserMutation();
  const [pendingReportPostId, setPendingReportPostId] = useState<string | number | null>(null);
  const [isReportingPost, setIsReportingPost] = useState(false);
  const FEED_LIMIT = 20;

  const {
    data: timelineRes,
    isLoading: timelineLoading,
    error: timelineError,
    refetch: refetchTimeline,
  } = useFeedTimelineQuery(
    { limit: FEED_LIMIT },
    { skip: Boolean(routePostId) } as any
  );
  const singlePostQuery = useGetPostQuery({ postId: String(routePostId || "") } as any, { skip: !routePostId } as any);
  const authUser = useAppSelector((s) => s.auth.user);
  const effectiveUserId = authUser?._id ? String(authUser._id) : undefined;
  const userPostsQuery = useFeedUserPostsQuery(
    { userId: String(effectiveUserId || ""), limit: 20 } as any,
    { skip: !effectiveUserId || viewMode !== "my", refetchOnMountOrArgChange: true }
  );
  const [fetchUserPosts, userPostsLazy] = useLazyFeedUserPostsQuery();
  const [fetchTimelineMore] = useLazyFeedTimelineQuery();
  const savedQuery = useFeedListSavedQuery({ limit: 20 }, { skip: viewMode !== "saved", refetchOnMountOrArgChange: true });
  const [reactPost] = useReactPostMutation();
  const [repostPost] = useRepostPostMutation();
  const { data: profileStats, refetch: refetchProfileStats } = useFeedProfileStatsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [addComment] = useAddCommentMutation();
  const [createPost] = useCreatePostMutation();
  const [savePost] = useSavePostMutation();
  const [updatePost] = useUpdatePostMutation();
  const [presignFeedMediaBatch] = usePresignFeedMediaBatchMutation();
  const [deletePost] = useDeletePostMutation();
  const [openCommentsFor, setOpenCommentsFor] = useState<string | number | null>(null);
  const [openRepostFor, setOpenRepostFor] = useState<string | number | null>(null);
  const [repostPopoverPos, setRepostPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [repostAnchorEl, setRepostAnchorEl] = useState<HTMLElement | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [commentsRefreshTick, setCommentsRefreshTick] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | number | null>(null);
  const [editingInitialContent, setEditingInitialContent] = useState<string>("");
  const [editingInitialMedia, setEditingInitialMedia] = useState<Array<{ key?: string; url?: string; type?: "image" | "video" }>>([]);
  const [isRepostWithThoughts, setIsRepostWithThoughts] = useState(false);
  const [repostSourcePostId, setRepostSourcePostId] = useState<string | number | null>(null);
  const [savedPosts, setSavedPosts] = useState<Set<string | number>>(new Set());
  const [deleteConfirmPost, setDeleteConfirmPost] = useState<string | number | null>(null);
  const [timelinePosts, setTimelinePosts] = useState<any[]>([]);
  const [timelineNextCursor, setTimelineNextCursor] = useState<string | null>(null);
  const [timelineHasMore, setTimelineHasMore] = useState(false);
  const [isFetchingMoreTimeline, setIsFetchingMoreTimeline] = useState(false);

  const getApiErrorMessage = React.useCallback((error: unknown): string => {
    const err = error as any;
    const data = err?.data;

    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      const firstError = data.errors[0];
      if (typeof firstError?.message === "string" && firstError.message.trim()) {
        return firstError.message;
      }
    }

    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }

    if (typeof err?.message === "string" && err.message.trim()) {
      return err.message;
    }

    return "Please try again.";
  }, []);

  const inferFeedMediaType = React.useCallback((file: File): FeedMediaItem["type"] => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    return "file";
  }, []);

  const uploadFeedFiles = React.useCallback(
    async (files: File[]): Promise<FeedMediaItem[]> => {
      if (!files.length) return [];

      const presignRes = await presignFeedMediaBatch({
        files: files.map((file) => ({
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        })),
      }).unwrap();

      const presignedFiles = presignRes?.data?.files ?? [];
      if (presignedFiles.length !== files.length) {
        throw new Error("Media upload setup failed. Please try again.");
      }

      await Promise.all(
        presignedFiles.map(async (item: { uploadUrl: string }, index: number) => {
          const file = files[index];
          const response = await fetch(item.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }
        }),
      );

      return presignedFiles.map((item: { key: string }, index: number) => ({
        key: item.key,
        type: inferFeedMediaType(files[index]),
        size: files[index].size,
      }));
    },
    [inferFeedMediaType, presignFeedMediaBatch],
  );

  React.useEffect(() => {
    if (routePostId || viewMode !== "timeline") return;

    const list = (timelineRes as any)?.data ?? [];
    setTimelinePosts(Array.isArray(list) ? list : []);
    setTimelineNextCursor((timelineRes as any)?.nextCursor ?? null);
    setTimelineHasMore(Boolean((timelineRes as any)?.hasMore));
  }, [timelineRes, routePostId, viewMode]);

  // Check authentication
  React.useEffect(() => {
    const hasToken = localStorage.getItem("accessToken");
    if (!hasToken) {
      navigate("/login");
    }
  }, [navigate]);

  // Handle view mode changes and data fetching
  React.useEffect(() => {
    if (routePostId) {
      // If we have a routePostId, we're viewing a single post
      return;
    }

    // Handle different view modes
    switch (viewMode) {
      case 'my':
        if (effectiveUserId) {
          fetchUserPosts({ userId: String(effectiveUserId), limit: 20 } as any);
        }
        break;
      case 'saved':
        savedQuery.refetch();
        break;
      case 'timeline':
      default:
        refetchTimeline();
        break;
    }
  }, [viewMode, effectiveUserId, routePostId]);

  // Profile and display
  const profileAvatar = authUser?.basicInfo?.profilePhotoUrl || undefined;
  const displayName = authUser?.name || "";
  const businessName = (authUser as any)?.business?.businessName || "";
  const professionalRole = (authUser as any)?.professional?.role || "";
  const coverImageUrl = ""; // Will use the default from ProfileSidebar


  // Fetch threads for messages sidebar — refetch on mount and when tab regains focus
  const { data: threadsData, refetch: refetchThreadsData } = useGetThreadsQuery(
    { limit: 10 },
    { refetchOnMountOrArgChange: true, pollingInterval: 30000 },
  );

  // Refetch sidebar threads whenever the page becomes visible again (e.g. after visiting chat)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetchThreadsData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refetchThreadsData]);

  // Fetch user's groups for sidebar
  const { data: myGroupsData } = useListGroupsQuery({
    tab: "my",
    page: 1,
    limit: 4,
  });

  // Transform threads to messages format for the sidebar
  const allMessages: Message[] = React.useMemo(() => {
    if (!threadsData?.data) return [];

    return threadsData.data.map((thread) => {
      // For direct messages, use the peer info which contains the other user's details
      const peer = thread.peer || thread.participants.find((p: any) => p.userId !== authUser?._id);
      const lastMessage = thread.lastMessage;
      const lastSeen = (peer as any)?.lastSeenAt ? new Date((peer as any).lastSeenAt).toLocaleTimeString() : 'Offline';
      const lastMessageText = lastMessage?.text?.trim();
      const messagePreview =
        lastMessageText ||
        (lastMessage?.type === "IMAGE"
          ? "Photo"
          : lastMessage?.type === "VIDEO"
            ? "Video"
            : lastMessage?.type === "FILE"
              ? "File"
              : "No messages yet");

      return {
        id: thread._id,
        senderName: (peer as any)?.name || 'Unknown User',
        senderAvatar: (peer as any)?.photoUrlDecrypted || (peer as any)?.photoUrl,
        message: messagePreview,
        time: lastMessage?.sentAt ? new Date(lastMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        isUnread: (thread.unreadCount || 0) > 0,
        unreadCount: thread.unreadCount || 0,
        lastSeen,
        isOnline: (peer as any)?.online || false
      };
    });
  }, [threadsData, authUser?._id]);

  // Show only first 4 messages by default
  const messages = allMessages.slice(0, 4);

  // Transform groups data for GroupsSidebar
  const groups: Group[] = React.useMemo(() => {
    if (!myGroupsData?.items) return [];

    return myGroupsData.items.map((group: any) => ({
      id: String(group.id ?? group._id ?? ""),
      name: group.name || 'Unknown Group',
      description: group.description || '',
      date: group.createdAt ? new Date(group.createdAt).toLocaleDateString() : '',
      avatar: group.coverImageUrl,
      memberCount: group.memberCount,
    }));
  }, [myGroupsData]);

  // Normalize media to url and type ('image' | 'video')
  const getMediaInfo = (media?: any[] | null): { url?: string; type?: "image" | "video" } => {
    if (!Array.isArray(media) || media.length === 0) return {};
    const m = media[0] || {};
    const url: string | undefined = m.url || m.key || undefined;
    if (!url) return {};
    const t = String(m.type || "").toLowerCase();
    const videoExt = ["mp4", "mov", "webm", "avi", "mkv", "m4v", "3gp", "ogg"];
    const isVideo = t === "video" || t.startsWith("video/") || videoExt.includes(t);
    return { url, type: isVideo ? "video" : "image" };
  };

  const mapMediaList = (media?: any[] | null): Array<{ key?: string; url?: string; type?: "image" | "video" }> => {
    if (!Array.isArray(media)) return [];
    return media
      .map((m) => {
        const key: string | undefined = m?.key || undefined;
        const url: string | undefined = m?.url || (key ? `https://ekam-develop.s3.ap-south-2.amazonaws.com/${key}` : undefined);
        if (!url) return null as any;
        const t = String(m?.type || "").toLowerCase();
        const videoExt = ["mp4", "mov", "webm", "avi", "mkv", "m4v", "3gp", "ogg"];
        const isVideo = t === "video" || t.startsWith("video/") || videoExt.includes(t);
        return { key, url, type: isVideo ? "video" : "image" } as const;
      })
      .filter(Boolean) as any;
  };

  function mapPosts(list: any[]) {
    return list.map((p: any) => {
      // Determine primary media (image or video)
      const primary = getMediaInfo(p.media);
      // If this item is a repost, try to detect original post payload
      const orig = p.repostOf || p.original || p.originalPost || p.sharedPost || null;
      const origPrimary = orig ? getMediaInfo(orig.media) : {};
      const isRepostOnly = !!orig && !(p.text && String(p.text).trim().length > 0);
      // Reposts: show reposter text (if any) as main content, and original inside nested attachment card
      const reposterText: string = typeof p.text === 'string' ? p.text : '';

      const ownerId = String(
        p.authorId || p.author?._id || p.author?.id || p.userId || p.user?.id || p.ownerId || ''
      );
      const isOwner = effectiveUserId ? ownerId === String(effectiveUserId) : false;

      return {
        id: p._id ?? p.id ?? String(Math.random()),
        authorUserId: ownerId || undefined,
        authorName: p.authorName || p.author?.name || "Unknown",
        authorTitle: p.authorRole || p.authorCompany || undefined,
        postDate: p.createdAt
          ? new Date(p.createdAt).toLocaleString()
          : p.date
            ? new Date(p.date).toLocaleString()
            : "",
        // Main content: only reposter text for reposts; otherwise normal content
        content: orig ? reposterText : (p.text || p.title || p.description || ""),
        // For reposts, avoid showing parent image; show only original inside attachment card
        imageUrl: orig ? undefined : primary.url,
        mediaType: orig ? undefined : primary.type,
        media: orig ? [] : mapMediaList(p.media),
        avatarUrl: p.authorProfilePhotoUrl || p.author?.avatarUrl || undefined,
        initialLikes: (p.stats && typeof p.stats.likes === 'number') ? p.stats.likes : (p.likesCount ?? 0),
        initialComments: (typeof p.commentsCount === 'number') ? p.commentsCount : (p.stats?.comments ?? 0),
        initialLiked: Boolean(p.youLiked ?? p.liked ?? p.isLiked ?? p.stats?.liked ?? false),
        repostCount: p.stats?.reposts ?? 0,
        shareUrl: p.shareUrl || null,
        // Attachment: nested card with original author, text, and first media
        attachment: orig
          ? {
            authorName: orig.authorName || orig.author?.name || "Unknown",
            postDate: orig.createdAt ? new Date(orig.createdAt).toLocaleString() : undefined,
            content: orig.text || orig.title || orig.description || "",
            media: mapMediaList(orig.media),
            imageUrl: (orig.media && orig.media.length) ? (orig.media[0].url || orig.media[0].key) : (origPrimary as any).url,
            mediaType: (origPrimary as any).type,
            avatarUrl: orig.authorProfilePhotoUrl || orig.author?.avatarUrl || undefined,
          }
          : null,
        contextText: orig
          ? `${p.authorName || p.author?.name || "Unknown"} reposted`
          : undefined,
        isRepostOnly,
        isOwner,
      };
    });
  }

  const refreshCurrentFeed = React.useCallback(() => {
    if (viewMode === "saved") {
      savedQuery.refetch();
    } else if (viewMode === "timeline") {
      refetchTimeline();
    } else if (effectiveUserId) {
      fetchUserPosts({ userId: String(effectiveUserId), limit: 20 } as any);
    }
  }, [effectiveUserId, fetchUserPosts, refetchTimeline, savedQuery, viewMode]);

  const confirmReportPost = async (reason: ModerationReason, details: string) => {
    if (!pendingReportPostId) return;
    const postId = pendingReportPostId;
    const post = apiPosts.find((item: any) => String(item.id) === String(postId));
    try {
      setIsReportingPost(true);
      await reportContent({
        contentType: "BUSINESS_POST",
        contentId: String(postId),
        targetUserId: post?.authorUserId,
        reason,
        details: details || undefined,
      }).unwrap();
      showToast({
        title: "Post reported",
        description: "This post is hidden from your feed and sent to admins for review.",
        kind: "success",
      });
      setPendingReportPostId(null);
      refreshCurrentFeed();
    } catch (error) {
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
        sourceContentType: "BUSINESS_POST",
        sourceContentId: String(postId),
      }).unwrap();
      showToast({
        title: "Member blocked",
        description: "Their content is hidden from your feed.",
        kind: "success",
      });
      refreshCurrentFeed();
    } catch (error) {
      showToast({
        title: "Failed to block member",
        description: "Please try again.",
        kind: "error",
      });
    }
  };

  const loadMoreTimelinePosts = React.useCallback(async () => {
      if (
        routePostId ||
        viewMode !== "timeline" ||
        !timelineHasMore ||
        !timelineNextCursor ||
        isFetchingMoreTimeline
      ) {
        return;
      }

      try {
        setIsFetchingMoreTimeline(true);

        const response: any = await fetchTimelineMore({
          limit: FEED_LIMIT,
          cursor: timelineNextCursor,
        } as any).unwrap();
        const nextItems = response?.data ?? [];

        if (Array.isArray(nextItems) && nextItems.length > 0) {
          setTimelinePosts((prev) => {
            const existingIds = new Set(prev.map((item: any) => String(item._id ?? item.id)));
            const uniqueItems = nextItems.filter(
              (item: any) => !existingIds.has(String(item._id ?? item.id))
            );

            return [...prev, ...uniqueItems];
          });
        }

        setTimelineNextCursor(response?.nextCursor ?? null);
        setTimelineHasMore(Boolean(response?.hasMore));
      } catch (error) {
        console.error("Failed to load more timeline posts:", error);
      } finally {
        setIsFetchingMoreTimeline(false);
      }
    }, [
      routePostId,
      viewMode,
      timelineHasMore,
      timelineNextCursor,
      isFetchingMoreTimeline,
      refetchTimeline,
    ]);
    
  // Build a compact preview for repost with thoughts
  const renderRepostPreview = (sourceId: string | number | null) => {
    if (!sourceId) return null;
    const p = apiPosts.find((x: any) => String(x.id) === String(sourceId));
    if (!p) return null;
    return (
      <div className="p-4 bg-[#0f1419] border-t border-gray-700">
        <div className="flex items-start gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center flex-shrink-0">
            {p.avatarUrl ? (
              <img src={p.avatarUrl} alt={p.authorName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-white">{String(p.authorName || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="text-white text-sm font-medium leading-tight">{p.authorName}</div>
            <div className="text-[10px] text-gray-500 leading-tight">{p.postDate}</div>
          </div>
        </div>
        <div className="text-[13px] text-gray-300 mb-2">{p.content}</div>
        {p.imageUrl && (
          <div className="rounded-sm overflow-hidden">
            <img src={p.imageUrl} alt="attachment" className="w-full h-auto object-contain" />
          </div>
        )}
      </div>
    );
  };
  const handleShare = async (postId: string | number) => {
    try {
      const post = apiPosts.find((x: any) => String(x.id) === String(postId));
      const url = post?.shareUrl || `${window.location.origin}/post/${String(postId)}`;
      const title = "Ekam Post";
      const text = post?.content?.slice(0, 120) || "Check out this post";

      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        showToast({ title: "Link copied", description: "Share URL copied to clipboard.", kind: "success" });
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast({ title: "Link copied", description: "Share URL copied to clipboard.", kind: "success" });
      }
    } catch (e) {
      console.error("Failed to share post", e);
      showToast({ title: "Share failed", description: "Unable to share the post.", kind: "error" });
    }
  };



  const handleUpdate = (postId: string | number) => {
    const existing = apiPosts.find((p: any) => String(p.id) === String(postId));
    setEditingInitialContent(existing?.content || "");
    setEditingInitialMedia(existing?.media || []);
    setEditingPostId(postId);
    setIsEditMode(true);
    setIsCreatePostModalOpen(true);
  };

  const handleDelete = (postId: string | number) => {
    setDeleteConfirmPost(postId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmPost) return;

    try {
      await deletePost({ postId: String(deleteConfirmPost) }).unwrap();
      if (viewMode === "my" && effectiveUserId) {
        fetchUserPosts({ userId: String(effectiveUserId), limit: 20 } as any);
      } else if (viewMode === "saved") {
        savedQuery.refetch();
      } else {
        refetchTimeline();
      }
      refetchProfileStats(); // Refresh profile stats to update posts count
      showToast({
        title: "Post deleted",
        description: "The post has been removed.",
        kind: "success",
      });
      setDeleteConfirmPost(null);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to delete post", e);
      showToast({
        title: "Failed to delete",
        description: "Please try again.",
        kind: "error",
      });
    }
  };

  const apiPosts = React.useMemo(() => {
    if (routePostId) {
      const item = (singlePostQuery.data as any)?.data;
      const list = item ? [item] : [];
      return mapPosts(list);
    }

    if (viewMode === "my") {
      const list = (userPostsLazy.data?.data as any[]) || (userPostsQuery.data?.data as any[]) || [];
      return mapPosts(list);
    }

    if (viewMode === "saved") {
      const list = (savedQuery.data?.data as any[]) || [];
      return mapPosts(list);
    }

    return mapPosts(timelinePosts);
  }, [
    routePostId,
    singlePostQuery.data,
    viewMode,
    userPostsLazy.data,
    userPostsQuery.data,
    savedQuery.data,
    timelinePosts,
  ]);

  const handleCreatePost = async (content: string, files?: File[]) => {
    try {
      const media = files && files.length ? await uploadFeedFiles(files) : [];
      const body: any = { text: content, media };
      await createPost(body).unwrap();
      // Refresh timeline to include the new post
      refetchTimeline();
      // Refresh profile stats to update posts count
      refetchProfileStats();
      showToast({
        title: "Posted!",
        description: "Your post has been published to your feed.",
        kind: "success",
      });
    } catch (e) {
      console.error("Failed to create post", e);
      throw new Error(getApiErrorMessage(e));
    }
  };

  const handleModalPost = async (content: string, media?: Array<File | { key?: string; url?: string; type?: "image" | "video" }>) => {
    try {
      if (isEditMode && editingPostId !== null) {
        const existingMediaOnly = (media ?? [])
          .filter((item): item is { key?: string; url?: string; type?: "image" | "video" } => !(item instanceof File))
          .map((item) => {
            if (item.key && item.type) {
              return { key: item.key, type: item.type };
            }

            if (item.url && item.type) {
              const keyStart = item.url.indexOf("feed/media/");
              if (keyStart >= 0) {
                return { key: item.url.slice(keyStart), type: item.type };
              }
            }

            return null;
          })
          .filter((item): item is { key: string; type: "image" | "video" } => Boolean(item?.key && item?.type));

        const newFilesOnly = (media ?? []).filter((item): item is File => item instanceof File);
        const uploadedMedia = newFilesOnly.length ? await uploadFeedFiles(newFilesOnly) : [];
        const nextMedia = [...existingMediaOnly, ...uploadedMedia];

        await updatePost({
          postId: String(editingPostId),
          text: content,
          media: nextMedia,
        }).unwrap();
        if (viewMode === "my" && effectiveUserId) {
          fetchUserPosts({ userId: String(effectiveUserId), limit: 20 } as any);
        } else if (viewMode === "saved") {
          savedQuery.refetch();
        } else {
          refetchTimeline();
        }
        // Refresh profile stats to update posts count
        refetchProfileStats();
        setIsEditMode(false);
        setEditingPostId(null);
        setEditingInitialContent("");
        showToast({
          title: "Post updated",
          description: "Your post has been updated successfully.",
          kind: "success",
        });
      } else if (isRepostWithThoughts && repostSourcePostId !== null) {
        await repostPost({ postId: String(repostSourcePostId), text: content }).unwrap();
        setIsRepostWithThoughts(false);
        setRepostSourcePostId(null);
        if (viewMode === "my" && effectiveUserId) {
          fetchUserPosts({ userId: String(effectiveUserId), limit: 20 } as any);
        } else if (viewMode === "saved") {
          savedQuery.refetch();
        } else {
          refetchTimeline();
        }
        // Refresh profile stats to update posts count
        refetchProfileStats();
        showToast({ title: "Reposted", description: "Your repost has been published.", kind: "success" });
      } else {
        // For creating posts, only pass File objects (new uploads), not existing media
        const filesOnly = media?.filter(item => item instanceof File) as File[] | undefined;
        await handleCreatePost(content, filesOnly);
      }
    } catch (e) {
      console.error("Failed to submit post", e);
      throw e instanceof Error ? e : new Error(getApiErrorMessage(e));
    }
  };

  const handleLike = async (postId: string | number) => {
    try {
      const response = await reactPost({ postId: String(postId) }).unwrap();
      // Get the updated like status from the response
      const isLiked = response?.data?.liked;
      // Refresh the appropriate view to reflect updated like counts/state
      if (viewMode === "my" && effectiveUserId) {
        fetchUserPosts({ userId: String(effectiveUserId), limit: 20 } as any);
      } else if (viewMode === "saved") {
        savedQuery.refetch();
      } else {
        refetchTimeline();
      }
      showToast({
        title: isLiked ? "Liked!" : "Like removed",
        kind: "success",
        durationMs: 1500 // 1.5 seconds
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to like post", e);
      showToast({
        title: "Failed to react",
        kind: "error",
        durationMs: 1500
      });
    }
  };

  const handleOpenComments = (postId: string | number) => {
    setOpenCommentsFor((prev) => (prev === postId ? null : postId));
    setCommentTexts(prev => ({
      ...prev,
      [String(postId)]: ""
    }));
  };

  const handleCommentTextChange = (postId: string | number, text: string) => {
    setCommentTexts(prev => ({
      ...prev,
      [String(postId)]: text
    }));
  };

  const handleCommentSubmit = async (postId: string | number) => {
    const commentText = commentTexts[String(postId)] || "";
    if (!commentText.trim()) return;

    try {
      await addComment({ postId: String(postId), text: commentText.trim() }).unwrap();
      setCommentTexts(prev => ({
        ...prev,
        [String(postId)]: ""
      }));
      // Force comments query to refetch by updating refresh token
      setCommentsRefreshTick(v => v + 1);
      // Also refresh the timeline so counts are accurate
      refetchTimeline();
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

  const handleRepost = (postId: string | number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = (e?.currentTarget as HTMLElement) || null;
    if (target) {
      setRepostAnchorEl(target);
      const rect = target.getBoundingClientRect();
      const popWidth = 320;
      const estHeight = 160; // tighter estimated popover height for better above placement
      const padding = 16;
      const gap = 8;
      const maxLeft = Math.max(0, window.innerWidth - popWidth - padding);
      const x = Math.min(Math.max(rect.left, padding), maxLeft);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      let y: number;
      if (spaceBelow >= estHeight + gap) {
        y = rect.bottom + gap; // place below
      } else if (spaceAbove >= estHeight + gap) {
        y = Math.max(padding, rect.top - estHeight - gap); // flip above
      } else {
        // fallback: clamp within viewport
        y = Math.max(padding, Math.min(rect.bottom + gap, window.innerHeight - estHeight - padding));
      }
      setRepostPopoverPos({ x, y });
    }
    setOpenRepostFor((prev) => (prev === postId ? null : postId));
  };

  // Initialize saved posts state when saved posts data is loaded
  React.useEffect(() => {
    if (savedQuery.data?.data) {
      const savedPostIds = savedQuery.data.data.map((post: any) => post._id || post.id);
      setSavedPosts(new Set(savedPostIds));
    }
  }, [savedQuery.data]);

  // Keep popover attached to anchor on scroll/resize
  React.useEffect(() => {
    if (!openRepostFor || !repostAnchorEl) return;
    const updatePos = () => {
      const el = repostAnchorEl;
      if (!el || !document.body.contains(el)) {
        setOpenRepostFor(null);
        setRepostPopoverPos(null);
        setRepostAnchorEl(null);
        return;
      }
      const rect = el.getBoundingClientRect();
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
    };
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [openRepostFor, repostAnchorEl]);

  const doInstantRepost = async (postId: string | number) => {
    try {
      await repostPost({ postId: String(postId) }).unwrap();
      setOpenRepostFor(null);
      // Refresh current view
      if (viewMode === "my" && effectiveUserId) {
        fetchUserPosts({ userId: String(effectiveUserId), limit: 20 } as any);
      } else if (viewMode === "saved") {
        savedQuery.refetch();
      } else {
        refetchTimeline();
      }
      // Refresh profile stats to update posts count
      refetchProfileStats();
      showToast({ title: "Reposted", description: "Post has been reposted.", kind: "success" });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to repost", e);
      showToast({ title: "Failed to repost", description: "Please try again.", kind: "error" });
    }
  };

  const doRepostWithThoughts = (postId: string | number) => {
    setIsRepostWithThoughts(true);
    setRepostSourcePostId(postId);
    setIsCreatePostModalOpen(true);
    setOpenRepostFor(null);
  };

  const handleSave = async (postId: string | number) => {
    try {
      const isCurrentlySaved = savedPosts.has(postId);
      await savePost({ postId: String(postId) }).unwrap();

      // Update local saved posts state
      if (isCurrentlySaved) {
        setSavedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        showToast({ title: "Unsaved", description: "Post removed from your saved list.", kind: "success" });
      } else {
        setSavedPosts(prev => new Set(prev).add(postId));
        showToast({ title: "Saved", description: "Post added to your saved list.", kind: "success" });
      }

      if (viewMode === "saved") {
        savedQuery.refetch();
      } else if (viewMode === "timeline") {
        // Light feedback without forcing a heavy refetch
      }
    } catch (e) {
      console.error("Failed to save post", e);
      showToast({ title: "Failed to save", description: "Please try again.", kind: "error" });
    }
  };

  // Removed duplicate handleSubmitComment function as it's now handled by handleCommentSubmit

  const handleMessageClick = (messageId: string | number) => {
    navigate(`/business/my-feed/chat/thread/${messageId}`);
  };

  const handleViewAllMessages = () => {
    navigate('/business/my-feed/chat'); // Navigate to the full messages page
  };

  const handleViewAllGroups = () => {
    navigate('/groups');
  };

  const handleGroupClick = (groupId: string) => {
    if (!groupId) return;
    navigate(`/groups/${groupId}`);
  };

  const handleFeedScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (routePostId || viewMode !== "timeline") return;

    const target = event.currentTarget;
    const scrollBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;

    if (scrollBottom < 200) {
      loadMoreTimelinePosts();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <style>{`
        /* Custom scrollbar styles to match professional feed */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }

        /* Firefox scrollbar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #374151 transparent;
        }
      `}</style>
      <Navbar userName={displayName} userAvatar={profileAvatar} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader
          breadcrumbs={[
            { label: "Business", onClick: () => navigate("/dashboard") },
            { label: "My Feed" },
            { label: viewMode === "my" ? "My Feed" : viewMode === "saved" ? "Saved Posts" : "All Feeds" },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Profile */}
          <div className="lg:col-span-3">
            <ProfileSidebar
              userName={displayName}
              userAvatar={profileAvatar}
              company={businessName}
              role={professionalRole}
              postsCount={String(profileStats?.data?.postsCount ?? 0)}
              connectionsCount={String(profileStats?.data?.connectionsCount ?? 0)}
              coverImageUrl={coverImageUrl}
              activeTab={viewMode === "timeline" ? "all" : viewMode === "my" ? "my" : viewMode === "saved" ? "saved" : undefined}
              onAllFeedsClick={() => {
                // Clear the route post ID when switching to all feeds
                if (routePostId) {
                  navigate('/business/my-feed');
                }
                setViewMode("timeline");
              }}
              onMyFeedsClick={() => {
                // Clear the route post ID when switching to my feeds
                if (routePostId) {
                  navigate('/business/my-feed');
                }
                setViewMode("my");
              }}
              onSavedPostsClick={() => {
                // Clear the route post ID when switching to saved posts
                if (routePostId) {
                  navigate('/business/my-feed');
                }
                setViewMode("saved");
              }}
              onMessagesClick={() => navigate("/business/my-feed/chat")}
            />
          </div>
          {/* Center - Feed */}
          <div className="lg:col-span-6">
            <div className="mb-6">
              <CreatePostInput
                userName={displayName}
                userAvatar={profileAvatar}
                onClick={() => setIsCreatePostModalOpen(true)}
              />
            </div>

            {/* Scrollable Posts List */}
            <div
              className="space-y-6 h-[calc(100vh-280px)] overflow-y-auto pr-1 overflow-hidden custom-scrollbar"
              onScroll={handleFeedScroll}
            >

              {(() => {
                const isLoading = routePostId ? singlePostQuery.isLoading : ((viewMode === "timeline" && timelineLoading) || (viewMode === "my" && (userPostsLazy.isFetching || userPostsLazy.isLoading)) || (viewMode === "saved" && savedQuery.isLoading));
                const hasError = routePostId ? Boolean(singlePostQuery.error) : ((viewMode === "timeline" && !!timelineError) || (viewMode === "my" && !!userPostsLazy.error) || (viewMode === "saved" && !!savedQuery.error));
                if (isLoading) return <div className="text-gray-300">Loading feed…</div>;
                if (hasError) return <div className="text-red-400">Failed to load feed</div>;
                if (apiPosts.length === 0) return <div className="text-gray-400">No posts yet</div>;
                return (
                  <>
                    {apiPosts.map((post: any) => (
                      <div key={post.id} className="space-y-3">
                        <FeedPost
                          id={post.id}
                          authorName={post.authorName}
                          authorTitle={post.authorTitle}
                          postDate={post.postDate}
                          content={post.content}
                          imageUrl={post.imageUrl}
                          mediaType={post.mediaType}
                          media={post.media}
                          avatarUrl={post.avatarUrl}
                          initialLikes={post.initialLikes}
                          initialLiked={post.initialLiked}
                          initialComments={post.initialComments}
                          contextText={post.contextText}
                          attachment={post.attachment}
                          isRepostOnly={post.isRepostOnly}
                          onLike={handleLike}
                          onComment={handleOpenComments}
                          onSave={handleSave}
                          onShare={handleShare}
                          onRepost={handleRepost}
                          isCommentActive={openCommentsFor === post.id}
                          isRepostActive={openRepostFor === post.id}
                          isOwner={post.isOwner}
                          isSaved={savedPosts.has(post.id) || viewMode === "saved"}
                          authorUserId={post.authorUserId}
                          onUpdate={handleUpdate}
                          onDelete={handleDelete}
                          onReport={setPendingReportPostId}
                          onBlockAuthor={handleBlockAuthor}
                          repostCount={post.repostCount}
                        >
                          {openCommentsFor === post.id && (
                            <CommentsSection
                              key={post.id}
                              postId={post.id}
                              commentText={commentTexts[post.id] || ""}
                              setCommentText={(text) => handleCommentTextChange(post.id, text)}
                              onSubmit={() => handleCommentSubmit(post.id)}
                              refreshToken={commentsRefreshTick}
                              profileAvatar={profileAvatar}
                              refetchTimeline={refetchTimeline}
                            />
                          )}
                        </FeedPost>
                      </div>
                    ))}

                    {viewMode === "timeline" && isFetchingMoreTimeline && (
                      <div className="text-center text-gray-400 py-4">
                        Loading more posts...
                      </div>
                    )}

                    {viewMode === "timeline" && !timelineHasMore && apiPosts.length > 0 && (
                      <div className="text-center text-gray-500 py-4">
                        No more posts
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Right Sidebar - Messages & Groups */}
          <div className="lg:col-span-3">
            <div className="min-h-[400px] max-h-[500px] overflow-y-auto">
              <MessagesSidebar
                messages={messages}
                onMessageClick={handleMessageClick}
                onViewMore={handleViewAllMessages}
                showViewMore={messages.length > 0}
              />
            </div>
            <div className="mt-0">
              <GroupsSidebar
                groups={groups}
                onGroupClick={handleGroupClick}
                onViewMore={handleViewAllGroups}
                showViewMore={true}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Repost Choice Popover (anchored) */}
      {openRepostFor && repostPopoverPos && (
        <div className="fixed inset-0 z-50" onClick={() => { setOpenRepostFor(null); setRepostPopoverPos(null); setRepostAnchorEl(null); }}>
          <div
            className="absolute bg-[#161b22] border border-gray-700 shadow-xl rounded-lg w-[320px]"
            style={{ top: repostPopoverPos.y, left: repostPopoverPos.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-2">
              <button
                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-700 text-left"
                onClick={() => doRepostWithThoughts(openRepostFor)}
              >
                <svg className="w-5 h-5 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden>
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <div>
                  <div className="text-white text-sm font-medium">Repost with your thoughts</div>
                  <div className="text-xs text-gray-400">Create a new post with this post attached</div>
                </div>
              </button>
              <button
                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-700 text-left"
                onClick={() => doInstantRepost(openRepostFor)}
              >
                <svg className="w-5 h-5 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden>
                  <polyline points="17 1 21 5 17 9"></polyline>
                  <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                  <polyline points="7 23 3 19 7 15"></polyline>
                  <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                </svg>
                <div>
                  <div className="text-white text-sm font-medium">Repost</div>
                  <div className="text-xs text-gray-400">Instantly bring this post to others' feeds</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal (Add) */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen && !isRepostWithThoughts && !isEditMode}
        onClose={() => { setIsCreatePostModalOpen(false); }}
        onPost={handleModalPost}
        userName={displayName}
        userAvatar={profileAvatar}
        modalTitle="Create a Post"
        submitText="Post"
      />

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={isCreatePostModalOpen && !isRepostWithThoughts && isEditMode}
        onClose={() => { setIsCreatePostModalOpen(false); setIsEditMode(false); setEditingPostId(null); }}
        onUpdate={handleModalPost}
        userName={displayName}
        userAvatar={profileAvatar}
        initialContent={editingInitialContent}
        initialMedia={editingInitialMedia}
        modalTitle="Update Post"
        submitText="Update"
      />

      {/* Repost Modal (with thoughts) */}
      <RepostModal
        isOpen={isCreatePostModalOpen && isRepostWithThoughts}
        onClose={() => { setIsCreatePostModalOpen(false); setIsRepostWithThoughts(false); setRepostSourcePostId(null); }}
        onRepost={(text) => handleModalPost(text)}
        userName={displayName}
        userAvatar={profileAvatar}
        attachment={renderRepostPreview(repostSourcePostId)}
      />

      <ReportDialog
        isOpen={pendingReportPostId !== null}
        onClose={() => setPendingReportPostId(null)}
        onConfirm={confirmReportPost}
        isSubmitting={isReportingPost}
        contentLabel="post"
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmPost !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <GradientContainer className="w-full max-w-sm">
            <div className="p-5 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Delete post?</h2>
                <p className="mt-1 text-sm text-gray-300">
                  Are you sure you want to delete this post? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPost(null)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-200 bg-gray-700 hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-lg text-sm text-white bg-[#D85D27] hover:bg-[#C24F20]"
                >
                  Delete
                </button>
              </div>
            </div>
          </GradientContainer>
        </div>
      )}
    </div>
  );
}
