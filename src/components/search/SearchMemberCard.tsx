import React from "react";

export interface SearchMemberCardProps {
  id: string;
  name: string;
  headline?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  connectionStatus?: string;
  connectionActionAllowed?: boolean;
  onViewProfile?: (id: string) => void;
  onConnect?: (id: string) => void;
}

/**
 * A member in the directory results.
 *
 * This card was written for the dark chrome and never converted: the name was
 * `text-white`, so on the light search page it was white on white and the cards
 * appeared to have no names; View Profile was white text on a transparent
 * ember-outlined button, which read as an empty box; and the avatar was a fixed
 * grey gradient. All three now come from the theme, so the card is legible on
 * whichever surface it lands on.
 *
 * Shaped like the partner cards elsewhere in the admin surface: panel, hairline
 * ring, actions on their own row at the foot.
 */
export const SearchMemberCard: React.FC<SearchMemberCardProps> = ({
  id,
  name,
  headline,
  email,
  phone,
  avatarUrl,
  connectionStatus,
  connectionActionAllowed,
  onViewProfile,
  onConnect,
}) => {
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:ring-[color:var(--ov-line-strong)]">
      <div className="flex flex-1 gap-4 p-5">
        <span
          aria-hidden="true"
          className="ekam-figure grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--ov-ember-fill)] text-[18px] font-bold text-[var(--ov-on-ember)]"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                // Fall back to the initial rather than a broken-image glyph.
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          ) : (
            initial
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-[var(--ov-ink)]">{name}</h3>
          {headline && (
            <p className="mt-0.5 truncate text-[12px] text-[var(--ov-ink-3)]">{headline}</p>
          )}
          {email && (
            <p className="mt-1.5 truncate text-[12px] text-[var(--ov-ink-4)]" title={email}>
              {email}
            </p>
          )}
          {phone && <p className="truncate text-[12px] text-[var(--ov-ink-4)]">{phone}</p>}
        </div>
      </div>

      <div className="flex gap-2 border-t border-[color:var(--ov-line-faint)] p-4">
        <button
          type="button"
          onClick={() => onViewProfile?.(id)}
          className="h-9 flex-1 rounded-xl text-[12px] font-semibold text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          View profile
        </button>

        {connectionStatus === "NONE" && connectionActionAllowed && (
          <button
            type="button"
            onClick={() => onConnect?.(id)}
            className="h-9 flex-1 rounded-xl bg-[var(--ov-ember-fill)] text-[12px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)]"
          >
            Connect
          </button>
        )}

        {connectionStatus === "PENDING_SENT" && (
          <span className="grid h-9 flex-1 place-items-center rounded-xl bg-[var(--ov-fill-subtle)] text-[12px] font-medium text-[var(--ov-ink-4)]">
            Request sent
          </span>
        )}

        {connectionStatus === "ACCEPTED" && (
          <span className="grid h-9 flex-1 place-items-center rounded-xl bg-[var(--ov-ember-wash)] text-[12px] font-semibold text-[var(--ov-ember)]">
            Connected
          </span>
        )}
      </div>
    </div>
  );
};

export default SearchMemberCard;
