import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CreatePostInput, CreatePostModal, EditPostModal } from "../../components/feed";
import { ProfessionalLayout, ProfessionalSuggestions, RecentMessages } from "../../components/professional";
import { useToast } from "../../components/toast/ToastProvider";
import { useAppSelector } from "../../app/store";
import GradientContainer from "../../components/common/GradientContainer";
import {
  useGetFeedQuery,
  useLazyGetFeedQuery,
  useGetUserFeedQuery,
  useGetSavedFeedQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useLikePostMutation,
  useUnlikePostMutation,
  useSavePostMutation,
  useUnsavePostMutation,
  useRepostMutation,
  useGetCommentsQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useLikeCommentMutation,
  useUnlikeCommentMutation,
  usePresignUploadMutation,
  useLazyGetPostQuery,
} from "../../services/professional/professionalFeedApi";
import ProfessionalFeedPost from "../../components/professional/ProfessionalFeedPost";
import type { FeedMedia } from "../../services/professional/professionalFeedApi";
import { useLazyGetProfileSummaryQuery } from "../../services/professional/professionalSidebarApi";
import { useBlockUserMutation, useReportContentMutation } from "../../services/moderationApi";
import type { ModerationReason } from "../../services/moderationApi";
import { ReportDialog } from "../../components/common/ReportDialog";

// Comments Section Component (styled similar to business MyFeedPage)
const CommentsSection: React.FC<{ postId: string }> = ({ postId }) => {
  const user = useAppSelector((s) => s.auth.user);
  const profileAvatar = user?.basicInfo?.profilePhotoUrl || undefined;
  const [commentText, setCommentText] = useState("");
  const { data: commentsData, isLoading, refetch } = useGetCommentsQuery({ postId, page: 1 });
  const [addComment] = useAddCommentMutation();
  const [updateComment] = useUpdateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [likeComment] = useLikeCommentMutation();
  const [unlikeComment] = useUnlikeCommentMutation();

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentText, setEditedCommentText] = useState("");
  const { showToast } = useToast();
  const [reportContent] = useReportContentMutation();
  const [pendingReportComment, setPendingReportComment] = useState<{ id: string; authorId?: string } | null>(null);
  const [isReportingComment, setIsReportingComment] = useState(false);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.comment-menu') && !target.closest('.comment-menu-trigger')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const confirmReportComment = async (reason: ModerationReason, details: string) => {
    if (!pendingReportComment) return;
    try {
      setIsReportingComment(true);
      await reportContent({
        contentType: "PROFESSIONAL_COMMENT",
        contentId: pendingReportComment.id,
        targetUserId: pendingReportComment.authorId,
        reason,
        details: details || undefined,
      }).unwrap();
      showToast({
        title: "Comment reported and hidden",
        description: "Sent to admins for review.",
        kind: "success",
        durationMs: 2000,
      });
      setPendingReportComment(null);
      refetch();
    } catch (e) {
      showToast({ title: "Failed to report comment", kind: "error" });
    } finally {
      setIsReportingComment(false);
    }
  };

  const comments = commentsData?.data?.items || [];

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment({ postId, text: commentText.trim() }).unwrap();
      setCommentText("");
      refetch();
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleToggleLike = async (c: any) => {
    try {
      if (c.meta?.liked) {
        await unlikeComment({ commentId: String(c.id) }).unwrap();
      } else {
        await likeComment({ commentId: String(c.id) }).unwrap();
      }
      refetch();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to toggle like on comment', e);
    }
  };

  const handleStartEdit = (c: any) => {
    setOpenMenuId(null);
    setEditingCommentId(String(c.id));
    setEditedCommentText(String(c.text || ""));
  };

  const handleSaveEdit = async () => {
    if (!editingCommentId) return;
    try {
      await updateComment({ commentId: String(editingCommentId), text: editedCommentText }).unwrap();
      setEditingCommentId(null);
      setEditedCommentText("");
      refetch();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to update comment', e);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditedCommentText("");
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment({ commentId }).unwrap();
      refetch();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete comment', e);
    }
  };

  return (
    <div className="mt-3">
      {/* Add comment */}
      <div className="flex items-start gap-2.5 mb-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
          {profileAvatar ? (
            <img
              src={profileAvatar}
              alt={user?.name || 'User'}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <span className="w-full h-full flex items-center justify-center bg-gray-700 text-white text-base font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          )}
        </div>

        {/* Input + Send */}
        <div className="flex-1 flex items-center bg-[#1E293B] border border-gray-600 rounded-full overflow-hidden">
          <input
            type="text"
            className="flex-1 bg-transparent px-3 py-1.5 text-gray-200 focus:outline-none text-sm h-9"
            placeholder="Write a comment…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
          />
          <button
            onClick={handleSubmitComment}
            disabled={!commentText.trim()}
            className={`px-3 h-9 flex items-center justify-center ${commentText.trim() ? 'bg-[#D85D27] text-white hover:bg-[#C24F20]' : 'text-gray-500 cursor-not-allowed'} transition-colors text-sm`}
          >
            Send
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="mt-2 ml-2 pl-2 border-l-2 border-gray-700">
        {isLoading && <div className="text-gray-300 text-sm py-2">Loading comments…</div>}
        {!isLoading && comments.length === 0 && <div className="text-gray-400 text-xs py-1">No comments yet</div>}
        {!isLoading && comments.length > 0 && (
          <div className="space-y-3">
            {comments.map((c: any, idx: number) => (
              <div key={c.id ?? idx} className="group flex items-start gap-2 p-1.5 hover:bg-gray-800/30 rounded transition-colors">
                <div className="w-7 h-7 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {c.author?.photoUrlDecrypted || c.author?.photoUrl ? (
                    <img src={c.author.photoUrlDecrypted || c.author.photoUrl} alt={c.author?.name || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-white">{String(c.author?.name || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-white">{c.author?.name || 'User'}</span>
                      <span className="text-[10px] text-gray-400">{c.createdAt ? formatDate(c.createdAt) : ''}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Like button for all */}
                      <button
                        onClick={() => handleToggleLike(c)}
                        className={`flex items-center gap-1 text-[11px] ${c.meta?.liked ? 'text-orange-400' : 'text-gray-400'} hover:text-gray-200`}
                        title={c.meta?.liked ? 'Unlike' : 'Like'}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={c.meta?.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <span>{c.stats?.likes ?? 0}</span>
                      </button>
                      {/* Menu for edit/delete if owner */}
                      {(c.meta?.canEdit || String(c.author?.id || c.author?._id) === String(user?._id)) ? (
                        <div className="relative">
                          <button
                            className="comment-menu-trigger text-gray-400 hover:text-gray-200"
                            onClick={() => setOpenMenuId(prev => prev === String(c.id) ? null : String(c.id))}
                            aria-haspopup="true"
                            aria-expanded={openMenuId === String(c.id)}
                            title="More"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="5" cy="12" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="19" cy="12" r="2" />
                            </svg>
                          </button>
                          {openMenuId === String(c.id) && (
                            <div className="comment-menu absolute right-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
                              <button
                                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-200 hover:bg-gray-700"
                                onClick={() => handleStartEdit(c)}
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                                  <path d="M16.5 3.5a2.121 2.121 0 013 3L12 14l-3 1 1-3 6.5-8.5z" />
                                </svg>
                                <span>Edit Comment</span>
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-gray-700"
                                onClick={() => handleDelete(String(c.id))}
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
                                  <path d="M10 11v6M14 11v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h12" />
                                </svg>
                                <span>Delete Comment</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            className="comment-menu-trigger text-gray-400 hover:text-gray-200"
                            onClick={() => setOpenMenuId(prev => prev === String(c.id) ? null : String(c.id))}
                            aria-haspopup="true"
                            aria-expanded={openMenuId === String(c.id)}
                            title="More"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="5" cy="12" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="19" cy="12" r="2" />
                            </svg>
                          </button>
                          {openMenuId === String(c.id) && (
                            <div className="comment-menu absolute right-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
                              <button
                                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-amber-300 hover:bg-gray-700"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setPendingReportComment({ id: String(c.id), authorId: String(c.author?.id || c.author?._id || "") || undefined });
                                }}
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 2H20l-3 6 3 6h-7.5l-1-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span>Report Comment</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {editingCommentId === String(c.id) ? (
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        value={editedCommentText}
                        onChange={(e) => setEditedCommentText(e.target.value)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <button onClick={handleSaveEdit} className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">Save</button>
                      <button onClick={handleCancelEdit} className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">Cancel</button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-200 mt-0.5 break-words">{c.text}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

function ProfessionalFeed() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get initial tab from URL or default to "feeds"
  const tabFromUrl = searchParams.get("tab") as "feeds" | "my" | "saved" | null;
  const initialTab = tabFromUrl && ["feeds", "my", "saved"].includes(tabFromUrl) ? tabFromUrl : "feeds";

  const [feedTab, setFeedTab] = useState<"feeds" | "my" | "saved">(initialTab);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<{ id: string; text: string; media: FeedMedia[] } | null>(null);
  const [isRepostWithThoughts, setIsRepostWithThoughts] = useState(false);
  const [repostSourcePostId, setRepostSourcePostId] = useState<string | number | null>(null);
  const [deleteConfirmPostId, setDeleteConfirmPostId] = useState<string | number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const FEED_LIMIT = 20;
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotal, setFeedTotal] = useState(0);
  const [isFetchingMoreFeed, setIsFetchingMoreFeed] = useState(false);
  const [pendingReportPostId, setPendingReportPostId] = useState<string | number | null>(null);
  const [isReportingPost, setIsReportingPost] = useState(false);

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: feedTab }, { replace: true });
  }, [feedTab, setSearchParams]);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | number | null>(null);
  const [openRepostFor, setOpenRepostFor] = useState<string | number | null>(null);
  const [repostPopoverPos, setRepostPopoverPos] = useState<{ x: number; y: number } | null>(null);

  // Get user info from Redux
  const user = useAppSelector((state) => state.auth.user);

  // Fetch feeds based on active tab
  const { data: feedData, isLoading: feedLoading, refetch: refetchFeed } = useGetFeedQuery(
    { page: 1, limit: FEED_LIMIT, },
    { skip: feedTab !== "feeds" },
  );
  const { data: myFeedData, isLoading: myFeedLoading } = useGetUserFeedQuery(
    { userId: user?._id || "", page: 1, limit: 50 },
    { skip: feedTab !== "my" || !user?._id },
  );
  const { data: savedFeedData, isLoading: savedFeedLoading, refetch: refetchSavedFeed } = useGetSavedFeedQuery(
    { page: 1, limit: 50 },
    { skip: feedTab !== "saved" },
  );

  // Queries
  const [fetchProfileSummary] = useLazyGetProfileSummaryQuery();

  // Mutations
  const [createPost] = useCreatePostMutation();
  const [updatePost] = useUpdatePostMutation();
  const [deletePost] = useDeletePostMutation();
  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();
  const [savePost] = useSavePostMutation();
  const [unsavePost] = useUnsavePostMutation();
  const [repost] = useRepostMutation();
  const [presignUpload] = usePresignUploadMutation();
  const [reportContent] = useReportContentMutation();
  const [blockUser] = useBlockUserMutation();
  const [getPost] = useLazyGetPostQuery();
  const [fetchMoreFeed] = useLazyGetFeedQuery();

  // Toast
  const { showToast } = useToast();

  const refetchActiveFeed = () => {
    if (feedTab === "feeds") refetchFeed();
    if (feedTab === "saved") refetchSavedFeed?.();
  };

  const confirmReportPost = async (reason: ModerationReason, details: string) => {
    if (!pendingReportPostId) return;
    const postId = pendingReportPostId;
    const post = posts.find((item: any) => String(item.id) === String(postId));
    try {
      setIsReportingPost(true);
      await reportContent({
        contentType: "PROFESSIONAL_POST",
        contentId: String(postId),
        targetUserId: post?.author?.id || post?.authorUserId,
        reason,
        details: details || undefined,
      }).unwrap();
      showToast({ title: "Post reported and hidden", kind: "success", durationMs: 2000 });
      setPendingReportPostId(null);
      refetchActiveFeed();
    } catch {
      showToast({ title: "Failed to report post", kind: "error" });
    } finally {
      setIsReportingPost(false);
    }
  };

  const handleBlockAuthor = async (authorUserId: string, postId: string | number) => {
    try {
      await blockUser({
        userId: authorUserId,
        reason: "HARASSMENT",
        sourceContentType: "PROFESSIONAL_POST",
        sourceContentId: String(postId),
      }).unwrap();
      showToast({ title: "Member blocked and content hidden", kind: "success", durationMs: 2000 });
      refetchActiveFeed();
    } catch {
      showToast({ title: "Failed to block member", kind: "error" });
    }
  };
  const [savedOverrides, setSavedOverrides] = useState<Record<string | number, boolean>>({});

  useEffect(() => {
    const items = feedData?.data?.items || [];

    setFeedPosts(items);
    setFeedPage(feedData?.data?.page || 1);
    setFeedTotal(feedData?.data?.total || 0);
  }, [feedData]);
  // Clear transient overrides when switching tabs to avoid stale visual state
  useEffect(() => {
    setSavedOverrides({});
  }, [feedTab]);

  // Get current feed data based on active tab
  const currentFeedData = feedTab === "feeds" ? feedData : feedTab === "my" ? myFeedData : savedFeedData;
  const isLoading = feedTab === "feeds" ? feedLoading : feedTab === "my" ? myFeedLoading : savedFeedLoading;
  const posts =
    feedTab === "feeds"
      ? feedPosts
      : currentFeedData?.data?.items || [];
  const hasMoreFeed = feedTab === "feeds" && feedPosts.length < feedTotal;

  const feedsTotal = feedData?.data?.total ?? 0;
  const myTotal = myFeedData?.data?.total ?? 0;
  const savedTotal = savedFeedData?.data?.total ?? 0;

  const loadMoreProfessionalFeed = async () => {
    if (feedTab !== "feeds") return;
    if (isFetchingMoreFeed) return;
    if (!hasMoreFeed) return;

    try {
      setIsFetchingMoreFeed(true);

      const nextPage = feedPage + 1;

      const response: any = await fetchMoreFeed({
        page: nextPage,
        limit: FEED_LIMIT,
      }).unwrap();

      const nextItems = response?.data?.items || [];

      setFeedPosts((prev) => {
        const existingIds = new Set(prev.map((item: any) => String(item.id)));

        const uniqueItems = nextItems.filter(
          (item: any) => !existingIds.has(String(item.id))
        );

        return [...prev, ...uniqueItems];
      });

      setFeedPage(response?.data?.page || nextPage);
      setFeedTotal(response?.data?.total ?? feedTotal);
    } catch (error) {
      console.error("Failed to load more professional feed:", error);
    } finally {
      setIsFetchingMoreFeed(false);
    }
  };

  const handleProfessionalFeedScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (feedTab !== "feeds") return;

    const target = event.currentTarget;

    const scrollBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;

    if (scrollBottom < 200) {
      loadMoreProfessionalFeed();
    }
  };

  const handleLike = async (postId: string | number) => {
    const post = posts.find((p) => p.id === postId);
    const isLiked = post?.meta.liked;

    try {
      if (isLiked) {
        // Unlike
        await unlikePost({ postId: String(postId) }).unwrap();
      } else {
        // Like
        await likePost({ postId: String(postId) }).unwrap();
      }
    } catch (error) {
      console.error("Failed to like/unlike post:", error);
    }
  };

  const handleOpenComments = (postId: string | number) => {
    setOpenCommentsFor((prev) => (prev === postId ? null : postId));
  };

  const handleSave = async (postId: string | number) => {
    const post = posts.find((p) => p.id === postId);
    const isSaved = post?.meta.saved;

    if (isSaved) {
      // Unsave the post
      try {
        // optimistic UI
        setSavedOverrides((prev) => ({ ...prev, [postId]: false }));
        await unsavePost({ postId: String(postId) }).unwrap();
        if (feedTab === "saved") {
          refetchSavedFeed?.();
        }
        showToast({ title: "Post unsaved", kind: "success", durationMs: 2000 });
      } catch (error) {
        console.error("Failed to unsave post:", error);
        // If state already reflects unsaved (server may be idempotent), treat as success
        const postAfter = posts.find((p) => p.id === postId);
        const override = savedOverrides[String(postId) as keyof typeof savedOverrides];
        const finalSaved = (override !== undefined ? override : postAfter?.meta.saved) === true;
        if (!finalSaved) {
          showToast({ title: "Post unsaved", kind: "success", durationMs: 2000 });
        } else {
          // revert optimistic change
          setSavedOverrides((prev) => ({ ...prev, [postId]: true }));
          showToast({ title: "Failed to unsave post", kind: "error" });
        }
      }
    } else {
      // Save the post
      try {
        // optimistic UI
        setSavedOverrides((prev) => ({ ...prev, [postId]: true }));
        await savePost({ postId: String(postId) }).unwrap();
        if (feedTab === "saved") {
          refetchSavedFeed?.();
        }
        showToast({ title: "Post saved", kind: "success", durationMs: 2000 });
      } catch (error) {
        console.error("Failed to save post:", error);
        // If state already reflects saved (server may be idempotent), treat as success
        const postAfter = posts.find((p) => p.id === postId);
        const override = savedOverrides[String(postId) as keyof typeof savedOverrides];
        const finalSaved = (override !== undefined ? override : postAfter?.meta.saved) === true;
        if (finalSaved) {
          showToast({ title: "Post saved", kind: "success", durationMs: 2000 });
        } else {
          // revert optimistic change
          setSavedOverrides((prev) => ({ ...prev, [postId]: false }));
          showToast({ title: "Failed to save post", kind: "error" });
        }
      }
    }
  };

  const handleShare = async (postId: string | number) => {
    try {
      const url = `${window.location.origin}/professional/post/${postId}`;
      const title = "Ekam Post";
      const text = "Check out this post";
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        showToast({ title: "Link copied", kind: "success", durationMs: 2000 });
      } else {
        // Fallback: create a temp input
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast({ title: "Link copied", kind: "success", durationMs: 2000 });
      }
    } catch (e) {
      console.error('Share failed', e);
      showToast({ title: "Failed to share", kind: "error" });
    }
  };

  const handleEdit = async (postId: string | number) => {
    try {
      // Fetch the post data
      const result = await getPost({ postId: String(postId) }).unwrap();
      if (result.success && result.data) {
        setEditingPost({
          id: String(postId),
          text: result.data.text,
          media: result.data.media,
        });
        setIsEditMode(true);
        setIsCreatePostModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch post:", error);
      showToast({ title: "Failed to load post for editing", kind: "error" });
    }
  };

  const handleDelete = (postId: string | number) => {
    setDeleteConfirmPostId(postId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmPostId) return;
    try {
      await deletePost({ postId: String(deleteConfirmPostId) }).unwrap();
    } catch (error) {
      console.error("Failed to delete post:", error);
    } finally {
      setDeleteConfirmPostId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmPostId(null);
  };

  const handleCreatePost = async (text: string, files?: File[]) => {
    try {
      const mediaArray: Array<{ url: string; type: string }> = [];

      // If editing, keep existing media if no new files
      if (editingPost && (!files || files.length === 0)) {
        // Keep existing media
        editingPost.media.forEach((m: FeedMedia) => {
          mediaArray.push({
            url: m.url || m.key || "",
            type: m.type,
          });
        });
      }

      // If there are files, upload them to S3 first
      if (files && files.length > 0) {
        console.log("Files to upload:", files);

        for (const file of files) {
          try {
            // Step 1: Get presigned URL
            const mime = file.type || "application/octet-stream";
            const kind: "image" | "video" | "file" = mime.startsWith("video/")
              ? "video"
              : mime.startsWith("image/")
                ? "image"
                : "file";

            const presignResponse = await presignUpload({
              mime,
              size: String(file.size),
              kind,
            }).unwrap();

            console.log("Presign response:", presignResponse);

            // Step 2: Upload file to S3 using the presigned URL
            const uploadResponse = await fetch(presignResponse.data.uploadUrl, {
              method: "PUT",
              body: file,
              headers: {
                "Content-Type": file.type,
              },
            });

            if (!uploadResponse.ok) {
              throw new Error(`Upload failed with status: ${uploadResponse.status}`);
            }

            console.log("File uploaded successfully to S3");

            // Step 3: Extract file extension (backend will transform it to "image" or "video")
            const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";

            // Step 4: Add to media array - backend expects { url, type }
            mediaArray.push({
              url: presignResponse.data.key, // S3 key as url
              type: fileExtension, // e.g., "jpeg", "png", "mp4" - backend transforms to "image"/"video"
            });
          } catch (presignError) {
            console.error("Failed to upload file:", presignError);
            showToast({ title: "Failed to upload media", kind: "error" });
            return; // Stop if upload fails
          }
        }
      }

      // Step 5: Create, update, or repost the post
      if (isRepostWithThoughts && repostSourcePostId) {
        // Repost with thoughts
        await repost({ postId: String(repostSourcePostId), text }).unwrap();
        showToast({ title: "Reposted", kind: "success", durationMs: 2000 });
        setIsRepostWithThoughts(false);
        setRepostSourcePostId(null);
      } else if (editingPost) {
        // Update existing post
        await updatePost({ postId: editingPost.id, text, media: mediaArray }).unwrap();
        showToast({ title: "Post updated", kind: "success", durationMs: 2000 });
        setEditingPost(null);
      } else {
        // Create new post
        await createPost({ text, media: mediaArray }).unwrap();
        showToast({ title: "Posted", kind: "success", durationMs: 2000 });

        // Refresh profile summary after creating a post
        if (user?._id) {
          fetchProfileSummary({ userId: user._id });
        }

        // Refresh profile summary after creating a post
        if (user?._id) {
          fetchProfileSummary({ userId: user._id });
        }
      }

      setIsCreatePostModalOpen(false);
    } catch (error) {
      console.error("Failed to save post:", error);
      showToast({ title: editingPost ? "Failed to update post" : "Failed to create post", kind: "error" });
    }
  };

  const handleUpdatePost = async (content: string, media?: Array<File | { key?: string; url?: string; type?: "image" | "video" }>) => {
    try {
      if (!editingPost) return;

      const mediaArray: Array<{ url: string; type: string }> = [];

      for (const item of media || []) {
        if (item instanceof File) {
          const mime = item.type || "application/octet-stream";
          const kind: "image" | "video" | "file" = mime.startsWith("video/")
            ? "video"
            : mime.startsWith("image/")
              ? "image"
              : "file";

          const presignResponse = await presignUpload({
            mime,
            size: String(item.size),
            kind,
          }).unwrap();

          const uploadResponse = await fetch(presignResponse.data.uploadUrl, {
            method: "PUT",
            body: item,
            headers: {
              "Content-Type": item.type,
            },
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed with status: ${uploadResponse.status}`);
          }

          const fileExtension = item.name.split(".").pop()?.toLowerCase() || "";

          mediaArray.push({
            url: presignResponse.data.key,
            type: fileExtension,
          });
          continue;
        }

        const mediaUrl = item.url || item.key || "";
        if (mediaUrl) {
          mediaArray.push({
            url: mediaUrl,
            type: item.type || "image",
          });
        }
      }

      await updatePost({ postId: editingPost.id, text: content, media: mediaArray }).unwrap();
      showToast({ title: "Post updated", kind: "success", durationMs: 2000 });
      setEditingPost(null);
      setIsCreatePostModalOpen(false);
      setIsEditMode(false);
    } catch (error) {
      console.error("Failed to update post:", error);
      showToast({ title: "Failed to update post", kind: "error" });
    }
  };

  const handleRepost = (postId: string | number, e?: React.MouseEvent) => {
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
      // Open modal for repost with thoughts
      setIsRepostWithThoughts(true);
      setRepostSourcePostId(postId);
      setIsCreatePostModalOpen(true);
      setOpenRepostFor(null);
      setRepostPopoverPos(null);
    } else {
      // Instant repost
      try {
        await repost({ postId }).unwrap();
        setOpenRepostFor(null);
        setRepostPopoverPos(null);
        showToast({ title: "Reposted", kind: "success", durationMs: 2000 });

        // Refresh profile summary after reposting
        if (user?._id) {
          fetchProfileSummary({ userId: user._id });
        }
      } catch (error) {
        console.error("Failed to repost:", error);
        showToast({ title: "Failed to repost", kind: "error" });
      }
    }
  };

  // Helper function to render repost preview
  const renderRepostPreview = (sourceId: string | number | null) => {
    if (!sourceId) return null;
    const post = posts.find((p) => String(p.id) === String(sourceId));
    if (!post) return null;
    const previewMedia = (post.media || [])
      .map((item: any) => ({
        url: item.url || item.key || "",
        type: item.type as "image" | "video",
      }))
      .filter((item: any) => item.url);

    return (
      <div className="p-4 bg-[#0f1419] border border-gray-700 rounded-lg">
        <div className="flex items-start gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center shrink-0">
            {post.author.photoUrlDecrypted || post.author.photoUrl ? (
              <img
                src={post.author.photoUrlDecrypted || post.author.photoUrl}
                alt={post.author.name || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-white">{(post.author.name || "U").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="text-white text-sm font-medium leading-tight">{post.author.name || "Unknown User"}</div>
            <div className="text-[10px] text-gray-500 leading-tight">{formatDate(post.createdAt)}</div>
          </div>
        </div>
        {post.text && (
          <div className="text-[13px] text-gray-300 mb-2 wrap-break-word whitespace-pre-wrap">{post.text}</div>
        )}
        {previewMedia.length > 0 && (
          <div className={`rounded-sm overflow-hidden grid gap-1 ${previewMedia.length === 1 ? "" : "grid-cols-2"}`}>
            {previewMedia.map((item: any, index: number) => (
              <div key={`${item.url}-${index}`} className="h-28 md:h-32 bg-black overflow-hidden">
                {item.type === "video" ? (
                  <video src={item.url} controls className="w-full h-full object-cover bg-black" />
                ) : (
                  <img src={item.url} alt="attachment" className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Get breadcrumbs based on active tab
  const getBreadcrumbs = () => {
    const baseBreadcrumbs = [
      { label: "Professional", onClick: () => navigate("/professional/feed") },
      { label: "Feeds", onClick: () => navigate("/professional/feed?tab=feeds") },
    ];

    switch (feedTab) {
      case "my":
        return [...baseBreadcrumbs, { label: "My Feed" }];
      case "saved":
        return [...baseBreadcrumbs, { label: "Saved Posts" }];
      default:
        return baseBreadcrumbs;
    }
  };

  return (
    <>
    <ProfessionalLayout breadcrumbs={getBreadcrumbs()} contentClassName="lg:col-span-9">
      <style>{`
        /* Custom scrollbar styles */
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
      {/* Feed Navigation Tabs - Mobile */}
      <div className="lg:hidden pb-4">
        <div className="p-1 rounded-lg border border-gray-700 bg-[#1a2332] flex">
          <button
            onClick={() => setFeedTab("feeds")}
            className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-all ${feedTab === "feeds"
                ? "bg-[#D85D27] text-white shadow-sm ring-1 ring-orange-400/30"
                : "text-gray-400 hover:text-white"
              }`}
          >
            <div className="flex items-center justify-center">
              Feeds
              {feedTab === "feeds" && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {feedsTotal}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setFeedTab("my")}
            className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-all ${feedTab === "my"
                ? "bg-[#D85D27] text-white shadow-sm ring-1 ring-orange-400/30"
                : "text-gray-400 hover:text-white"
              }`}
          >
            <div className="flex items-center justify-center">
              My Feed
              {feedTab === "my" && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {myTotal}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setFeedTab("saved")}
            className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-all ${feedTab === "saved"
                ? "bg-[#D85D27] text-white shadow-sm ring-1 ring-orange-400/30"
                : "text-gray-400 hover:text-white"
              }`}
          >
            <div className="flex items-center justify-center">
              Saved
              {feedTab === "saved" && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {savedTotal}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Center - Feed */}
        <div className="lg:col-span-8">
          {/* Feed Navigation Tabs - Desktop */}
          <div className="hidden lg:block pb-4">
            <div className="p-1 rounded-lg border border-gray-700 bg-[#1a2332] flex">
              <button
                onClick={() => setFeedTab("feeds")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${feedTab === "feeds"
                    ? "bg-[#D85D27] text-white shadow-sm ring-1 ring-orange-400/30"
                    : "text-gray-400 hover:text-white"
                  }`}
              >
                <div className="flex items-center justify-center">
                  Feeds
                  {feedTab === "feeds" && (
                    <span className="ml-2 px-2 py-0.5 bg-white text-[#D85D27] text-xs rounded-sm">
                      {feedsTotal}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setFeedTab("my")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${feedTab === "my"
                    ? "bg-[#D85D27] text-white shadow-sm ring-1 ring-orange-400/30"
                    : "text-gray-400 hover:text-white"
                  }`}
              >
                <div className="flex items-center justify-center">
                  My Feed
                  {feedTab === "my" && (
                    <span className="ml-2 px-2 py-0.5 bg-white text-[#D85D27] text-xs rounded-sm">
                      {myTotal}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setFeedTab("saved")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${feedTab === "saved"
                    ? "bg-[#D85D27] text-white shadow-sm ring-1 ring-orange-400/30"
                    : "text-gray-400 hover:text-white"
                  }`}
              >
                <div className="flex items-center justify-center">
                  Saved Posts
                  {feedTab === "saved" && (
                    <span className="ml-2 px-2 py-0.5 bg-white text-[#D85D27] text-xs rounded-sm">
                      {savedTotal}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Feed Scroll Container (desktop only) */}
          <div
            className="lg:h-[calc(100vh-280px)] lg:overflow-y-auto lg:pr-1 custom-scrollbar"
            onScroll={handleProfessionalFeedScroll}
          >
            {/* Create Post Input */}
            <div className="mb-6 mt-4">
              <CreatePostInput
                userName={user?.name || "User"}
                userAvatar={undefined}
                onClick={() => setIsCreatePostModalOpen(true)}
              />
            </div>
            {/* Loading State */}
            {isLoading && (
              <div className="space-y-6 pb-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-[#161b22] rounded-lg border border-gray-700 p-6 animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gray-700"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-gray-700 rounded w-1/6"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Posts List */}
            {!isLoading && (
              <div className="space-y-6 pb-6">
                {posts.length === 0 ? (
                  <div className="bg-[#161b22] rounded-lg border border-gray-700 p-8 text-center">
                    <p className="text-gray-400">No posts yet</p>
                  </div>
                ) : (
                  posts.map((post) => {
                    // Check if this is a repost: treat as repost ONLY if original has meaningful content
                    const original = post.original;
                    const isRepost = Boolean(
                      original && (
                        (original as any)?.id ||
                        (typeof original.text === 'string' && original.text.trim().length > 0) ||
                        (Array.isArray(original.media) && original.media.length > 0) ||
                        (original as any)?.createdAt
                      )
                    );
                    const hasOwnContent = post.text && post.text.trim().length > 0;

                    // Build attachment object if this is a repost
                    const attachment =
                      isRepost && post.original
                        ? {
                          authorName: post.original.author.name || "Unknown User",
                          postDate: formatDate(post.original.createdAt || post.createdAt),
                          content: post.original.text,
                          imageUrl: post.original.media?.[0]?.url || post.original.media?.[0]?.key,
                          mediaType: post.original.media?.[0]?.type as "image" | "video" | undefined,
                          media: post.original.media
                            ?.map((item: any) => ({
                              url: item.url || item.key || "",
                              type: item.type as "image" | "video",
                            }))
                            .filter((item: any) => item.url),
                          avatarUrl: post.original.author.photoUrlDecrypted || post.original.author.photoUrl,
                        }
                        : null;

                    // Context text for reposts
                    const contextText = isRepost ? `${post.author.name || "Unknown User"} reposted` : undefined;

                    return (
                      <div key={post.id} className="space-y-3">
                        <ProfessionalFeedPost
                          id={post.id}
                          authorName={post.author.name || "Unknown User"}
                          authorTitle={post.author.title}
                          postDate={formatDate(post.createdAt)}
                          content={post.text}
                          imageUrl={!isRepost ? post.media[0]?.url || post.media[0]?.key : undefined}
                          mediaType={!isRepost ? (post.media[0]?.type as "image" | "video" | undefined) : undefined}
                          media={!isRepost ? (post.media as any) : undefined}
                          avatarUrl={post.author.photoUrlDecrypted || post.author.photoUrl}
                          initialLikes={post.stats.likes}
                          initialComments={post.stats.comments}
                          repostCount={post.stats.reposts}
                          contextText={contextText}
                          attachment={attachment}
                          isRepostOnly={isRepost && !hasOwnContent}
                          onLike={handleLike}
                          onComment={handleOpenComments}
                          onSave={handleSave}
                          isSaved={
                            savedOverrides[post.id] !== undefined
                              ? savedOverrides[post.id]
                              : Boolean((post as any).youSaved ?? post.meta?.saved)
                          }
                          isLiked={Boolean((post as any).youLiked ?? post.meta?.liked)}
                          onShare={handleShare}
                          onRepost={handleRepost}
                          isCommentActive={openCommentsFor === post.id}
                          isRepostActive={openRepostFor === post.id}
                          isOwner={post.meta.canEdit}
                          authorUserId={post.author?.id || post.authorUserId}
                          onUpdate={() => handleEdit(post.id)}
                          onDelete={() => handleDelete(post.id)}
                          onReport={setPendingReportPostId}
                          onBlockAuthor={handleBlockAuthor}
                        >
                          {openCommentsFor === post.id && <CommentsSection postId={String(post.id)} />}
                        </ProfessionalFeedPost>
                      </div>
                    );
                  })
                )}
                {feedTab === "feeds" && isFetchingMoreFeed && (
                  <div className="text-center text-gray-400 py-4">
                    Loading more posts...
                  </div>
                )}

                {feedTab === "feeds" && !hasMoreFeed && posts.length > 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No more posts
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Suggestions & Messages (non-sticky) */}
        <div className="lg:col-span-4 space-y-6 hidden lg:block">
          {/* Suggestions */}
          <div>
            <ProfessionalSuggestions />
          </div>

          {/* Messages */}
          <div className="mt-6">
            <RecentMessages />
          </div>
        </div>
      </div>

      {/* Repost Choice Popover */}
      {openRepostFor && repostPopoverPos && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => {
            setOpenRepostFor(null);
            setRepostPopoverPos(null);
          }}
        >
          <div
            className="absolute bg-[#161b22] border border-gray-700 shadow-xl rounded-lg w-[320px]"
            style={{ top: repostPopoverPos.y, left: repostPopoverPos.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-2">
              <button
                onClick={() => handleRepostAction(String(openRepostFor), true)}
                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-700 text-left"
              >
                <svg
                  className="w-5 h-5 mt-0.5"
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
                  <div className="text-white text-sm font-medium">Repost with your thoughts</div>
                  <div className="text-xs text-gray-400">Create a new post with this post attached</div>
                </div>
              </button>
              <button
                onClick={() => handleRepostAction(String(openRepostFor), false)}
                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-gray-700 text-left"
              >
                <svg
                  className="w-5 h-5 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  aria-hidden
                >
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmPostId !== null && (
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
                  onClick={handleCancelDelete}
                  className="px-4 py-2 rounded-lg text-sm text-gray-200 bg-gray-700 hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-lg text-sm text-white bg-[#D85D27] hover:bg-[#C24F20]"
                >
                  Delete
                </button>
              </div>
            </div>
          </GradientContainer>
        </div>
      )}

      {/* Create Post Modal (Add) */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen && !isRepostWithThoughts && !isEditMode}
        onClose={() => {
          setIsCreatePostModalOpen(false);
          setIsEditMode(false);
          setEditingPost(null);

        }}
        onPost={handleCreatePost}
        userName={user?.name || "User"}
        userAvatar={undefined}
        modalTitle="Create a Post"
        submitText="Post"
      />

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={isCreatePostModalOpen && !isRepostWithThoughts && isEditMode}
        onClose={() => {
          setIsCreatePostModalOpen(false);
          setIsEditMode(false);
          setEditingPost(null);

        }}
        onUpdate={handleUpdatePost}
        userName={user?.name || "User"}
        userAvatar={undefined}
        initialContent={editingPost?.text || ""}
        initialMedia={editingPost?.media?.map(item => ({
          key: item.key,
          url: item.url,
          type: item.type as "image" | "video"
        }))}
        modalTitle="Edit Post"
        submitText="Update"
      />

      {/* Repost Modal (with thoughts) */}
      {isRepostWithThoughts && (
        <CreatePostModal
          isOpen={isCreatePostModalOpen && isRepostWithThoughts}
          onClose={() => {
            setIsCreatePostModalOpen(false);
            setIsRepostWithThoughts(false);
            setRepostSourcePostId(null);
          }}
          onPost={(content: string, files?: File[]) => {
            handleCreatePost(content, files);
          }}
          userName={user?.name || "User"}
          userAvatar={undefined}
          modalTitle="Repost with your thoughts"
          submitText="Repost"
          attachment={renderRepostPreview(repostSourcePostId)}
          allowEmpty={true}
        />
      )}
      </ProfessionalLayout>
      <ReportDialog
        isOpen={pendingReportPostId !== null}
        onClose={() => setPendingReportPostId(null)}
        onConfirm={confirmReportPost}
        isSubmitting={isReportingPost}
        contentLabel="post"
      />
    </>
  );
}

export default ProfessionalFeed;
