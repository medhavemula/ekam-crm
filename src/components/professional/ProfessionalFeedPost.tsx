import React, { useState } from "react";
import GradientContainer from "../common/GradientContainer";
import commentsIcon from "../../assets/icons/commnets.svg";
import EditIcon from "../../assets/icons/Edit.svg";
import DeleteIcon from "../../assets/icons/delete.svg";

export interface FeedPostProps {
  id: string | number;
  authorName: string;
  authorTitle?: string;
  postDate: string;
  content: string;
  imageUrl?: string;
  mediaType?: "image" | "video";
  // Full media list (image/video). When provided, overrides imageUrl/mediaType rendering.
  media?: Array<{ url: string; type: "image" | "video" }>;
  avatarUrl?: string;
  initialLikes?: number;
  initialComments?: number;
  repostCount?: number;
  onLike?: (postId: string | number) => void;
  onComment?: (postId: string | number) => void;
  onRepost?: (postId: string | number, e?: React.MouseEvent) => void;
  onShare?: (id: string | number) => void;
  onSave?: (postId: string | number) => void;
  isSaved?: boolean;
  isLiked?: boolean;
  isOwner?: boolean;
  authorUserId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
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
    media?: Array<{ url: string; type: "image" | "video" }>;
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
export const ProfessionalFeedPost: React.FC<FeedPostProps> = ({
  id,
  authorName,
  authorTitle,
  postDate,
  content,
  imageUrl,
  mediaType = "image",
  media,
  avatarUrl,
  initialLikes = 0,
  initialComments = 0,
  repostCount = 0,
  onLike,
  onComment,
  onRepost,
  onShare,
  onSave,
  isSaved = false,
  isLiked: isLikedProp = false,
  isOwner,
  authorUserId,
  canEdit,
  canDelete,
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
  const [isLiked, setIsLiked] = useState(isLikedProp);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showFullAttachmentContent, setShowFullAttachmentContent] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxItems, setLightboxItems] = useState<Array<{ url?: string; type?: "image" | "video" }> | null>(null);

  const openPreview = (i: number, items?: Array<{ url?: string; type?: "image" | "video" }>) => {
    setLightboxItems(items || null);
    setLightboxIndex(i);
  };
  const closePreview = () => {
    setLightboxIndex(null);
    setLightboxItems(null);
  };
  const nextPreview = (total: number) => setLightboxIndex((i) => (i === null ? 0 : (i + 1) % total));
  const prevPreview = (total: number) => setLightboxIndex((i) => (i === null ? 0 : (i - 1 + total) % total));

  // Keyboard controls for lightbox
  React.useEffect(() => {
    if (lightboxIndex === null) return;
    const mediaList: Array<{ url?: string; type?: "image" | "video" }> = lightboxItems || ((media && media.length > 0)
      ? media
      : (imageUrl ? [{ url: imageUrl, type: mediaType }] : []));
    const total = mediaList.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closePreview(); }
      if (e.key === 'ArrowRight' && total > 1) { e.preventDefault(); nextPreview(total); }
      if (e.key === 'ArrowLeft' && total > 1) { e.preventDefault(); prevPreview(total); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxIndex, lightboxItems, media, imageUrl, mediaType]);

  // Update local state when prop changes (e.g., after API refresh)
  React.useEffect(() => {
    setIsLiked(isLikedProp);
  }, [isLikedProp]);

  // Update likes count when initialLikes changes
  React.useEffect(() => {
    setLikes(initialLikes);
  }, [initialLikes]);

  const MAX_PREVIEW_CHARS = 260;
  const trimmedContent = (content || "").trim();
  const isLongContent = trimmedContent.length > MAX_PREVIEW_CHARS;
  const visibleContent =
    showFullContent || !isLongContent
      ? trimmedContent
      : `${trimmedContent.slice(0, MAX_PREVIEW_CHARS).replace(/\s+$/u, "")}…`;

  const attachmentContent = (attachment?.content || "").trim();
  const isLongAttachmentContent = attachmentContent.length > MAX_PREVIEW_CHARS;
  const visibleAttachmentContent =
    showFullAttachmentContent || !isLongAttachmentContent
      ? attachmentContent
      : `${attachmentContent.slice(0, MAX_PREVIEW_CHARS).replace(/\s+$/u, "")}…`;
  const allowEdit = canEdit ?? isOwner ?? false;
  const allowDelete = canDelete ?? isOwner ?? false;

  const handleLike = () => {
    const next = !isLiked;
    setIsLiked(next);
    setLikes(next ? likes + 1 : likes - 1);
    setIsAnimating(true);
    onLike?.(id);
    setTimeout(() => setIsAnimating(false), 300);
  };

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

  const renderMediaGrid = (
    items: Array<{ url?: string; type?: "image" | "video" }>,
    enablePreview = true,
    compact = false,
  ) => {
    const list = items.filter((m) => !!m?.url);
    const count = list.length;
    const pairHeightClass = compact ? "h-44 md:h-56" : "h-72 md:h-96";
    const multiHeightClass = compact ? "h-44 md:h-56" : "h-72 md:h-96";
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
              <img
                src={m.url}
                alt="Post media"
                className={`w-full h-auto max-h-[500px] object-contain ${enablePreview ? "cursor-pointer" : ""}`}
                loading="lazy"
                onClick={enablePreview ? () => openPreview(0, list) : undefined}
              />
            </div>
          )}
        </div>
      );
    }
    if (count === 2) {
      return (
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
          <div className={`${pairHeightClass} min-h-0`}>{renderTile(list[0], "", enablePreview ? () => openPreview(0, list) : undefined)}</div>
          <div className={`${pairHeightClass} min-h-0`}>{renderTile(list[1], "", enablePreview ? () => openPreview(1, list) : undefined)}</div>
        </div>
      );
    }
    const extra = count - 3;
    return (
      <div className={`mb-3 ${multiHeightClass} grid grid-cols-3 gap-1 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 min-h-0`}>
        <div className="col-span-2 h-full min-h-0">
          {renderTile(list[0], "", enablePreview ? () => openPreview(0, list) : undefined)}
        </div>
        <div className="col-span-1 grid grid-rows-2 gap-1 h-full min-h-0">
          <div className="h-full min-h-0">{renderTile(list[1], "", enablePreview ? () => openPreview(1, list) : undefined)}</div>
          <div className="relative h-full min-h-0">
            {renderTile(list[2], "", enablePreview ? () => openPreview(2, list) : undefined)}
            {extra > 0 && (
              <button
                type="button"
                className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-2xl font-semibold"
                onClick={enablePreview ? () => openPreview(3, list) : undefined}
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
          <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={authorName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-semibold text-gray-300">{authorName.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Author Info */}
          <div className="flex-1">
            <h3 className="text-white font-semibold leading-snug">{authorName}</h3>
            {authorTitle && <p className="text-xs text-gray-400 leading-snug">{authorTitle}</p>}
            <p className="text-[10px] text-gray-500 leading-snug">{postDate}</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {allowEdit ? (
              <button
                type="button"
                onClick={() => onUpdate?.(id)}
                className="rounded-full border border-[#D85D27] px-3 py-1 text-xs font-medium text-[#D85D27] hover:bg-[#D85D27] hover:text-white transition-colors flex items-center gap-1.5"
              >
                <img src={EditIcon} alt="Edit" className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            ) : null}
            {allowDelete ? (
              <button
                type="button"
                onClick={() => onDelete?.(id)}
                className="rounded-full border border-red-500 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
              >
                <img src={DeleteIcon} alt="Delete" className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : null}
            <div className="relative">
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
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onSave?.(id);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <svg
                        className={`w-4 h-4 ${isSaved ? 'text-orange-500' : 'text-gray-300'}`}
                        viewBox="0 0 24 24"
                        fill={isSaved ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M6 2h12a2 2 0 0 1 2 2v18l-8-4-8 4V4a2 2 0 0 1 2-2z" />
                      </svg>
                      <span>{isSaved ? "Unsave" : "Save"}</span>
                    </button>
                    {!allowEdit && !allowDelete ? (
                      <>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            onReport?.(id);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 flex items-center gap-2 text-amber-300"
                        >
                          <span>Report post</span>
                        </button>
                        {authorUserId ? (
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              onBlockAuthor?.(authorUserId, id);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-700 flex items-center gap-2 text-red-300"
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
        </div>

        {/* Post Content (only when present) */}
        {trimmedContent.length > 0 ? (
          <div className="mb-3">
            <p className="text-[13px] text-gray-300 leading-snug break-words whitespace-pre-wrap">
              {visibleContent}
            </p>
            {isLongContent && !showFullContent && (
              <button
                type="button"
                onClick={() => setShowFullContent(true)}
                className="mt-1 text-xs font-semibold text-orange-400 hover:text-orange-300"
              >
                Read more
              </button>
            )}
          </div>
        ) : null}

        {/* Post Media (supports multiple). Skip for repost-only */}
        {!isRepostOnly && renderMediaGrid(
          (media && media.length > 0)
            ? media
            : (imageUrl ? [{ url: imageUrl, type: mediaType }] : [])
        )}

        {/* Attached original (for repost) */}
        {attachment ? (
          <div className="mt-3 mb-3 border border-gray-700 rounded-lg p-3">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                {attachment.avatarUrl ? (
                  <img src={attachment.avatarUrl} alt={attachment.authorName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-gray-300">
                    {attachment.authorName.charAt(0).toUpperCase()}
                  </span>
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
            {renderMediaGrid(
              attachment.media && attachment.media.length > 0
                ? attachment.media
                : (attachment.imageUrl ? [{ url: attachment.imageUrl, type: attachment.mediaType || "image" }] : []),
              true
            )}
          </div>
        ) : null}

        {/* Post Stats - show likes, reposts, comments counts */}
        <div className="flex justify-between items-center my-3 pb-3 border-b border-gray-700">
          {/* Likes with icon */}
          <div className="flex items-center gap-1 text-gray-400 text-sm">
            <svg
              className={`w-5 h-5 ${isLiked ? 'text-gray-500' : 'text-gray-500'}`}
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

          {/* Reposts and Comments */}
          <div className="flex items-center gap-4 text-gray-400 text-sm">
            <div className="flex items-center gap-1">
              <span>{repostCount} {repostCount === 1 ? 'Repost' : 'Reposts'}</span>
            </div>
            <button
              onClick={() => onComment && onComment(id)}
              className="flex items-center gap-1 hover:text-gray-200 transition-colors"
            >
              <span>{initialComments} {initialComments === 1 ? 'Comment' : 'Comments'}</span>
            </button>
          </div>
        </div>

        {/* Post Actions */}
      <div className="flex flex-row justify-between items-center gap-1 sm:gap-2">
        <button
          onClick={handleLike}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-colors flex-1 ${
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
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-colors flex-1 ${
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
            onClick={(e) => {
              onRepost?.(id, e);
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg transition-colors min-h-[36px] flex-1 ${
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
            className="flex flex-col sm:flex-row items-center justify-center gap-1 px-2 sm:px-3 py-1.5 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors min-h-[36px] flex-1"
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

        {/* Comments slot below action buttons */}
        {children ? <div className="mt-3 pt-3 border-t border-gray-700">{children}</div> : null}
      </div>
    </GradientContainer>
    {lightboxIndex !== null && (() => {
      const list = lightboxItems || ((media && media.length > 0) ? media : (imageUrl ? [{ url: imageUrl, type: mediaType }] : []));
      const total = list.length;
      const idx = lightboxIndex;
      if (idx < 0 || idx >= total) return null;
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
          <div className="relative">
            {/* Close */}
            <button className="absolute top-3 right-3 text-white/90 hover:text-white bg-black/50 rounded-full px-3 py-1" onClick={closePreview} aria-label="Close">
              ✕
            </button>
            {/* Media */}
            {list[idx]?.type === 'video' ? (
              <video src={list[idx].url} controls className="w-full h-auto max-h-[90vh] bg-black" />
            ) : (
              <img src={list[idx].url} alt="preview" className="w-full h-auto max-h-[90vh] object-contain" />
            )}
          </div>
        </div>
      </div>
    )})()}
    </>
  );
}
;

export default ProfessionalFeedPost;
