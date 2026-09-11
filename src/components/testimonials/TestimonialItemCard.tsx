 import { useState } from "react";

export interface TestimonialItemCardProps {
  name: string;
  text: string;
  avatarUrl?: string;
  size?: "sm" | "md"; // md = profile inner screen, sm = grid on page
  showTitle?: boolean; // only used by profile wrapper
  showActions?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  statusText?: string; // Optional pill at bottom-right (e.g., Request sent)
  onWithdraw?: () => void; // Shown only to the member who sent the request
}

export default function TestimonialItemCard({ 
  name, 
  text, 
  avatarUrl, 
  size = "sm", 
  showTitle = false, 
  showActions = false, 
  onAccept, 
  onReject, 
  statusText, 
  onWithdraw, 
}: TestimonialItemCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // Sizes
  const AVATAR_SIZE = size === "md" ? 110 : 80;
  // Avatar sits fully inside (no outside overlap). We emulate the same look by
  // spacing content down and pulling avatar visually down from the top curve.
  const AVATAR_OVERLAP = size === "md" ? -35 : -28;
  // Responsive min-height: smaller on tablet, same as before on desktop
  const containerMinH =
    size === "md"
      ? "min-h-[320px] md:min-h-[320px] lg:min-h-[360px]"
      : "min-h-[260px] md:min-h-[280px] lg:min-h-[280px]";

  const buildCardPath = () => {
    const w = 99;
    const h = 100;
    const r = 6;
    const curveY = 12; // Reduced from 15 to bring curve higher
    const centerX = 50;

    const curveLeft = 28; // Reduced from 30
    const curveRight = 72; // Reduced from 70
    const curveDepth = 8; // Reduced from 10 to make curve less deep

    const cp1x = curveLeft + 4;
    const cp1y = curveY - 2;
    const cp2x = centerX - 6;
    const cp2y = curveY - curveDepth;
    const cp3x = centerX + 6;
    const cp3y = curveY - curveDepth;
    const cp4x = curveRight - 4;
    const cp4y = curveY - 2;

    return `
      M ${r} ${curveY}
      L ${curveLeft} ${curveY}
      C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${centerX} ${curveY - curveDepth}
      C ${cp3x} ${cp3y} ${cp4x} ${cp4y} ${curveRight} ${curveY}
      L ${w - r} ${curveY}
      Q ${w} ${curveY} ${w} ${curveY + r}
      L ${w} ${h - r}
      Q ${w} ${h} ${w - r} ${h}
      L ${r} ${h}
      Q 0 ${h} 0 ${h - r}
      L 0 ${curveY + r}
      Q 0 ${curveY} ${r} ${curveY}
      Z
    `.replace(/\s+/g, " ").trim();
  };

  // Check if text is long enough to need truncation (more than 4 lines)
  const shouldTruncate = text && text.length > 150; // Approximate 4 lines
  const displayText = shouldTruncate && !isExpanded 
    ? text.substring(0, 150) + "..." 
    : text;

  return (
    <div className="relative overflow-visible rounded-2xl p-0">
      {showTitle && (
        <div className="mb-4 flex items-center gap-3">
          <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-[var(--ov-ember-fill)]" />
          <h3 className="ekam-figure text-[17px] font-bold text-[var(--ov-ink)] md:text-[19px]">
            Testimonials
          </h3>
        </div>
      )}

      <div className={`relative overflow-visible min-w-0 ${containerMinH} h-auto`}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d={buildCardPath()}
            fill="var(--ov-fill-subtle)"
            stroke="var(--ov-line)"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Avatar */}
        <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: -AVATAR_OVERLAP }}>
          <div
            className={`rounded-full overflow-hidden ring-${size === "md" ? "[5px]" : "[4px]"} ring-[color:var(--ov-panel)] shadow-[var(--ov-shadow-panel)] bg-[var(--ov-fill-subtle)]`}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
          >
            {avatarUrl && !imageError ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-[var(--ov-ink)] text-3xl md:text-4xl font-semibold bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)]">
                {name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex min-w-0 flex-col items-center"
             style={{ paddingTop: size === "md" ? 145 : 120, paddingLeft: 24, paddingRight: 24, paddingBottom: 24 }}>
          <h4 className={`${size === "md" ? "text-lg" : "text-base"} text-[var(--ov-ember)] font-semibold mt-5 mb-5 max-w-full break-words text-center [overflow-wrap:anywhere]`}>{name}</h4>
          <div className="w-full max-w-md min-w-0 text-center">
            <p className={`${size === "md" ? "text-[13px]" : "text-[12px]"} text-[var(--ov-ink-2)] leading-[1.6] italic break-words [overflow-wrap:anywhere] whitespace-pre-wrap ${shouldTruncate && !isExpanded ? "line-clamp-4" : ""}`}>
              <span className="text-[var(--ov-ember)] text-base font-bold not-italic mr-0.5">❝</span>
              {displayText}
              <span className="text-[var(--ov-ember)] text-base font-bold not-italic ml-0.5">❞</span>
            </p>
            {shouldTruncate && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-[var(--ov-ember)] text-xs hover:text-[var(--ov-ember-fill-hover)] transition-colors font-medium self end"
              >
                {isExpanded ? "Read less" : "Read more"}
              </button>
            )}
          </div>

          {(showActions || statusText || onWithdraw) && (
            <div className="w-full flex items-center justify-end mt-6 gap-2">
              {showActions && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onAccept}
                    className="px-4 py-1.5 text-sm bg-transparent border border-[color:var(--ov-line-strong)] hover:border-[color:var(--ov-ember)] text-[var(--ov-ink)] rounded-md transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={onReject}
                    className="px-4 py-1.5 text-sm bg-[var(--ov-fill-subtle)] hover:bg-[var(--ov-fill-hover)] text-[var(--ov-ink-2)] rounded-md transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
              {statusText && (
                <span className="px-3 py-1 text-sm bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-2)] rounded-md">
                  {statusText}
                </span>
              )}
              {onWithdraw && (
                <button
                  onClick={onWithdraw}
                  className="px-4 py-1.5 text-sm bg-transparent border border-[color:var(--ov-line-strong)] hover:border-[color:var(--ov-ember)] text-[var(--ov-ink)] rounded-md transition-colors"
                >
                  Withdraw
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
