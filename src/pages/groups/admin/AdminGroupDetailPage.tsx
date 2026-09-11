import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import lockIcon from "../../../assets/icons/lock.svg";
import publicIcon from "../../../assets/icons/public.svg";
import GMemIcon from "../../../assets/icons/GMem.svg";
import commentsIcon from "../../../assets/icons/commnets.svg";
import { ModernConnectionCard } from "../../../components/connections/ModernConnectionCard";
import { PageHeader } from "../../../components/common/PageHeader";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { useGetGroupForReviewQuery, useApproveGroupMutation, useRejectGroupMutation, useDeleteGroupMutation } from "../../../services/edGroupsApi";
import { useListGroupMembersQuery, useGetGroupFeedQuery, useLikeGroupPostMutation, useUnlikeGroupPostMutation, useListGroupPostCommentsQuery } from "../../../services/groupsApi";
import Navbar from "../../../components/navigation/Navbar";
import { useToast } from "../../../components/toast/ToastProvider";
import { formatStepwiseDescription, hasStepwiseFormat } from "../../../utils/descriptionFormatter";

// Inline comments section component for group posts - Read-only for admin
const GroupCommentsSection: React.FC<{
  postId: string;
  groupId: string;
}> = ({ postId, groupId }) => {
  const { data, isLoading, error } = useListGroupPostCommentsQuery({ groupId, postId, limit: 10 } as any, { refetchOnMountOrArgChange: true });
  const comments = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="px-4 py-3 border-t border-gray-800">
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-1"></div>
                <div className="h-3 bg-gray-700 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 border-t border-gray-800">
        <p className="text-gray-400 text-sm">Failed to load comments.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-gray-800">
      {/* Comments Title */}
      <h4 className="text-white font-medium mb-3">Comments</h4>
      
      {/* Comments List - Read-only for admin */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment: any) => (
            <div key={comment.id} className="flex gap-3 group">
              <img
                src={comment.author.photoUrlDecrypted || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author.name)}&background=111823&color=fff&size=200`}
                alt={comment.author.name}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-medium">{comment.author.name}</p>
                  <p className="text-gray-400 text-xs">{new Date(comment.createdAt).toLocaleString()}</p>
                </div>
                
                <p className="text-gray-300 text-sm mt-1 break-words">{comment.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Type for transformed feed posts
interface TransformedFeedPost {
  id: string;
  title: string;
  body: string;
  authorName: string;
  authorAvatar: string;
  createdAt: string;
  imageUrl?: string; // Keep for backward compatibility
  media?: Array<{ url: string; type: "image" | "video" }>; // Add full media array
  likes: number;
  reposts: number;
  comments: number;
  isLiked: boolean;
}

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

const AdminGroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the return tab from navigation state
  const returnTab = (location.state as any)?.returnTab || "all";
  
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    action: "accept" | "reject" | "delete";
    reason?: string;
  }>({ open: false, action: "accept" });
  
  // Comment state
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  
  const { showToast } = useToast();
  
  // Tab state
  type TabType = "Feed" | "Members" | "About";
  const [activeTab, setActiveTab] = useState<TabType>("Feed");

  // Fetch group details for review
  const { data: groupData, isLoading, error } = useGetGroupForReviewQuery(id!);
  
  // Get group members
  const { data: membersData, isLoading: isLoadingMembers } = useListGroupMembersQuery({
    groupId: id!,
    page: 1,
    limit: 20,
  });

  // Get group feed posts
  const { data: feedData, isLoading: isLoadingFeed, error: feedError } = useGetGroupFeedQuery({
    groupId: id!,
    page: 1,
    limit: 10,
  });

  // Mutations for approve/reject/delete
  const [approveGroup, { isLoading: approving }] = useApproveGroupMutation();
  const [rejectGroup, { isLoading: rejecting }] = useRejectGroupMutation();
  const [deleteGroup, { isLoading: deleting }] = useDeleteGroupMutation();

  // Feed mutations
  const [likePost] = useLikeGroupPostMutation();
  const [unlikePost] = useUnlikeGroupPostMutation();
  
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
        membersData.items.filter((member: any) => member.user != null).map((member: any) => ({
          id: member.id,
          name: member.user.name,
          company: member.user.company || "Not specified",
          role: member.user.professionalRole || "Member",
          avatarUrl: member.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user.name)}&background=111823&color=fff&size=200`,
          status: 'connected',
          connectionCount: 0,
          isAdmin: member.role === 'OWNER',
        }))
      );
    }
  }, [membersData]);
  
  // Transform feed API data to match component expectations
  const transformedFeedPosts = useMemo((): TransformedFeedPost[] => {
    if (!feedData?.items) return [];
    
    return feedData.items.map((post): TransformedFeedPost => {
      const text = post.text || '';
      const authorName = post.author?.name || "Unknown";
      return {
        id: post.id,
        title: '',
        body: text.length > 100 ? text.substring(0, 100) + "..." : text,
        authorName,
        authorAvatar: post.author?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=111823&color=fff&size=200`,
        createdAt: post.createdAt,
        imageUrl: post.media && post.media.length > 0 ? post.media[0].url : undefined, // Keep for backward compatibility
        media: post.media || [], // Add full media array
        likes: post.stats?.likes || 0,
        reposts: 0, // API doesn't provide repost count
        comments: post.stats?.comments || 0,
        isLiked: post.isLiked || false,
      };
    });
  }, [feedData]);

  
  // Comment handlers
  const handleOpenComments = (postId: string) => {
    setOpenCommentsFor(openCommentsFor === postId ? null : postId);
  };

  const handleLikePost = async (postId: string) => {
    try {
      await likePost({ groupId: id!, postId: String(postId) }).unwrap();
      showToast({ title: "Liked!", description: "Post liked successfully.", kind: "success" });
    } catch (e) {
      console.error("Failed to like post", e);
      showToast({ title: "Failed to like post", description: "Please try again.", kind: "error" });
    }
  };

  const handleUnlikePost = async (postId: string) => {
    try {
      await unlikePost({ groupId: id!, postId: String(postId) }).unwrap();
      showToast({ title: "Unliked", description: "Post unliked successfully.", kind: "success" });
    } catch (e) {
      console.error("Failed to unlike post", e);
      showToast({ title: "Failed to unlike post", description: "Please try again.", kind: "error" });
    }
  };

  const handleShare = async (postId: string) => {
    try {
      const url = `${window.location.origin}/admin/groups/${id}#post-${postId}`;
      const title = group?.title || "Ekam Group Post";
      const text = "Check out this group post";

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

  
// Media grid rendering function (copied from GroupDetailPage)
const renderMediaGrid = (items: Array<{ url: string; type: "image" | "video" }>) => {
  const list = items.filter((m) => !!m?.url);
  const count = list.length;
  if (count === 0) return null;
  
  const renderTile = (item: { url: string; type: "image" | "video" }, aspectClass: string, onClick: () => void) => (
    <div className={`relative ${aspectClass} overflow-hidden bg-gray-800`}>
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
        {renderTile(list[0], "aspect-[4/3]", () => openPreview(0))}
        {renderTile(list[1], "aspect-[4/3]", () => openPreview(1))}
      </div>
    );
  }
  // 3 or more -> always show 3 tiles: big left + two stacked right
  const extra = count - 3;
  return (
    <div className="mb-3 h-72 md:h-96 grid grid-cols-3 gap-1 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 min-h-0">
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
  
  // Transform group data to match GroupDetailPage structure
  const group = useMemo(() => {
    if (!groupData?.data) return null;
    
    const apiGroup = groupData.data;
    
    return {
      id: apiGroup.id,
      title: apiGroup.name,
      description: apiGroup.description,
      cover: apiGroup.coverImageUrl,
      avatar:
        apiGroup.coverImageUrl ||
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=60",
      isPrivate: apiGroup.privacy === "PRIVATE",
      members: apiGroup.memberCount,

      status:
        apiGroup.status === "PENDING_APPROVAL"
          ? "pending"
          : apiGroup.status === "APPROVED"
            ? "joined"
            : apiGroup.status === "REJECTED"
              ? "rejected"
              : "none",

      apiStatus: apiGroup.status,
      apiApprovalStatus: (apiGroup.approvalStatus ?? apiGroup.status) as string,
    };
  }, [groupData]);
  
  // Get filtered tabs (admin view doesn't show Requests tab)
  const filteredTabs = useMemo(() => ["Feed", "Members", "About"] as const, []);

  // Handle approval
  const handleApprove = async () => {
    if (!id) return;
    try {
      await approveGroup({ groupId: id }).unwrap();
      navigate("/admin/groups/requested");
    } catch (error) {
      console.error("Failed to approve group:", error);
    }
  };

  // Handle rejection
  const handleReject = async (reason: string) => {
    if (!id) return;
    try {
      await rejectGroup({ groupId: id, data: { reason } }).unwrap();
      navigate("/admin/groups/rejected");
    } catch (error) {
      console.error("Failed to reject group:", error);
    }
  };

  // Handle deletion
  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteGroup(id).unwrap();
      showToast({ 
        title: "Group Deleted!", 
        description: "The group has been deleted successfully.", 
        kind: "success" 
      });
      navigate("/admin/groups");
    } catch (error) {
      console.error("Failed to delete group:", error);
      showToast({ 
        title: "Failed to Delete", 
        description: "Please try again.", 
        kind: "error" 
      });
    }
  };
  
  const breadcrumbs = useMemo(() => [
    { 
      label: "Groups", 
      onClick: () => {
        const url = returnTab === "all" ? "/admin/groups" : `/admin/groups?tab=${returnTab}`;
        navigate(url);
      }
    },
    { label: group?.title || "Group Details" }
  ], [group?.title, navigate, returnTab]);

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
            onClick={() => {
              const url = returnTab === "all" ? "/admin/groups" : `/admin/groups?tab=${returnTab}`;
              navigate(url);
            }}
          >
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-6">
      <PageHeader breadcrumbs={breadcrumbs} />
      {/* Cover Image */}
      <div className="h-64 bg-gray-800/60 rounded-xl overflow-hidden relative">
        {group?.cover ? (
          <img src={group.cover} alt={group?.title} className="w-full h-full object-cover" />
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
          {group?.avatar && group.avatar !== "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=60" ? (
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
        <div className="flex items-start justify-between">
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
                <span>{group?.members?.toLocaleString() || 0} members</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Admin Action Buttons */}
            {group?.apiApprovalStatus === "PENDING" && (
              <>
                <button
                  className="px-4 py-2 rounded-full bg-green-600 text-white hover:bg-green-700"
                  onClick={() => setConfirmState({ open: true, action: "accept" })}
                  disabled={approving}
                >
                  {approving ? 'Approving...' : 'Accept'}
                </button>
                <button
                  className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700"
                  onClick={() => setConfirmState({ open: true, action: "reject" })}
                  disabled={rejecting}
                >
                  {rejecting ? 'Rejecting...' : 'Reject'}
                </button>
              </>
            )}
            {group?.apiApprovalStatus === "APPROVED" && (
              <button
                className="px-4 py-2 rounded-full border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                onClick={() => setConfirmState({ open: true, action: "delete" })}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            {group?.apiApprovalStatus === "REJECTED" && (
              <button
                className="px-4 py-2 rounded-full bg-red-500 text-white cursor-not-allowed opacity-80"
                disabled
              >
                Rejected
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="px-6">
        <div className="flex items-center gap-8 border-b border-gray-700">
          {filteredTabs.map((t) => (
            <button
              key={t}
              className={`pb-2 text-sm ${
                activeTab === t ? "text-white border-b-2 border-orange-500" : "text-gray-400"
              }`}
              onClick={() => setActiveTab(t as TabType)}
            >
              {t}
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
                  <div className="space-y-4">
                    {/* Posts List */}
                    <div className="space-y-4">
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
                        {transformedFeedPosts.map((post: TransformedFeedPost) => (
                          <div
                            key={post.id}
                            className="rounded-xl bg-[#151a22] border border-gray-800 overflow-hidden"
                          >
                            {post.media && post.media.length > 0 ? (
                              <div className="w-full p-2 pb-0">
                                <div className="overflow-hidden rounded-lg">
                                  {renderMediaGrid(post.media)}
                                </div>
                              </div>
                            ) : post.imageUrl ? (
                              <div className="w-full p-2 pb-0">
                                <div className="max-h-[420px] bg-black overflow-hidden rounded-lg">
                                  <img
                                    src={post.imageUrl}
                                    alt={post.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                            ) : null}

                            <div className="w-full p-3 md:p-4 flex flex-col gap-2">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <img src={post.authorAvatar} alt={post.authorName} className="w-8 h-8 rounded-full" />
                                    <span className="text-white font-medium">{post.authorName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-xs">
                                      {new Date(post.createdAt).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="space-y-0.5">
                                  <div className="text-white text-[15px] font-semibold leading-snug">
                                    {post.title}
                                  </div>
                                  <div className="text-[11px] text-gray-400 leading-snug">
                                    {post.body}
                                  </div>
                                </div>

                                {/* Stats & Actions */}
                                <div className="mt-2 space-y-2">
                                  {/* Stats above divider */}
                                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                                    {/* Like button on left with dynamic color */}
                                    <button 
                                      className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-800 ${post.isLiked ? 'text-orange-500' : 'text-gray-500'}`}
                                      onClick={() => post.isLiked ? handleUnlikePost(post.id) : handleLikePost(post.id)}
                                    >
                                      <svg 
                                        className="w-4 h-4 text-gray-500" 
                                        viewBox="0 0 24 24" 
                                        fill="#9ca3af" 
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        aria-hidden={true}
                                      >
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                      </svg>
                                      <span className="text-gray-500">{post.likes}</span>
                                    </button>

                                    {/* Reposts and comments text with counts on right end */}
                                    <div className="flex items-center gap-4">
                                      <button 
                                        className="text-gray-400 hover:text-gray-300 transition-colors"
                                        onClick={() => handleOpenComments(post.id)}
                                      >
                                        {post.comments} comments
                                      </button>
                                    </div>
                                  </div>

                                  {/* Divider */}
                                  <div className="border-t border-gray-800"></div>

                                  {/* Action buttons below divider */}
                                  <div className="flex items-center justify-between w-full">
                                    {/* Like button */}
                                    <button 
                                      className={`flex flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-800 ${post.isLiked ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'} flex-1`}
                                      onClick={() => post.isLiked ? handleUnlikePost(post.id) : handleLikePost(post.id)}
                                    >
                                      <svg 
                                        className={`w-4 h-4 ${post.isLiked ? 'text-orange-500' : 'text-gray-400'}`} 
                                        viewBox="0 0 24 24" 
                                        fill={post.isLiked ? "#f97316" : "none"} 
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        aria-hidden={true}
                                      >
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                      </svg>
                                      <span>{post.isLiked ? 'Liked' : 'Like'}</span>
                                    </button>

                                    {/* Comment button */}
                                    <button
                                      className="flex flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-blue-500 flex-1"
                                      onClick={() => handleOpenComments(post.id)}
                                    >
                                      <img src={commentsIcon} alt="Comments" className="w-4 h-4 flex-shrink-0" />
                                      <span>Comment</span>
                                    </button>

                                    <button
                                      className="flex flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-cyan-400 flex-1"
                                      onClick={() => handleShare(post.id)}
                                    >
                                      <svg
                                        className="w-4 h-4 flex-shrink-0"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        aria-hidden={true}
                                      >
                                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                        <polyline points="16 6 12 2 8 6" />
                                        <line x1="12" y1="2" x2="12" y2="15" />
                                      </svg>
                                      <span>Share</span>
                                    </button>
                                  </div>
                                </div>
                            </div>

                          {/* Comments Section */}
                          {openCommentsFor === post.id && (
                            <GroupCommentsSection
                              key={post.id}
                              postId={post.id}
                              groupId={id!}
                            />
                          )}
                          </div>
                      ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-400">No posts in this group yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );

              case 'Members':
                const maxVisibleMembers = 5;
                const visibleMembers = transformedMembers?.slice(0, maxVisibleMembers) || [];

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {isLoadingMembers ? (
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
                          className="px-4 py-2 bg-[#D85D27] hover:bg-orange-700 text-white rounded-lg transition-colors"
                        >
                          View All Members ({transformedMembers.length})
                        </button>
                      </div>
                    )}
                  </div>
                );

              case 'About':
                return (
                  <div className="space-y-4">
                    <div className="bg-[#111823] rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-white mb-4">About {group?.title}</h3>
                      <p className="text-gray-300 leading-relaxed">
                        {renderDescription(group?.description, 'No description available for this group.')}
                      </p>
                    </div>
                    
                    {/* Creator Information */}
                    {groupData?.data?.creator && (
                      <div className="bg-[#111823] rounded-xl p-6">
                        <h3 className="text-xl font-semibold text-white mb-4">Creator Information</h3>
                        <div className="bg-[#161b22] rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">{groupData.data.creator.name}</p>
                              <p className="text-gray-400 text-sm">{groupData.data.creator.email}</p>
                            </div>
                            <div className="text-right text-sm text-gray-400">
                              {groupData.data.region && <p>Region: {groupData.data.region.name}</p>}
                              {groupData.data.chapter && <p>Chapter: {groupData.data.chapter.name}</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Rejection Reason */}
                    {group?.apiApprovalStatus === "REJECTED" && groupData?.data?.rejectionReason && (
                      <div className="bg-[#111823] rounded-xl p-6">
                        <h3 className="text-xl font-semibold text-white mb-4">Rejection Reason</h3>
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                          <p className="text-red-400">{groupData.data.rejectionReason}</p>
                        </div>
                      </div>
                    )}
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
        </div>
      
            
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmState.open}
        actionType={confirmState.action}
        onClose={() => setConfirmState((prev) => ({ ...prev, open: false }))}
        onConfirm={() => {
          if (confirmState.action === "accept") {
            handleApprove();
          } else if (confirmState.action === "reject") {
            handleReject(confirmState.reason || "Rejected by admin");
          } else if (confirmState.action === "delete") {
            handleDelete();
          }
        }}
        isSubmitting={approving || rejecting || deleting}
      />
      
      </main>
    </div>
  );
};

export default AdminGroupDetailPage;
