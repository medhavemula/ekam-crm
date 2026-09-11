import React from "react";
import GradientContainer from "../common/GradientContainer";
import { DetailField } from "./DetailField";

export interface PersonalDetail {
  memberNumber?: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  chapterName?: string;
  chapterRegion?: string;
  expiryDate?: string;
  daysLeft?: number;
}

export interface PersonalDetailsCardProps {
  details: PersonalDetail;
  variant?: "gradient" | "none";
  className?: string;
}

/**
 * PersonalDetailsCard — UI tuned to match the "I want" screenshot
 * - Dark gradient card, large rounded corners
 * - Bold heading + thin divider
 * - Spacious rows with filled orange icons
 * - Clickable phone/email/website
 * - Nice wrapping for long address
 */
export const PersonalDetailsCard: React.FC<PersonalDetailsCardProps> = ({ details, className }) => {
  const Row: React.FC<{ icon: React.ReactNode; children: React.ReactNode; alignTop?: boolean }> = ({
    icon,
    children,
    alignTop = false,
  }) => (
    <div className={`flex ${alignTop ? "items-start" : "items-center"} gap-3.5`}>
      {/* A chip, not a loose glyph: the wash gives the icon a home and keeps
          the row scannable when several stack up. */}
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--ov-ember-wash)] text-[var(--ov-ember)] ring-1 ring-[color:var(--ov-ember-edge)] [&>svg]:h-[18px] [&>svg]:w-[18px]"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 text-[14px] leading-relaxed text-[var(--ov-ink-2)] md:text-[15px]">
        {children}
      </div>
    </div>
  );

  // const cleanWebsite = (details.website || "").replace(/^https?:\/\//, "");

  return (
    <GradientContainer className={className}>
      <div className="rounded-2xl md:rounded-2xl p-5 md:p-8 h-full flex flex-col">
        {/* Title */}
        {/* An accent rule beside the title, so each card announces its subject. */}
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-[var(--ov-ember-fill)]" />
          <h3 className="ekam-figure text-[17px] font-bold text-[var(--ov-ink)] md:text-[19px]">
            Personal Details
          </h3>
        </div>

        {/* Thin divider spanning edge-to-edge */}
        <div className="h-px bg-[var(--ov-line-faint)] my-4 md:my-5 -mx-5 md:-mx-8 flex-shrink-0" />

        {/* Content */}
        <div className="space-y-4 md:space-y-4 flex-grow flex flex-col">
          {details.memberNumber ? (
            <Row
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1V7Zm2 0v2h6V7H9Zm6 14v-2H9v2h6Zm5-4v-4H6v4h14Z" />
                </svg>
              }
            >
              <span>{details.memberNumber}</span>
            </Row>
          ) : null}

          {/* Phone (tel link) */}
          {details.phone && (
          <Row
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59 2 2 0 0 0 2.11-.45l1.27-1.27a1 1 0 0 1 1.11-.22c1 .41 2.09.69 3.2.82a1 1 0 0 1 .88 1v3a2 2 0 0 1-2.18 2 19.7 19.7 0 0 1-8.64-3.08 19.5 19.5 0 0 1-6-6A19.7 19.7 0 0 1 2 4.18 2 2 0 0 1 4 2h3a1 1 0 0 1 1 .88c.13 1.11.41 2.2.82 3.2a1 1 0 0 1-.22 1.11L7.33 8.46a2 2 0 0 0-.71 2.33z" />
              </svg>
            }
          >
            <a className="hover:underline" href={`tel:${details.phone}`}>{details.phone}</a>
          </Row>
          )}

          {/* Email (mailto link) */}
          {details.email && (
          <Row
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm-1.4 4.25-6.07 4.21a1 1 0 0 1-1.06 0L5.4 8.25a1 1 0 1 1 1.2-1.6L12 10.6l5.4-3.95a1 1 0 1 1 1.2 1.6Z" />
              </svg>
            }
          >
            <a className="hover:underline" href={`mailto:${details.email}`}>{details.email}</a>
          </Row>
          )}

          {/* Website (anchor) */}
          {/* <Row
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-1.5 16.9C7.8 17.4 6 15 6 12s1.8-5.4 4.5-6.9c-.3.9-.5 2.1-.5 3.4 0 2.6.7 4.9 1.5 6.5-.5 1.1-1.1 1.9-1.5 2.9Zm3 0c.4-1 .9-1.8 1.5-2.9.8-1.6 1.5-3.9 1.5-6.5 0-1.3-.2-2.5-.5-3.4C16.2 6.6 18 9 18 12s-1.8 5.4-4.5 6.9ZM4 12c0 1 .1 1.9.4 2.7h15.2c.3-.8.4-1.7.4-2.7s-.1-1.9-.4-2.7H4.4C4.1 10.1 4 11 4 12Z" />
              </svg>
            }
          >
            <a
              className="hover:underline break-all"
              href={/^https?:\/\//i.test(details.website) ? details.website : `https://${cleanWebsite}`}
              target="_blank"
              rel="noreferrer"
            >
              {cleanWebsite}
            </a>
          </Row> */}

          {/* Address (top-aligned & wraps nicely) */}
          {details.address && (
          <Row
            alignTop
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a8 8 0 0 0-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
              </svg>
            }
          >
            <p className="whitespace-pre-line break-words">
              {details.address}
            </p>
          </Row>
          )}
        </div>

        {(details.chapterName || details.chapterRegion || details.expiryDate) && (
          <>
            <div className="h-px bg-[var(--ov-line-faint)] my-4 md:my-5 -mx-5 md:-mx-8 flex-shrink-0" />
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
              {(details.chapterName || details.chapterRegion) && (
                <DetailField label="Chapter">
                  {details.chapterName}
                  {details.chapterRegion && (
                    <span className="mt-0.5 block text-[13px] text-[var(--ov-ink-4)]">
                      {details.chapterRegion}
                    </span>
                  )}
                </DetailField>
              )}

              {details.expiryDate ? (
                <DetailField label="Expires" className="md:border-l md:border-[color:var(--ov-line)] md:pl-6">
                  {details.expiryDate}
                  {/* The pill was ember fill under --ov-ink, which is the ink for
                      panels, not for ember. Inside thirty days it is a warning;
                      beyond that it is just a fact. */}
                  {typeof details.daysLeft === "number" && details.daysLeft > 0 && (
                    <span
                      className={`ekam-eyebrow mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        details.daysLeft <= 30
                          ? "bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)]"
                          : "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-3)] ring-1 ring-[color:var(--ov-line)]"
                      }`}
                    >
                      {details.daysLeft} days left
                    </span>
                  )}
                </DetailField>
              ) : null}
            </div>
          </>
        )}
      </div>
    </GradientContainer>
  );
};

export default PersonalDetailsCard;