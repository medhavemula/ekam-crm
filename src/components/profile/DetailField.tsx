import React from "react";

/**
 * One fact on a profile card: what it is, then what it says.
 *
 * The three detail cards each invented their own scale — `text-lg` label-colon-
 * value runs on one, `text-xl` section headings on another, `text-[15px]` rows
 * on a third — so three cards sitting side by side in the same row read as
 * three different documents. This is the one pattern they share, and it matches
 * the profile card beside them: an eyebrow for the field name, body text for
 * the value.
 */
export const DetailField: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className = "" }) => (
  <div className={`min-w-0 ${className}`}>
    <p className="ekam-eyebrow text-[9px] font-semibold leading-none tracking-[0.04em] text-[var(--ov-ink-4)]">
      {label}
    </p>
    <div className="mt-1.5 break-words text-[14px] leading-6 text-[var(--ov-ink)] md:text-[15px]">
      {children}
    </div>
  </div>
);

/**
 * A list of short values — skills, technologies — as chips rather than a
 * comma-separated run, which at any length stops being readable.
 */
export const DetailChips: React.FC<{ values: string[] }> = ({ values }) => (
  <div className="flex flex-wrap gap-1.5">
    {values.map((value) => (
      <span
        key={value}
        className="inline-flex items-center rounded-lg bg-[var(--ov-fill-subtle)] px-2 py-1 text-[12px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)]"
      >
        {value}
      </span>
    ))}
  </div>
);

/** Splits either shape the API sends — an array, or one comma-joined string. */
export const toList = (value?: string[] | string): string[] =>
  Array.isArray(value)
    ? value.map((v) => String(v).trim()).filter(Boolean)
    : String(value ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

export default DetailField;
