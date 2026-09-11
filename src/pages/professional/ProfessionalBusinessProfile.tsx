import { useState } from "react";
import BPBG from "../../assets/icons/BPBG.svg";
import { useNavigate, useParams } from "react-router-dom";
import { ProfessionalLayout } from "../../components/professional/ProfessionalLayout";
import BusinessDetailsCard from "../../components/profile/BusinessDetailsCard";
import LocationIcon from "../../assets/icons/Location.svg";
import BuildingIcon from "../../assets/icons/building.svg";
import ProfessionalFeedPost from "../../components/professional/ProfessionalFeedPost";
import {
  useGetProfileSummaryQuery,
  useGetProfileAboutQuery,
  useGetUserFeedQuery,
  useLikePostMutation,
  useUnlikePostMutation,
  useSavePostMutation,
  useRepostMutation,
  useGetCommentsQuery,
  useAddCommentMutation,
} from "../../services/professional/professionalFeedApi";

// Comments Section Component
const CommentsSection: React.FC<{ postId: string }> = ({ postId }) => {
  const [commentText, setCommentText] = useState("");
  const { data: commentsData, isLoading, refetch } = useGetCommentsQuery({ postId, page: 1, limit: 20 });
  const [addComment] = useAddCommentMutation();

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

  return (
    <div className="mt-4 p-4 border border-gray-700 rounded-lg bg-[#161b22]">
      <div className="mb-3 text-white font-medium">Comments</div>

      {isLoading && <div className="text-gray-400">Loading comments...</div>}

      {!isLoading && comments.length === 0 && <div className="text-gray-400">No comments yet</div>}

      {!isLoading && comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center shrink-0">
                {comment.author.photoUrl ? (
                  <img
                    src={comment.author.photoUrl}
                    alt={comment.author.name || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-white">
                    {(comment.author.name || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm text-white font-medium">{comment.author.name || "User"}</div>
                {comment.author.title && <div className="text-xs text-gray-400">{comment.author.title}</div>}
                <div className="text-sm text-gray-300 mt-1">{comment.text}</div>
                <div className="text-xs text-gray-500 mt-1">{formatDate(comment.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          className="flex-1 bg-[#0f1419] border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
          placeholder="Write a comment…"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmitComment();
            }
          }}
        />
        <button
          onClick={handleSubmitComment}
          disabled={!commentText.trim()}
          className="px-4 py-2 rounded-lg bg-[#D85D27] hover:bg-[#C24F20] text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Post
        </button>
      </div>
    </div>
  );
};

function ProfessionalBusinessProfile() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState<"about" | "feed">("about");
  const [openCommentsFor, setOpenCommentsFor] = useState<string | number | null>(null);
  const [openRepostFor, setOpenRepostFor] = useState<string | number | null>(null);
  const [repostPopoverPos, setRepostPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [showFullTagline, setShowFullTagline] = useState(false);
  
  // Format text into sections with proper line breaks and lists
  const formatTextSections = (text: string) => {
    if (!text) return [];
    return text.split('\n\n').filter(section => section.trim() !== '');
  };

  // Fetch profile data
  const { data: summaryData, isLoading: isLoadingSummary } = useGetProfileSummaryQuery(
    { userId: userId || "" },
    { skip: !userId },
  );
  const { data: aboutData, isLoading: isLoadingAbout } = useGetProfileAboutQuery(
    { userId: userId || "" },
    { skip: !userId || activeTab !== "about" },
  );
  const { data: feedData, isLoading: isLoadingFeed } = useGetUserFeedQuery(
    { userId: userId || "", page: 1, limit: 20 },
    { skip: !userId || activeTab !== "feed" },
  );

  const profile = summaryData?.data.header;
  const about = aboutData?.data;
  const posts = feedData?.data?.items || [];

  // Mutations
  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();
  const [savePost] = useSavePostMutation();
  const [repost] = useRepostMutation();

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

  const handleLike = async (postId: string | number) => {
    const post = posts.find((p) => p.id === postId);
    const isLiked = post?.meta.liked;

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
    try {
      await savePost({ postId: String(postId) }).unwrap();
    } catch (error) {
      console.error("Failed to save post:", error);
    }
  };

  const handleShare = (postId: string | number) => {
    console.log("Share post:", postId);
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
      console.log("Repost with thoughts:", postId);
      // TODO: Implement repost with thoughts modal
    } else {
      try {
        await repost({ postId }).unwrap();
        setOpenRepostFor(null);
        setRepostPopoverPos(null);
      } catch (error) {
        console.error("Failed to repost:", error);
      }
    }
  };

  if (isLoadingSummary) {
    return (
      <ProfessionalLayout
        sidebarProfileUserId={userId}
        breadcrumbs={[
          { label: "Professional", onClick: () => navigate("/professional/feed") },
          { label: "Business Profile" },
        ]}
      >
        <div className="text-center py-8 text-gray-400">Loading profile...</div>
      </ProfessionalLayout>
    );
  }

  if (!profile) {
    return (
      <ProfessionalLayout
        sidebarProfileUserId={userId}
        breadcrumbs={[
          { label: "Professional", onClick: () => navigate("/professional/feed") },
          { label: "Business Profile" },
        ]}
      >
        <div className="text-center py-8 text-gray-400">Profile not found</div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout
      sidebarProfileUserId={userId}
      breadcrumbs={[
        { label: "Professional", onClick: () => navigate("/professional/feed") },
        { label: "Business Profile" },
      ]}
    >
      <div>
        {/* Business Profile Card */}
        <div className="bg-[#161b22] rounded-xl border border-gray-700 mb-6">
          {/* Cover Image */}
          <div 
            className="h-32 sm:h-40 relative overflow-hidden rounded-t-xl"
            style={{
              backgroundImage: `url(${BPBG})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {profile.bannerUrl && (
              <img src={profile.bannerUrl} alt="Cover" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Logo - Positioned at bottom of cover, overlapping */}
          <div className="relative px-4 sm:px-6">
            <div className="absolute left-4 sm:left-6 -top-12 sm:-top-16 z-10">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-xl flex items-center justify-center flex-shrink-0 border-4 border-[#161b22] shadow-lg overflow-hidden">
                {profile.logoUrl ? (
                  <img src={profile.logoUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl sm:text-4xl font-bold text-[#D85D27]">{profile.name.charAt(0)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="p-4 sm:p-6 pt-14 sm:pt-20">
            <div className="mb-4">
              {/* Business Info */}
              <div>
                <h2 className="text-white text-xl sm:text-2xl font-bold mb-2">{profile.name}</h2>
                {profile.tagline && (
                  <div className="mb-3">
                    <div 
                      className={`text-gray-300 text-sm leading-relaxed ${!showFullTagline && 'line-clamp-3'}`}
                      style={{ whiteSpace: 'pre-line' }}
                    >
                      {formatTextSections(profile.tagline).map((section, index) => {
                        const isHeading = section.endsWith(':');
                        const isListItem = section.trim().startsWith('●');
                        
                        if (isHeading) {
                          return (
                            <h4 key={index} className="font-semibold text-white mt-2 first:mt-0">
                              {section}
                            </h4>
                          );
                        } else if (isListItem) {
                          const items = section.split('\n').filter(item => item.trim() !== '');
                          return (
                            <ul key={index} className="list-disc pl-5 space-y-1">
                              {items.map((item, i) => (
                                <li key={i} className="text-gray-300">
                                  {item.trim().replace('●', '').trim()}
                                </li>
                              ))}
                            </ul>
                          );
                        }
                        return (
                          <p key={index} className="text-gray-300">
                            {section}
                          </p>
                        );
                      })}
                    </div>
                    {profile.tagline.split('\n').length > 3 && (
                      <button
                        onClick={() => setShowFullTagline(!showFullTagline)}
                        className="text-[#D85D27] text-xs hover:underline mt-1 focus:outline-none"
                      >
                        {showFullTagline ? 'Show Less' : 'Read More'}
                      </button>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-4 text-gray-400 text-xs sm:text-sm">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <img src={LocationIcon} alt="Location" className="w-4 h-4 flex-shrink-0" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile.companySize && (
                    <div className="flex items-center gap-1">
                      <img src={BuildingIcon} alt="Company Size" className="w-4 h-4 flex-shrink-0" />
                      <span>{profile.companySize} Employees</span>
                    </div>
                  )}
                  {/* {profile.companySize && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      {profile.companySize}
                    </div>
                  )} */}
                  {/* {stats && (
                    <>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-white">{stats.posts}</span> Posts
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-white">{stats.connections}</span> Connections
                      </div>
                    </>
                  )} */}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-700 mb-6">
              <div className="flex gap-8">
                <button
                  onClick={() => setActiveTab("about")}
                  className={`pb-3 text-sm font-medium transition-colors relative ${
                    activeTab === "about" ? "text-white" : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  About
                  {activeTab === "about" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D85D27]" />}
                </button>
                <button
                  onClick={() => setActiveTab("feed")}
                  className={`pb-3 text-sm font-medium transition-colors relative ${
                    activeTab === "feed" ? "text-white" : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Feed
                  {activeTab === "feed" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D85D27]" />}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div>

              {activeTab === "about" && (
                <div className="space-y-4">
                  {isLoadingAbout ? (
                    <div className="text-center py-4 text-gray-400">Loading...</div>
                  ) : about ? (
                    <>
                      {about.summary && (
                        <div>
                          <h3 className="text-white text-lg font-semibold mb-3">About Us</h3>
                        </div>
                      )}
                      <div>
                        <h4 className="text-white text-base font-semibold mb-2">Company Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex">
                            <span className="text-gray-400 w-32">Company:</span>
                            <span className="text-gray-300">{about.company}</span>
                          </div>
                          {profile.companySize && (
                            <div className="flex">
                              <span className="text-gray-400 w-32">Company Size:</span>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-300">{profile.companySize} Employees</span>
                              </div>
                            </div>
                          )}
                          {about.services && about.services.length > 0 && (
                            <div className="flex">
                              <span className="text-gray-400 w-32">Services:</span>
                              <div className="flex flex-wrap gap-2">
                                {about.services.map((service, index) => (
                                  <span key={index} className="px-2 py-1 bg-[#1a2332] text-gray-300 text-xs rounded-sm">
                                    {service}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {about.establishedYear && (
                            <div className="flex">
                              <span className="text-gray-400 w-32">Founded:</span>
                              <span className="text-gray-300">{about.establishedYear}</span>
                            </div>
                          )}
                          {/* {about.companySize && (
                            <div className="flex">
                              <span className="text-gray-400 w-32">Company Size:</span>
                              <span className="text-gray-300">{about.companySize}</span>
                            </div>
                          )} */}
                          {about.hqLocation && (
                            <div className="flex">
                              <span className="text-gray-400 w-32">Location:</span>
                              <span className="text-gray-300">{about.hqLocation}</span>
                            </div>
                          )}
                          {about.services && about.services.length > 0 && (
                            <div className="flex">
                              <span className="text-gray-400 w-32">Services:</span>
                              <span className="text-gray-300">{about.services.join(", ")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-sm">No information available</p>
                  )}
                </div>
              )}

              {activeTab === "feed" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Business Card */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-6">
                      <BusinessDetailsCard 
                        details={{
                          companyName: profile.name || "",
                          companyType: "",
                          companySize: profile.companySize ? `${profile.companySize} Employees` : "Not specified",
                          established: about?.establishedYear?.toString() || "Not specified",
                        }}
                        className="max-h-[calc(100vh-2rem)] overflow-y-auto"
                      />
                    </div>
                  </div>
                  
                  {/* Feed */}
                  <div className="lg:col-span-2">
                    {isLoadingFeed ? (
                      <div className="text-center py-8 text-gray-400">Loading posts...</div>
                    ) : posts.length > 0 ? (
                      <div className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
                        {posts.map((post) => (
                          <div key={post.id} className="bg-[#1a2332] rounded-xl border border-gray-700 overflow-hidden">
                            <ProfessionalFeedPost
                              id={post.id}
                              authorName={post.author.name || "Unknown User"}
                              authorTitle={post.author.title}
                              postDate={formatDate(post.createdAt)}
                              content={post.text}
                              imageUrl={post.media[0]?.url || post.media[0]?.key}
                              mediaType={post.media[0]?.type as "image" | "video" | undefined}
                              avatarUrl={post.author.photoUrlDecrypted || post.author.photoUrl}
                              initialLikes={post.stats.likes}
                              initialComments={post.stats.comments}
                              contextText={undefined}
                              attachment={null}
                              isRepostOnly={false}
                              onLike={handleLike}
                              onComment={handleOpenComments}
                              onSave={handleSave}
                              isSaved={post.meta.saved}
                              isLiked={post.meta.liked}
                              onShare={handleShare}
                              onRepost={handleRepost}
                              isCommentActive={openCommentsFor === post.id}
                              isRepostActive={openRepostFor === post.id}
                              isOwner={false}
                            >
                              {openCommentsFor === post.id && <CommentsSection postId={String(post.id)} />}
                            </ProfessionalFeedPost>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No posts available</p>
                    )}
                  </div>
                </div>
              )}
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
    </ProfessionalLayout>
  );
}

export default ProfessionalBusinessProfile;
