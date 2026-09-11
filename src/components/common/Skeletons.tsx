import React from "react";

/**
 * Placeholders for the parts of a screen that come from the database.
 *
 * Only those parts. A page's title, its search box and its buttons are already
 * known the moment the page mounts, so standing in for them says nothing and
 * makes an ordinary wait look like the whole screen is being rebuilt. These go
 * exactly where the records go, and the rest of the page renders as itself.
 *
 * `.ekam-skel` carries the shimmer — see src/index.css.
 */

/** One placeholder block. Every shape below is one of these. */
export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = "",
  style,
}) => <span aria-hidden="true" className={`ekam-skel block ${className}`} style={style} />;

/**
 * A partner card, blocked out: avatar, name and role, the expiry line, the
 * count-and-dates block, and the two actions. Mirrors PartnerCard so the real
 * cards land in the same places rather than shifting the grid when they arrive.
 */
export const PartnerCardSkeleton: React.FC = () => (
  <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]">
    <div className="p-5">
      <div className="flex items-start gap-3">
        <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-4 w-32 max-w-full" />
          <Skeleton className="h-2.5 w-40 max-w-full" />
          <Skeleton className="h-3 w-28 max-w-full" />
        </div>
      </div>

      <Skeleton className="mt-4 h-3 w-36 max-w-full" />

      <div className="mt-4 border-t border-[color:var(--ov-line-faint)] pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-8" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="ml-auto h-3 w-32 max-w-full" />
            <Skeleton className="ml-auto h-3 w-28 max-w-full" />
            <Skeleton className="ml-auto h-3 w-30 max-w-full" />
          </div>
        </div>
      </div>
    </div>

    <div className="mt-auto flex gap-3 p-5 pt-0">
      <Skeleton className="h-10 flex-1 rounded-xl" />
      <Skeleton className="h-10 flex-1 rounded-xl" />
    </div>
  </div>
);

/** A directory result, blocked out: avatar, name, two lines, two actions. */
export const MemberCardSkeleton: React.FC = () => (
  <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]">
    <div className="flex flex-1 gap-4 p-5">
      <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1 space-y-2 pt-1">
        <Skeleton className="h-4 w-32 max-w-full" />
        <Skeleton className="h-3 w-44 max-w-full" />
        <Skeleton className="h-3 w-28 max-w-full" />
      </div>
    </div>
    <div className="flex gap-2 border-t border-[color:var(--ov-line-faint)] p-4">
      <Skeleton className="h-9 flex-1 rounded-xl" />
      <Skeleton className="h-9 flex-1 rounded-xl" />
    </div>
  </div>
);

export const MemberCardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div
    className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
    role="status"
    aria-live="polite"
  >
    {Array.from({ length: count }, (_, i) => (
      <MemberCardSkeleton key={i} />
    ))}
    <span className="sr-only">Searching</span>
  </div>
);

/**
 * Rows, in the panel the real table sits in.
 *
 * `columns` should match the table's, so the rows do not re-flow when the
 * records land.
 */
export const TableSkeleton: React.FC<{ columns?: number; rows?: number }> = ({
  columns = 3,
  rows = 6,
}) => (
  <div
    className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]"
    role="status"
    aria-live="polite"
  >
    <div className="flex items-center gap-6 border-b border-[color:var(--ov-line)] bg-[var(--table-head-bg)] px-5 py-4">
      {Array.from({ length: columns }, (_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }, (_, r) => (
      <div
        key={r}
        className="flex items-center gap-6 border-b border-[color:var(--ov-line-faint)] px-5 py-4 last:border-b-0"
      >
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
    ))}
    <span className="sr-only">Loading</span>
  </div>
);

/**
 * A grid of them, in the same columns the real grid uses.
 *
 * `count` should be what the page asks the server for, so the grid does not
 * jump between the placeholder and the answer.
 */
export const PartnerCardGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div
    className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    role="status"
    aria-live="polite"
  >
    {Array.from({ length: count }, (_, i) => (
      <PartnerCardSkeleton key={i} />
    ))}
    <span className="sr-only">Loading</span>
  </div>
);

/** A chapter in the regional board grid: tile, name, location, count, actions. */
export const ChapterCardSkeleton: React.FC = () => (
  <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]">
    <div className="flex flex-1 items-start gap-3 p-5">
      <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <Skeleton className="h-4 w-28 max-w-full" />
        <Skeleton className="h-3 w-36 max-w-full" />
      </div>
      <div className="shrink-0 space-y-2">
        <Skeleton className="ml-auto h-6 w-8" />
        <Skeleton className="ml-auto h-2.5 w-14" />
      </div>
    </div>
    <div className="flex gap-2 border-t border-[color:var(--ov-line-faint)] p-3">
      <Skeleton className="h-9 flex-1 rounded-lg" />
      <Skeleton className="h-9 flex-1 rounded-lg" />
    </div>
  </div>
);

export const ChapterCardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div
    className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    role="status"
    aria-live="polite"
  >
    {Array.from({ length: count }, (_, i) => (
      <ChapterCardSkeleton key={i} />
    ))}
    <span className="sr-only">Loading chapters</span>
  </div>
);
