/**
 * ChapterCard - one chapter in the regional board grid.
 *
 * The previous card led with a 7xl orange member count and a 3xl orange chapter
 * name, which made every card shout the same two things and left the location —
 * the field that actually distinguishes one chapter from the next — as grey
 * small print. Here the name leads, the count is a figure rather than a poster,
 * and the two actions read as a primary and a secondary instead of an outlined
 * button next to an unrelated grey slab.
 *
 * Built from tokens: on the ED board these resolve to the light theme, and on
 * the social admin board — still on the old chrome — :root resolves them back
 * to the dark surface that page has always drawn.
 */

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin } from "lucide-react";

interface ChapterCardProps {
  chapterName: string;
  location: string;
  memberCount: number;
  onViewMembers: () => void;
  onViewChapter: () => void;
  onViewManyToOne?: () => void;
  manyToOneLabel?: string;
  /** Entrance delay, in seconds, so a grid staggers rather than snapping in. */
  delay?: number;
}

/** The upstream data uses "Unknown Location" as a stand-in; a blank line reads better. */
const isPlaceholder = (value: string) => !value || /^unknown/i.test(value.trim());

export const ChapterCard: React.FC<ChapterCardProps> = ({
  chapterName,
  location,
  memberCount,
  onViewMembers,
  onViewChapter,
  onViewManyToOne,
  manyToOneLabel = "Many to One",
  delay = 0,
}) => {
  const reduceMotion = useReducedMotion();
  const initial = (chapterName || "?").trim().charAt(0).toUpperCase();
  const hasLocation = !isPlaceholder(location);
  // Some callers map a field that is not always present; a blank slot reads as a bug.
  const count = Number.isFinite(Number(memberCount)) ? Number(memberCount) : 0;

  const entrance = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <motion.div
      {...entrance}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] transition-colors duration-200 hover:ring-[color:var(--ov-line-strong)]"
    >
      {/* The card opens the chapter. A button rather than a handler on the div,
          so it is reachable by keyboard; the real actions sit outside it. */}
      <button
        type="button"
        onClick={onViewChapter}
        aria-label={`Open ${chapterName}`}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
      />

      <div className="pointer-events-none relative z-10 flex flex-1 items-start gap-3 p-5">
        <span
          aria-hidden="true"
          className="ekam-figure grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--ov-ember-wash)] text-[16px] font-bold text-[var(--ov-ember)] ring-1 ring-[color:var(--ov-ember-edge)]"
        >
          {initial}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-[var(--ov-ink)]">
            {chapterName}
          </h3>
          {hasLocation && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[var(--ov-ink-3)]">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--ov-ink-4)]" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          )}
        </div>

        {/* One number, right-aligned against the name — the count is reference,
            not the headline it used to be. */}
        <div className="shrink-0 text-right">
          <p className="ekam-figure text-[24px] font-semibold leading-none text-[var(--ov-ink)]">
            {count}
          </p>
          <p className="ekam-eyebrow mt-1.5 text-[9.5px] font-semibold text-[var(--ov-ink-4)]">
            {count === 1 ? "Member" : "Members"}
          </p>
        </div>
      </div>

      <div className="pointer-events-auto relative z-10 mt-auto flex gap-2 border-t border-[color:var(--ov-line-faint)] p-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewMembers();
          }}
          className="h-9 flex-1 rounded-lg text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
        >
          Members
        </button>

        {onViewManyToOne && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewManyToOne();
            }}
            className="h-9 flex-1 rounded-lg text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
          >
            {manyToOneLabel}
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewChapter();
          }}
          className="h-9 flex-1 rounded-lg bg-[var(--ov-ember-fill)] text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)]"
        >
          View chapter
        </button>
      </div>
    </motion.div>
  );
};

export default ChapterCard;
