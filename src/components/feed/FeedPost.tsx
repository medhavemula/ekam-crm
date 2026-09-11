import React, { useState, useEffect } from "react";
import GradientContainer from "../common/GradientContainer";
import commentsIcon from "../../assets/icons/commnets.svg";
import EditIcon from "../../assets/icons/Edit.svg";
import SavedIcon from "../../assets/icons/Savedposts.svg";
import DeleteIcon from "../../assets/icons/delete.svg";

export interface FeedPostProps {
  id: string | number;
  authorName: string;
  authorTitle?: string;
  postDate: string;
  content: string;
  imageUrl?: string;
  mediaType?: "image" | "video";
  media?: Array<{ url?: string; type?: "image" | "video" }>; 
  avatarUrl?: string;
  initialLikes?: number;
  initialLiked?: boolean;
  initialComments?: number;
  repostCount?: number;
  onLike?: (postId: string | number) => void;
  onComment?: (postId: string | number) => void;
  onRepost?: (postId: string | number, e?: React.MouseEvent) => void;
  onShare?: (id: string | number) => void;
  onSave?: (postId: string | number) => void;
  isOwner?: boolean;
  isSaved?: boolean;
  authorUserId?: string;
  onUpdate?: (postId: string | number) => void;
  onDelete?: (postId: string | number) => void;
  onReport?: (postId: string | number) => void;
  onBlockAuthor?: (authorUserId: string, postId: string | number) => void;
  contextText?: string;
  attachment?: {
    authorName: string;
    postDate?: string;
    content?: string;
    imageUrl?: string;
    mediaType?: "image" | "video";
    media?: Array<{ url?: string; type?: "image" | "video" }>;
    avatarUrl?: string;
  } | null;
  children?: React.ReactNode;
  isCommentActive?: boolean;
  isRepostActive?: boolean;
  isRepostOnly?: boolean;
}

/**
 * FeedPost Component
 *
 * Reusable component for displaying a social media feed post.
 */
export const FeedPost: React.FC<FeedPostProps> = ({
  id,
  authorName,
  authorTitle,
  postDate,
  content,
  imageUrl,
  mediaType,
  media,
  avatarUrl,
  initialLikes = 0,
  initialLiked = false,
  initialComments = 0,
  repostCount = 0,
  onLike,
  onComment,
  onRepost,
  onShare,
  onSave,
  isOwner,
  isSaved = false,
  authorUserId,
  onUpdate,
  onDelete,
  onReport,
  onBlockAuthor,
  contextText,
  attachment,
  children,
  isCommentActive,
  isRepostActive,
  isRepostOnly,
}) => {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [isAnimating, setIsAnimating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showFullAttachmentContent, setShowFullAttachmentContent] = useState(false);

  const MAX_PREVIEW_CHARS = 150; // Reduced from 260 to show a more compact preview
  const trimmedContent = (content || "").trim();
  const isLongContent = trimmedContent.length > MAX_PREVIEW_CHARS;
  const visibleContent =
    showFullContent || !isLongContent
      ? trimmedContent
      : `${trimmedContent.slice(0, MAX_PREVIEW_CHARS).replace(/\s+$/u, "")}…`;

  // Handle attachment content truncation
  const attachmentContent = (attachment?.content || "").trim();
  const isLongAttachmentContent = attachmentContent.length > MAX_PREVIEW_CHARS;
  const visibleAttachmentContent =
    showFullAttachmentContent || !isLongAttachmentContent
      ? attachmentContent
      : `${attachmentContent.slice(0, MAX_PREVIEW_CHARS).replace(/\s+$/u, "")}…`;

  const handleLike = () => {
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikes(newLikedState ? likes + 1 : likes - 1);
    setIsAnimating(true);
    
    // Trigger the parent component's like handler
    onLike?.(id);
    
    // Reset animation after it completes
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  // Keep internal liked state in sync with prop
  useEffect(() => {
    setIsLiked(initialLiked);
  }, [initialLiked]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openPreview = (i: number) => setLightboxIndex(i);
  const closePreview = () => setLightboxIndex(null);
  const nextPreview = (total: number) => setLightboxIndex((i) => (i === null ? 0 : (i + 1) % total));
  const prevPreview = (total: number) => setLightboxIndex((i) => (i === null ? 0 : (i - 1 + total) % total));

  // Keyboard controls for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const mediaList: Array<{ url?: string; type?: "image" | "video" }> = (media && media.length > 0)
      ? media
      : (imageUrl ? [{ url: imageUrl, type: mediaType }] : []);
    const total = mediaList.length;
    const idx = typeof lightboxIndex === 'number' ? lightboxIndex : -1;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closePreview(); }
      if (e.key === 'ArrowRight' && total > 1 && idx < total - 1) { e.preventDefault(); nextPreview(total); }
      if (e.key === 'ArrowLeft' && total > 1 && idx > 0) { e.preventDefault(); prevPreview(total); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxIndex, media, imageUrl, mediaType]);

  const renderTile = (item: { url?: string; type?: "image" | "video" }, className = "", onClick?: () => void) => {
    if (!item?.url) return null;
    const isVideo = item.type === "video";
    return (
      <div className={`relative overflow-hidden w-full h-full min-h-0 rounded-none ${className} ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
        {isVideo ? (
          <video src={item.url} controls className="w-full h-full object-cover object-center bg-black" />
        ) : (
          <img src={item.url} alt="media" className="w-full h-full object-cover object-center" loading="lazy" />
        )}
      </div>
    );
  };

  const renderMediaGrid = (items: Array<{ url?: string; type?: "image" | "video" }>) => {
    const list = items.filter((m) => !!m?.url);
    const count = list.length;
    if (count === 0) return null;
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
                onClick={() => openPreview(2)}
              >
                +{extra}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <GradientContainer className="w-full">
      <div className="rounded-2xl p-3 md:p-4">
        {contextText ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2 font-medium">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            <span>{contextText}</span>
          </div>
        ) : null}
        {/* Post Header */}
        <div className="flex items-start gap-2.5 mb-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={authorName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-white">{authorName.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Author Info */}
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-white font-semibold leading-snug">{authorName}</h3>
              {authorTitle && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-xs text-gray-400">{authorTitle}</span>
                </>
              )}
            </div>
            <p className="text-[10px] text-gray-500 leading-snug">{postDate}</p>
          </div>

          <div className="relative ml-auto">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-md bg-[#161b22] border border-gray-700 shadow-lg z-10">
                <div className="py-1 text-sm text-gray-200">
                  {isOwner ? (
                    <>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onUpdate?.(id);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-700 flex items-center gap-2 text-sm"
                      >
                        <img src={EditIcon} alt="Edit" className="w-3.5 h-3.5" />
                        <span>Edit Post</span>
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete?.(id);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-700 flex items-center gap-2 text-sm"
                      >
                        {/* inline trash icon to avoid missing asset */}
                        <img src={DeleteIcon} alt="Delete" className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </>
                  ) : null}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onSave?.(id);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-700 flex items-center gap-2 text-sm"
                  >
                    <img src={SavedIcon} alt={isSaved ? 'Unsave' : 'Save'} className="w-3.5 h-3.5" />
                    <span>{isSaved ? 'Unsave' : 'Save'}</span>
                  </button>
                  {!isOwner ? (
                    <>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onReport?.(id);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-700 flex items-center gap-2 text-sm text-amber-300"
                      >
                        <span>Report post</span>
                      </button>
                      {authorUserId ? (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            onBlockAuthor?.(authorUserId, id);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-gray-700 flex items-center gap-2 text-sm text-red-300"
                        >
                          <span>Block member</span>
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Post Content (only when present) */}
        {trimmedContent.length > 0 ? (
          <div className="mb-3">
            <div className="mt-2 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
              <div className={showFullContent ? '' : 'line-clamp-4'}>  
                {visibleContent}
              </div>
              {isLongContent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFullContent(!showFullContent);
                  }}
                  className="mt-1 text-[#D85D27] hover:underline focus:outline-none text-sm font-medium"
                >
                  {showFullContent ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* Post Media */}
        {!isRepostOnly && (
          media && media.length > 0
            ? renderMediaGrid(media)
            : (imageUrl ? renderMediaGrid([{ url: imageUrl, type: mediaType }]) : null)
        )}

        {/* Attached original (for repost) */}
        {attachment ? (
          <div className="mt-3 mb-3 border border-gray-700 rounded-lg p-3">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                {attachment.avatarUrl ? (
                  <img src={attachment.avatarUrl} alt={attachment.authorName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white">{attachment.authorName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium leading-tight">{attachment.authorName}</div>
                {attachment.postDate ? (
                  <div className="text-[10px] text-gray-500 leading-tight">{attachment.postDate}</div>
                ) : null}
              </div>
            </div>
            {attachmentContent.length > 0 ? (
              <div className="mb-2">
                <p className="text-[13px] text-gray-300 leading-snug break-words whitespace-pre-wrap">
                  {visibleAttachmentContent}
                </p>
                {isLongAttachmentContent && !showFullAttachmentContent && (
                  <button
                    type="button"
                    onClick={() => setShowFullAttachmentContent(true)}
                    className="mt-1 text-xs font-semibold text-orange-400 hover:text-orange-300"
                  >
                    Read more
                  </button>
                )}
              </div>
            ) : null}
            {attachment.media && attachment.media.length > 0
              ? renderMediaGrid(attachment.media)
              : attachment.imageUrl
                ? renderMediaGrid([{ url: attachment.imageUrl, type: attachment.mediaType }])
                : null}
          </div>
        ) : null}

        {/* Post Stats - Always show all three items with counts */}
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-700">
          {/* Left: Likes with icon */}
          <div className="flex items-center gap-1 text-gray-400 text-sm">
            <svg 
              className={`w-5 h-5 ${isLiked ? 'text-gray-500' :'text-gray-500'}`} 
              viewBox="0 0 24 24" 
              fill={isLiked ? 'currentColor' : 'currentColor'} 
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>{likes}</span>
          </div>
          
          {/* Right: Reposts and Comments */}
          <div className="flex items-center gap-4 text-gray-400 text-sm">
            {/* Reposts */}
            <div className="flex items-center gap-1 text-gray-400">
              <span>{repostCount} {repostCount === 1 ? 'Repost' : 'Reposts'}</span>
            </div>
            
            {/* Comments */}
            <button 
              onClick={() => onComment && onComment(id)}
              className="flex items-center gap-1 hover:text-gray-200 transition-colors"
            >
              <span>{initialComments} {initialComments === 1 ? 'Comment' : 'Comments'}</span>
            </button>
          </div>
        </div>

        {/* Post Actions */}
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          <button
            onClick={handleLike}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg transition-colors ${
              isLiked
                ? 'text-orange-500 hover:bg-[#D85D27]/10'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <div className={`relative ${isAnimating ? 'animate-like' : ''}`}>
              <svg
                className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isLiked ? 'scale-110' : 'scale-100'}`}
                viewBox="0 0 24 24"
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {isAnimating && isLiked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 animate-ping"></div>
                </div>
              )}
            </div>
            <span className="text-xs sm:text-sm">Like</span>
          </button>

          <button
            onClick={() => onComment?.(id)}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg transition-colors ${
              isCommentActive
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <img
              src={commentsIcon}
              alt=""
              className={`w-5 h-5 flex-shrink-0 ${isCommentActive ? 'opacity-100' : 'opacity-70'}`}
            />
            <span className="text-xs sm:text-sm">Comment</span>
          </button>

          <button
            onClick={(e) => onRepost?.(id, e)}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg transition-colors min-h-[36px] ${
              isRepostActive
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            <span className="text-xs sm:text-sm">Repost</span>
          </button>

          <button
            onClick={() => onShare?.(id)}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors min-h-[36px]"
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 8l4-4 4 4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" />
            </svg>
            <span className="text-xs sm:text-sm">Share</span>
          </button>
        </div>

        {/* Comments section below action buttons */}
        {children ? <div className="mt-3 pt-3 border-t border-gray-700">{children}</div> : null}
      </div>
    </GradientContainer>
    {(() => {
      // Lightbox Preview
      const mediaList: Array<{ url?: string; type?: "image" | "video" }> = (media && media.length > 0)
        ? media
        : (imageUrl ? [{ url: imageUrl, type: mediaType }] : []);
      const total = mediaList.length;
      const idx = typeof lightboxIndex === 'number' ? lightboxIndex : -1;
      if (idx < 0 || idx >= total) return null;
      const current = mediaList[idx];
      return (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center" onClick={closePreview}>
          {/* Nav - Outside image container */}
          {total > 1 && (
            <>
              {idx > 0 && (
                <button
                  className="fixed left-3 md:left-4 top-1/2 -translate-y-1/2 p-3 md:p-4 rounded-full bg-gray-600 hover:bg-gray-700 text-white shadow-lg z-[10000]"
                  onClick={(e) => { e.stopPropagation(); prevPreview(total); }}
                  aria-label="Previous"
                >
                  <svg className="w-7 h-7 md:w-9 md:h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}
              {idx < total - 1 && (
                <button
                  className="fixed right-3 md:right-4 top-1/2 -translate-y-1/2 p-3 md:p-4 rounded-full bg-gray-600 hover:bg-gray-700 text-white shadow-lg z-[10000]"
                  onClick={(e) => { e.stopPropagation(); nextPreview(total); }}
                  aria-label="Next"
                >
                  <svg className="w-7 h-7 md:w-9 md:h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </>
          )}
          <div className="relative max-w-5xl w-[92vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* Close */}
            <button className="absolute top-3 right-3 text-white/90 hover:text-white bg-black/50 rounded-full px-3 py-1" onClick={closePreview} aria-label="Close">
              ✕
            </button>
            {/* Media */}
            {current?.type === 'video' ? (
              <video src={current?.url} controls className="w-full h-auto max-h-[90vh] bg-black" />
            ) : (
              <img src={current?.url} alt="preview" className="w-full h-auto max-h-[90vh] object-contain" />
            )}
          </div>
        </div>
      );
    })()}
    </>
  );
};

export default FeedPost;
