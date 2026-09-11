/**
 * RegionalTeamMemberCard - one person on a regional or chapter team.
 *
 * The name used to be set at 24px with the chapter in ember beneath it and the
 * status as a coloured pill, so three things on a small card all shouted. Now
 * the name leads, the role sits under it, and the state and chapter share one
 * quiet line — the same anatomy as the member directory card.
 *
 * Remove was a filled slate slab next to an outlined Edit, which read as the
 * card's primary action. Removing someone is the destructive one, so it is the
 * quieter of the two and only reveals its colour on hover.
 *
 * Built from tokens: on the ED screens these resolve to the light theme, and on
 * the social admin pages — still on the old chrome — :root resolves them back
 * to the dark surface those pages have always drawn.
 */

import GradientContainer from "../common/GradientContainer";

interface RegionalTeamMemberCardProps {
  name: string;
  role: string;
  chapter?: string;
  avatarColor: string;
  avatarInitial: string;
  status?: string;
  onEdit?: () => void;
  onRemove?: (e?: React.MouseEvent) => void;
  removeDisabled?: boolean;
  onRemoveDisabledClick?: () => void;
  onClick?: () => void;
}

/** Active, blocked, ended — a dot and a word, in the tones the app already uses. */
const STATUS_TONE: Record<string, { dot: string; text: string }> = {
  ACTIVE: { dot: "bg-[var(--ov-s3)]", text: "text-[var(--ov-ink-2)]" },
  BLOCKED: { dot: "bg-[var(--ov-ember)]", text: "text-[var(--ov-ember)]" },
  ENDED: { dot: "bg-[var(--ov-ink-5)]", text: "text-[var(--ov-ink-4)]" },
};

export const RegionalTeamMemberCard: React.FC<RegionalTeamMemberCardProps> = ({
  name,
  role,
  chapter,
  avatarColor,
  avatarInitial,
  status,
  onEdit,
  onRemove,
  removeDisabled,
  onRemoveDisabledClick,
  onClick,
}) => {
  const handleCardClick = (e: React.MouseEvent) => {
    // Only trigger onClick if the click wasn't on a button
    if (!(e.target instanceof HTMLElement) || !e.target.closest("button")) {
      onClick?.();
    }
  };

  const key = String(status || "").toUpperCase();
  const tone = STATUS_TONE[key] ?? { dot: "bg-[var(--ov-ink-5)]", text: "text-[var(--ov-ink-4)]" };
  const statusLabel = status ? String(status).charAt(0) + String(status).slice(1).toLowerCase() : "";

  return (
    <GradientContainer className="h-full">
      <div
        onClick={handleCardClick}
        className="flex h-full cursor-pointer flex-col rounded-2xl transition-colors"
      >
        <div className="flex flex-1 items-start gap-3.5 p-5">
          <span
            aria-hidden="true"
            className="ekam-figure grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[15px] font-semibold text-[var(--ov-on-ember)]"
            style={{ backgroundColor: avatarColor }}
          >
            {avatarInitial}
          </span>

          <div className="flex min-w-0 flex-1 flex-col">
            <h3 className="truncate text-[15px] font-semibold leading-tight text-[var(--ov-ink)]">
              {name}
            </h3>
            {role && (
              <p className="mt-1 truncate text-[12.5px] text-[var(--ov-ink-3)]">{role}</p>
            )}

            {(statusLabel || chapter) && (
              <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-[12px]">
                {statusLabel && (
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`}
                    />
                    <span className={`font-medium ${tone.text}`}>{statusLabel}</span>
                  </span>
                )}
                {statusLabel && chapter && (
                  <span aria-hidden="true" className="text-[var(--ov-ink-5)]">
                    ·
                  </span>
                )}
                {chapter && <span className="truncate text-[var(--ov-ink-4)]">{chapter}</span>}
              </div>
            )}
          </div>
        </div>

        {(onEdit || onRemove || removeDisabled) && (
          <div className="mt-auto flex gap-2 border-t border-[color:var(--ov-line-faint)] p-3">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                  return false;
                }}
                className="h-9 flex-1 rounded-lg text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                Edit
              </button>
            )}
            {(onRemove || removeDisabled) && (
              <button
                type="button"
                aria-disabled={removeDisabled || undefined}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (removeDisabled) {
                    onRemoveDisabledClick?.();
                  } else {
                    onRemove?.(e);
                  }
                }}
                className={`h-9 flex-1 rounded-lg text-[13px] font-medium ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${
                  removeDisabled
                    ? "cursor-not-allowed text-[var(--ov-ink-5)] ring-[color:var(--ov-line-faint)]"
                    : "text-[var(--ov-ink-2)] ring-[color:var(--ov-line)] hover:bg-[var(--ov-danger-wash)] hover:text-[var(--ov-danger)]"
                }`}
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </GradientContainer>
  );
};

export default RegionalTeamMemberCard;
