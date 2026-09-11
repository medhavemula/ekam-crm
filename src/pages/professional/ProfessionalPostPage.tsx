import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProfessionalLayout, ProfessionalSuggestions } from "../../components/professional";
import GradientContainer from "../../components/common/GradientContainer";
import {
  useGetPostQuery,
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
} from "../../services/professional/professionalFeedApi";
import ProfessionalFeedPost from "../../components/professional/ProfessionalFeedPost";
import { useAppSelector } from "../../app/store";

// Comments Section Component with owner edit/delete and like support
const CommentsSection: React.FC<{ postId: string }> = ({ postId }) => {
  const user = useAppSelector((s) => s.auth.user);
  const profileAvatar = user?.basicInfo?.profilePhotoUrl || undefined;
  const [commentText, setCommentText] = useState("");
  const { data: commentsData, isLoading, refetch } = useGetCommentsQuery({ postId, page: 1, limit: 20 });
  const [addComment] = useAddCommentMutation();
  const [updateComment] = useUpdateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [likeComment] = useLikeCommentMutation();
  const [unlikeComment] = useUnlikeCommentMutation();

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentText, setEditedCommentText] = useState("");

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
                      ) : null}
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
    </div>
  );
};

function ProfessionalPostPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Fetch the individual post
  const { data: postData, isLoading, error } = useGetPostQuery({ postId: id || "" }, { skip: !id });

  // Mutations
  const [deletePost] = useDeletePostMutation();
  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();
  const [savePost] = useSavePostMutation();
  const [unsavePost] = useUnsavePostMutation();
  const [repost] = useRepostMutation();

  // State
  const [openCommentsFor, setOpenCommentsFor] = useState<string | number | null>(null);
  const [openRepostFor, setOpenRepostFor] = useState<string | number | null>(null);
  const [repostPopoverPos, setRepostPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const post = postData?.data;

  const handleLike = async (postId: string | number) => {
    if (!post) return;
    const isLiked = post.meta.liked;

    try {
      if (isLiked) {
        await unlikePost({ postId: String(postId) }).unwrap();
      } else {
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
    if (!post) return;
    const isSaved = post.meta.saved;

    if (isSaved) {
      try {
        await unsavePost({ postId: String(postId) }).unwrap();
        setToast({ message: "Post unsaved successfully", type: "success" });
        setTimeout(() => setToast(null), 3000);
      } catch (error) {
        console.error("Failed to unsave post:", error);
        setToast({ message: "Failed to unsave post", type: "error" });
        setTimeout(() => setToast(null), 3000);
      }
    } else {
      try {
        await savePost({ postId: String(postId) }).unwrap();
        setToast({ message: "Post saved successfully", type: "success" });
        setTimeout(() => setToast(null), 3000);
      } catch (error) {
        console.error("Failed to save post:", error);
        setToast({ message: "Failed to save post", type: "error" });
        setTimeout(() => setToast(null), 3000);
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
        setToast({ message: "Shared", type: "success" });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setToast({ message: "Link copied to clipboard", type: "success" });
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        setToast({ message: "Link copied to clipboard", type: "success" });
      }
    } catch (e) {
      setToast({ message: "Failed to share", type: "error" });
    } finally {
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleUpdate = () => {
    navigate(`/professional/feed?edit=${id}`);
  };

  const handleDelete = async (postId: string | number) => {
    try {
      await deletePost({ postId: String(postId) }).unwrap();
      setToast({ message: "Post deleted successfully", type: "success" });
      setTimeout(() => {
        navigate("/professional/feed");
      }, 1000);
    } catch (error) {
      console.error("Failed to delete post:", error);
      setToast({ message: "Failed to delete post", type: "error" });
      setTimeout(() => setToast(null), 3000);
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
      navigate(`/professional/feed?repost=${postId}`);
    } else {
      try {
        await repost({ postId }).unwrap();
        setOpenRepostFor(null);
        setRepostPopoverPos(null);
        setToast({ message: "Post reposted successfully", type: "success" });
        setTimeout(() => setToast(null), 3000);
      } catch (error) {
        console.error("Failed to repost:", error);
        setToast({ message: "Failed to repost", type: "error" });
        setTimeout(() => setToast(null), 3000);
      }
    }
  };

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

  if (isLoading) {
    const loadingBreadcrumbs = [
      { label: "Professional", onClick: () => navigate("/professional/feed") },
      { label: "Feed", onClick: () => navigate("/professional/feed") },
      { label: "Post" },
    ];
    return (
      <ProfessionalLayout breadcrumbs={loadingBreadcrumbs} contentClassName="lg:col-span-9">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className="bg-[#161b22] rounded-lg border border-gray-700 p-6 animate-pulse">
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
          </div>
          <div className="lg:col-span-4 hidden lg:block">
            <ProfessionalSuggestions />
          </div>
        </div>
      </ProfessionalLayout>
    );
  }

  if (error || !post) {
    const errorBreadcrumbs = [
      { label: "Professional", onClick: () => navigate("/professional/feed") },
      { label: "Feed", onClick: () => navigate("/professional/feed") },
      { label: "Post" },
    ];
    return (
      <ProfessionalLayout breadcrumbs={errorBreadcrumbs} contentClassName="lg:col-span-9">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className="bg-[#161b22] rounded-lg border border-gray-700 p-8 text-center">
              <p className="text-gray-400">Post not found</p>
              <button
                onClick={() => navigate("/professional/feed")}
                className="mt-4 px-4 py-2 bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg"
              >
                Back to Feed
              </button>
            </div>
          </div>
          <div className="lg:col-span-4 hidden lg:block">
            <ProfessionalSuggestions />
          </div>
        </div>
      </ProfessionalLayout>
    );
  }

  const isRepost = !!post.original;
  const hasOwnContent = post.text && post.text.trim().length > 0;

  const attachment =
    isRepost && post.original
      ? {
          authorName: post.original.author.name || "Unknown User",
          postDate: formatDate(post.original.createdAt || post.createdAt),
          content: post.original.text,
          imageUrl: post.original.media?.[0]?.url || post.original.media?.[0]?.key,
          mediaType: post.original.media?.[0]?.type as "image" | "video" | undefined,
          media: post.original.media
            ?.map((item) => ({
              url: item.url || item.key || "",
              type: item.type as "image" | "video",
            }))
            .filter((item) => item.url),
          avatarUrl: post.original.author.photoUrlDecrypted || post.original.author.photoUrl,
        }
      : null;

  const contextText = isRepost ? `${post.author.name || "Unknown User"} reposted` : undefined;

  // Build breadcrumbs
  const breadcrumbs = [
    { label: "Professional", onClick: () => navigate("/professional/feed") },
    { label: "Feed", onClick: () => navigate("/professional/feed") },
    { label: "Post" },
  ];

  return (
    <ProfessionalLayout breadcrumbs={breadcrumbs} contentClassName="lg:col-span-9">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Center - Post */}
        <div className="lg:col-span-8">
          <div className="space-y-6 pb-6">
            <ProfessionalFeedPost
              id={post.id}
              authorName={post.author.name || "Unknown User"}
              authorTitle={post.author.title}
              postDate={formatDate(post.createdAt)}
              content={post.text}
              imageUrl={!isRepost ? post.media[0]?.url || post.media[0]?.key : undefined}
              mediaType={!isRepost ? (post.media[0]?.type as "image" | "video" | undefined) : undefined}
              avatarUrl={post.author.photoUrlDecrypted || post.author.photoUrl}
              initialLikes={post.stats.likes}
              initialComments={post.stats.comments}
              contextText={contextText}
              attachment={attachment}
              isRepostOnly={isRepost && !hasOwnContent}
              onLike={handleLike}
              onComment={handleOpenComments}
              onSave={handleSave}
              isSaved={post.meta.saved}
              isLiked={post.meta.liked}
              onShare={handleShare}
              onRepost={handleRepost}
              isCommentActive={openCommentsFor === post.id}
              isRepostActive={openRepostFor === post.id}
              isOwner={post.meta.canEdit}
              onUpdate={handleUpdate}
              onDelete={() => handleDelete(post.id)}
            >
              {openCommentsFor === post.id && <CommentsSection postId={String(post.id)} />}
            </ProfessionalFeedPost>
          </div>
        </div>

        {/* Right Sidebar - Suggestions & Messages */}
        <div className="lg:col-span-4 space-y-6 hidden lg:block">
          <div className="sticky top-64 z-10">
            <div className="absolute inset-x-0 -top-64 h-64 bg-[#0f1419] z-10"></div>

            <div className="relative z-20">
              <ProfessionalSuggestions />
            </div>

            <div className="relative z-20 mt-6">
              <GradientContainer>
                <div className="rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Messages</h3>
                    <button
                      onClick={() => navigate("/professional/messages")}
                      className="text-[#D85D27] hover:text-[#C24F20] text-sm font-medium"
                    >
                      View all
                    </button>
                  </div>
                  <p className="text-gray-400 text-sm text-center py-4">Click "View all" to see your messages</p>
                </div>
              </GradientContainer>
            </div>
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

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
              toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </ProfessionalLayout>
  );
}

export default ProfessionalPostPage;
