import React from "react";
import { useNavigate } from "react-router-dom";
import GradientContainer from "../common/GradientContainer";

export interface FeedItem {
  id: number;
  postId?: string; // actual post ID from backend
  image?: string;
  mediaType?: 'image' | 'video';
  videoThumbnail?: string;
  title: string;
  description: string;
  link: string;   // e.g. "See More"
  date: string;
}

export interface MyFeedCardProps {
  feedItems: FeedItem[];
  className?: string;
  variant?: "gradient" | "none";
}

/**
 * MyFeedCard — smaller row height (compact feed items)
 */
export const MyFeedCard: React.FC<MyFeedCardProps> = ({ feedItems, className = "", variant: _variant = "gradient" }) => {
  const navigate = useNavigate();

  const titleCls = "ekam-figure text-[17px] md:text-[19px] font-bold text-[var(--ov-ink)]";
  const [open, setOpen] = React.useState<Record<number, boolean>>({});
  const MAX_CHARS = 120; // keep preview shorter

  const toggle = (id: number) => setOpen((s) => ({ ...s, [id]: !s[id] }));
  const preview = (t: string) =>
    t.length <= MAX_CHARS ? t : t.slice(0, MAX_CHARS).trimEnd() + "…";

  const handleSeeMore = (postId?: string) => {
    if (postId) {
      navigate(`/post/${postId}`);
    }
  };

  return (
    <GradientContainer className="h-full">
      <div className={`rounded-2xl p-3 md:p-4 flex flex-col h-full min-h-0 overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-[var(--ov-ember-fill)]" />
          <h3 className={titleCls}>My Feed</h3>
        </div>
        <div className="h-px bg-[var(--ov-fill-subtle)] my-2 -mx-3 md:-mx-4" />

        {/* Feed items with scroll */}
        <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {(feedItems && feedItems.length > 0 ? feedItems : []).map((item, idx) => {
            const expanded = !!open[item.id];
            const isLong = item.description.length > MAX_CHARS;
            const textToShow = expanded ? item.description : preview(item.description);

            return (
              <div
                key={item.id ?? idx}
                className="flex gap-2 md:gap-3 border-b border-[color:var(--ov-line)] pb-2 last:border-0"
              >
                {/* Thumbnail area: always present. If no image, show neutral placeholder. */}
                <div data-thumb className="w-24 h-16 md:w-40 md:h-28 rounded-lg overflow-hidden flex-shrink-0 relative group">
                  {item.image && (
                    <div 
                      className="relative w-full h-full cursor-pointer"
                      onClick={() => item.postId && handleSeeMore(item.postId)}
                    >
                      {item.mediaType === 'video' ? (
                        <div className="relative w-full h-full">
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center overflow-hidden">
                            <video
                              src={item.image}
                              className="w-full h-full object-cover opacity-90 group-hover:opacity-75 transition-opacity"
                              preload="metadata"
                              playsInline
                              muted
                              disablePictureInPicture
                              controlsList="nodownload nofullscreen noplaybackrate"
                              onError={(e) => {
                                const videoEl = e.currentTarget as HTMLVideoElement;
                                videoEl.style.display = 'none';
                                const wrap = (videoEl.closest('[data-thumb]') as HTMLElement) || null;
                                const ph = wrap ? (wrap.querySelector('[data-ph]') as HTMLElement | null) : null;
                                if (ph) ph.style.display = 'flex';
                              }}
                            >
                              Your browser does not support the video tag.
                            </video>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/80 flex items-center justify-center group-hover:bg-white transition-all transform group-hover:scale-110">
                                <svg
                                  className="w-5 h-5 md:w-6 md:h-6 text-gray-800 ml-0.5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const imgEl = e.currentTarget as HTMLImageElement;
                            imgEl.style.display = 'none';
                            const wrap = (imgEl.closest('[data-thumb]') as HTMLElement) || null;
                            const ph = wrap ? (wrap.querySelector('[data-ph]') as HTMLElement | null) : null;
                            if (ph) ph.style.display = 'flex';
                          }}
                        />
                      )}
                    </div>
                  )}
                  {/* Placeholder box (initially hidden only when media exists) */}
                  <div
                    data-ph
                    className={`absolute inset-0 ${item.image ? 'hidden' : 'flex'} items-center justify-center bg-gradient-to-br from-gray-600/40 to-gray-800/40`}
                  >
                    <svg
                      className="w-8 h-8 text-[var(--ov-ink-4)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <p className="text-[11px] md:text-[15px] text-[var(--ov-ink-2)] leading-tight">
                    {item.title} {textToShow}
                    {isLong && (
                      <button
                        type="button"
                        onClick={() => {
                          if (item.postId) {
                            handleSeeMore(item.postId);
                          } else {
                            toggle(item.id);
                          }
                        }}
                        className="ml-1 text-orange-500 hover:underline underline-offset-2"
                        title={item.postId ? "View full post" : expanded ? "Show Less" : "See More"}
                      >
                        {item.postId ? "See More" : (expanded ? "Show Less" : "See More")}
                      </button>
                    )}
                  </p>

                  <span className="block text-[10px] md:text-[12px] text-[var(--ov-ink-4)] mt-1">
                    {item.date}
                  </span>
                </div>
              </div>
            );
          })}
          {(!feedItems || feedItems.length === 0) && (
            <div className="h-full min-h-[120px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-[var(--ov-ink-4)]">
                <div className="w-16 h-16 rounded-lg bg-gray-700/50 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-[var(--ov-ink-5)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div className="text-sm">No feed items yet.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </GradientContainer>
  );
};

export default MyFeedCard;
