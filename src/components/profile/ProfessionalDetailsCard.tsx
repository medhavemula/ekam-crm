import React, { useState } from "react";
import GradientContainer from "../common/GradientContainer";
import { DetailField } from "./DetailField";

export interface ProfessionalDetail {
  companyName?: string;
  companyType?: string;
  companySize?: string;
  established?: string;
  sponsorName?: string;
  summary?: string;
  businessShortDescription?: string;
  role?: string;
  yearsOfExperience?: number | string;
  professionalCategory?: string;
  skillsTechnologies?: string[] | string;
  workPreference?: string;
}

export interface ProfessionalDetailsCardProps {
  details: ProfessionalDetail;
  variant?: "gradient" | "none";
  className?: string;
  title?: string;
}

export const ProfessionalDetailsCard: React.FC<ProfessionalDetailsCardProps> = ({ details, className, variant: _variant = "gradient", title = "Business Details" }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const toggleExpand = () => {
    if (isExpanded && contentRef.current) {
      // Reset scroll position to top when collapsing
      contentRef.current.scrollTop = 0;
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <GradientContainer className={`h-full ${className || ''}`}>
      <div className="rounded-2xl md:rounded-2xl p-5 md:p-8 h-full flex flex-col">
        {/* Title */}
        {/* An accent rule beside the title, so each card announces its subject. */}
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-[var(--ov-ember-fill)]" />
          <h3 className="ekam-figure text-[17px] font-bold text-[var(--ov-ink)] md:text-[19px]">
            {title}
          </h3>
        </div>

        {/* Divider only under title */}
        <div className="h-px bg-[var(--ov-line-faint)] my-4 md:my-5 -mx-5 md:-mx-8" />

        {/* Content */}
        <div className="flex flex-grow flex-col gap-5">
          {/* Two to a row: these are short facts, and stacking five of them down
              a wide card leaves it mostly empty. */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {details.companyName && <DetailField label="Company">{details.companyName}</DetailField>}
            {details.companyType && <DetailField label="Type">{details.companyType}</DetailField>}
            {details.companySize && <DetailField label="Size">{details.companySize}</DetailField>}
            {details.established && <DetailField label="Established">{details.established}</DetailField>}
            {details.sponsorName && <DetailField label="Inducted by">{details.sponsorName}</DetailField>}
          </div>

          {(details.summary || details.businessShortDescription) && (
            <div className="flex flex-grow flex-col">
              <p className="ekam-eyebrow text-[9px] font-semibold leading-none tracking-[0.04em] text-[var(--ov-ink-4)]">
                Description
              </p>
              {/* A fixed near-black wash, which on a light panel reads as a grey slab. */}
              <div className="mt-1.5 flex flex-col rounded-xl bg-[var(--ov-fill-subtle)] p-3 ring-1 ring-[color:var(--ov-line-faint)]">
                <div 
                  ref={contentRef}
                  className={`${!isExpanded ? 'max-h-[6rem] overflow-hidden' : 'max-h-[120px] overflow-y-auto pr-2 scrollbar-thin'}`}
                >
                  <p className="whitespace-pre-line break-words text-[14px] leading-6 text-[var(--ov-ink-2)]">
                    {details.summary || details.businessShortDescription}
                  </p>
                </div>
                <button
                  onClick={toggleExpand}
                  className="mt-1 self-end text-sm font-medium text-[var(--ov-ember)] transition-colors hover:text-[var(--ov-ember-fill-hover)] focus:outline-none"
                >
                  {isExpanded ? 'Show Less' : 'Read More'}
                </button>
              </div>
            </div>
          )}
          {/* {details.companyName && (
            <div><span className="text-[var(--ov-ink-4)]">Company: </span><span className="text-[var(--ov-ink-2)]">{details.companyName}</span></div>
          )} */}
        </div>
      </div>
    </GradientContainer>
  );
};

export default ProfessionalDetailsCard;
