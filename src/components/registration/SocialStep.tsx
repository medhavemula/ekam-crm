import React, { useMemo } from "react";
import type { ChangeEvent } from "react";
import FormInput from "../forms/FormInput";
import FormSelect from "../forms/FormSelect";
import type { SocialData, FormErrors } from "../../types/registration.types";
import { useListSocialCategoriesQuery, useListSocialChaptersQuery } from "../../services/publicApi";

interface SocialStepProps {
  data: SocialData;
  errors: FormErrors;
  onChange: (field: keyof SocialData, value: string | boolean | string[]) => void;
  regionId?: string; // Add regionId prop for API call
  registrationType?: 'business' | 'professional' | 'social' | 'normal'; // Registration type
  moduleAccess?: ('business' | 'professional' | 'social')[]; // Module access for normal registration
  hideSocialChapter?: boolean; // Hide social chapter dropdown when LocationSelectionFields is showing it
}

const travelOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "maybe", label: "Maybe" },
];

export const SocialStep: React.FC<SocialStepProps> = ({ data, errors, onChange, regionId, registrationType, moduleAccess, hideSocialChapter }) => {
  // Fetch social categories based on region
  const { data: categoriesResponse, isLoading: categoriesLoading } = useListSocialCategoriesQuery({
    regionId: regionId || undefined,
    limit: 100
  });

  // Fetch social chapters for dropdown

  // Determine if social chapter input should be shown
  // Hide for social registration since it's already handled in Basic Info step
  const showSocialChapterInput = registrationType === 'normal' &&
    moduleAccess &&
    moduleAccess.includes('social') &&
    !hideSocialChapter;

  // Transform categories data for the select component
  const socialCategoryOptions = useMemo(() => {
    const baseOptions = [];

    if (categoriesResponse?.data) {
      // Handle new API response structure: data array directly contains categories
      const categories = Array.isArray(categoriesResponse.data)
        ? categoriesResponse.data
        : [];

      baseOptions.push(...categories.map((category: any) => ({
        value: category.value,
        label: category.label,
      })));
    }

    // Add "Other" option at the end
    baseOptions.push({
      value: "other",
      label: "Other (Please specify)"
    });

    return baseOptions;
  }, [categoriesResponse]);

  const showOtherSocialCategory = Array.isArray(data.socialCategory) && data.socialCategory.includes("other");

  const {
    data: socialChaptersResponse,
    isLoading: socialChaptersLoading,
  } = useListSocialChaptersQuery(
    {
      regionId: regionId || undefined,
      limit: 20,
    },
    {
      refetchOnMountOrArgChange: true,
    }
  );

  const socialChapterOptions = useMemo(() => {
    if (!socialChaptersResponse?.data) {
      return [];
    }

    const chapters = Array.isArray(socialChaptersResponse.data)
      ? socialChaptersResponse.data
      : [];

    const filteredChapters = regionId
      ? chapters.filter(
        (chapter: any) => chapter.regionId === regionId
      )
      : chapters;

    return filteredChapters.map((chapter: any) => ({
      value: chapter.id,
      label: chapter.name,
    }));
  }, [socialChaptersResponse, regionId]);

  const motivationField = (
    <FormInput
      label="Motivation to join Ekam"
      placeholder="Enter your motivation"
      value={data.motivation}
      onChange={(e) => onChange("motivation", e.target.value)}
      error={errors.motivation}
      isRequired
    />
  );

  return (
    <div className="space-y-6">
      {/* First row: 3 fields on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mt-2">
        <div className="lg:col-span-4 space-y-2">
          <FormSelect
            label="Social Category"
            options={socialCategoryOptions.filter((opt: { value: string; label: string }) => !data.socialCategory.map((v: string) => v.toLowerCase()).includes(opt.value.toLowerCase()))}
            placeholder={categoriesLoading ? "Loading categories..." : "Select Category"}
            value=""
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              const next = e.target.value;
              if (!next) return;

              if (next === "other") {
                // For "Other", add it to the array and let user specify in the text field
                if (!data.socialCategory.map((v: string) => v.toLowerCase()).includes("other")) {
                  const updated = Array.isArray(data.socialCategory)
                    ? [...data.socialCategory, "other"]
                    : ["other"];
                  onChange("socialCategory", updated);
                }
              } else {
                const updated = Array.isArray(data.socialCategory)
                  ? [...data.socialCategory, next]
                  : [next];
                onChange("socialCategory", updated);
              }
            }}
            error={errors.socialCategory}
            isRequired
            searchable
            searchPlaceholder="Search categories..."
            disabled={categoriesLoading}
          />

          {Array.isArray(data.socialCategory) && data.socialCategory.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.socialCategory.map((id) => {
                const option = socialCategoryOptions.find((o: { value: string; label: string }) => o.value === id);
                const label = option ? option.label : id;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#33363B] border border-gray-600 text-xs text-gray-100"
                  >
                    <span className="truncate max-w-[140px]">{label}</span>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-white text-[10px] leading-none"
                      onClick={() => {
                        const updated = data.socialCategory.filter((v) => v !== id);
                        onChange("socialCategory", updated);
                        // If removing "other", clear the custom field
                        if (id === "other") {
                          onChange("socialCategoryCustom", "");
                        }
                      }}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {showOtherSocialCategory && (
            <FormInput
              label="Other social category"
              placeholder="Enter your social category"
              value={data.socialCategoryCustom || ""}
              onChange={(e) => {
                const cleaned = (e.target.value || "").replace(/[^A-Za-z\s&\-]/g, "");
                onChange("socialCategoryCustom", cleaned);
              }}
              error={errors.socialCategoryCustom}
              isRequired
            />
          )}
        </div>

        <div className="lg:col-span-4">
          <FormInput
            label="Hobbies"
            placeholder="Enter Hobbies"
            value={data.hobbies}
            onChange={(e) => {
              const cleaned = (e.target.value || "").replace(/[^A-Za-z , .]/g, "");
              onChange("hobbies", cleaned);
            }}
            error={errors.hobbies}
            isRequired
          />
        </div>

        <div className="lg:col-span-4 md:col-span-2">
          {motivationField}
        </div>
      </div>

      {/* Second row: 1 field on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Social Chapter Dropdown - Show for normal registration with social access */}
        {showSocialChapterInput && (
          <div className="lg:col-span-4">
            <FormSelect
              key={`social-step-${regionId || "all"}`}
              label="Which Social chapter are you registering for"
              options={socialChapterOptions}
              placeholder={socialChaptersLoading ? "Loading social chapters..." : "Select social chapter"}
              value={data.socialChapter}
              onChange={(e) => onChange("socialChapter", e.target.value)}
              error={errors.socialChapter}
              searchable
              searchPlaceholder="Search social chapters..."
              disabled={socialChaptersLoading}
              isRequired
            />
          </div>
        )}

        <div className="lg:col-span-4">
          <FormSelect
            label="Would you be able to travel for group events?"
            options={travelOptions}
            placeholder="Select your answer"
            value={data.travelForEvents}
            onChange={(e) => onChange("travelForEvents", e.target.value)}
            error={errors.travelForEvents}
          />
        </div>
      </div>

    </div>
  );
};

export default SocialStep;