import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  /** 1-indexed. */
  page: number;
  /** Rows per page. */
  limit: number;
  /** Total rows across all pages, from the API. */
  total: number;
  onChange: (page: number) => void;
  /** Plural noun for the count line, e.g. "partners". */
  noun?: string;
  className?: string;
}

/** Page numbers to render, with `null` marking an elision. */
function pageWindow(current: number, last: number): Array<number | null> {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const pages = new Set<number>([1, last, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < last) pages.add(current + 1);
  // Keep the row a stable width near the ends rather than letting it shrink.
  if (current <= 3) [2, 3, 4].forEach((p) => p < last && pages.add(p));
  if (current >= last - 2) [last - 3, last - 2, last - 1].forEach((p) => p > 1 && pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const out: Array<number | null> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

/**
 * Page control for the admin lists.
 *
 * These screens already tracked `page` and `limit` and the API already returned
 * `total`, but nothing rendered a control — so anything past the first page of
 * results was unreachable. The count line is stated in full rather than as a
 * bare page number, because "showing 25–48 of 137" answers "is there more" and
 * "page 2 of 6" only answers it by arithmetic.
 */
export const Pagination: React.FC<PaginationProps> = ({
  page,
  limit,
  total,
  onChange,
  noun = "results",
  className = "",
}) => {
  const lastPage = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  const go = (next: number) => {
    const clamped = Math.min(lastPage, Math.max(1, next));
    if (clamped !== page) onChange(clamped);
  };

  const stepClass =
    "grid h-9 w-9 place-items-center rounded-lg text-[var(--ov-ink-3)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:pointer-events-none disabled:opacity-35";

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col items-center justify-between gap-3 sm:flex-row ${className}`}
    >
      <p className="text-[12.5px] text-[var(--ov-ink-4)]">
        Showing{" "}
        <span className="ekam-figure font-semibold text-[var(--ov-ink-2)]">
          {first}–{last}
        </span>{" "}
        of{" "}
        <span className="ekam-figure font-semibold text-[var(--ov-ink-2)]">{total}</span> {noun}
      </p>

      {lastPage > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className={stepClass}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          {pageWindow(page, lastPage).map((p, i) =>
            p === null ? (
              <span
                key={`gap-${i}`}
                aria-hidden="true"
                className="grid h-9 w-6 place-items-center text-[13px] text-[var(--ov-ink-5)]"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => go(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Page ${p}`}
                className={`ekam-figure grid h-9 min-w-9 place-items-center rounded-lg px-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${
                  p === page
                    ? "bg-[var(--nav-active-wash)] font-semibold text-[var(--ov-ink)] ring-1 ring-[color:var(--nav-active-edge)]"
                    : "font-medium text-[var(--ov-ink-3)] hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)]"
                }`}
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => go(page + 1)}
            disabled={page >= lastPage}
            aria-label="Next page"
            className={stepClass}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
};

export default Pagination;
