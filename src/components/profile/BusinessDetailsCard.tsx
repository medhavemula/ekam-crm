import React from "react";
import { Pencil } from "lucide-react";
import GradientContainer from "../common/GradientContainer";
import { DetailChips, DetailField, toList } from "./DetailField";

export interface BusinessDetail {
  role?: string;
  yearsOfExperience?: number | string;
  professionalCategory?: string;
  skillsTechnologies?: string[] | string;
  workPreference?: string;
  companyName?: string;
  companyType?: string;
  companySize?: string;
  established?: string;
  sponsorName?: string;
  summary?: string;
  businessShortDescription?: string;
}

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
}

export interface BusinessDetailsCardProps {
  details: BusinessDetail;
  /** Optional: pass sizing like h-full so it matches sibling cards */
  className?: string;
  variant?: "gradient" | "none";
  title?: string;
  /** Optional edit callback for showing edit button */
  onEdit?: () => void;
}

/**
 * BusinessDetailsCard
 * - Glassy dark card
 * - Header with subtle bottom divider
 * - Company name strong, company type underlined (like the mock)
 * - Clear section titles + values
 * - Stretches to parent height when you pass className="h-full"
 */
const BusinessDetailsCard: React.FC<BusinessDetailsCardProps> = ({
  details,
  className = "",
  title = "Additional Details",
  // variant = "gradient",
  onEdit,
}) => {
  return (
    <GradientContainer className="h-full">
      {/* Card body uses flex so content fits even with fixed card heights */}
      <div className={"flex h-full flex-col p-5 md:p-6 rounded-2xl text-sm text-[var(--ov-ink-2)] " + className}>
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-[var(--ov-ember-fill)]" />
              <h3 className="ekam-figure text-[17px] font-bold text-[var(--ov-ink)] md:text-[19px]">
                {title}
              </h3>
            </div>
            {onEdit && (
              <button
                onClick={onEdit}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-ember-wash)] hover:text-[var(--ov-ember)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                aria-label="Edit additional details"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="mt-4 h-px w-full bg-[var(--ov-line-faint)]" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 pb-2">
          {(details.role || details.professionalCategory) && (
            <DetailField label="Role">
              {details.role}
              {details.professionalCategory && (
                <span className="mt-0.5 block text-[13px] text-[var(--ov-ink-4)]">
                  {details.professionalCategory}
                </span>
              )}
            </DetailField>
          )}

          {details.yearsOfExperience !== "" && details.yearsOfExperience != null && (
            <DetailField label="Experience">
              <span className="ekam-figure font-semibold">{details.yearsOfExperience}</span>{" "}
              {Number(details.yearsOfExperience) === 1 ? "year" : "years"}
            </DetailField>
          )}

          {toList(details.skillsTechnologies).length > 0 && (
            <DetailField label="Skills">
              <DetailChips values={toList(details.skillsTechnologies)} />
            </DetailField>
          )}

          {details.workPreference && (
            <DetailField label="Work preference">{details.workPreference}</DetailField>
          )}

          {details.companyName && (
            <DetailField label="Company">{details.companyName}</DetailField>
          )}
        </div>
      </div>
    </GradientContainer>
  );
};

export default BusinessDetailsCard;
