import React, { useMemo } from "react";
import FormInput from "../forms/FormInput";
import FormSelect from "../forms/FormSelect";
import type { ProfessionalData, FormErrors } from "../../types/registration.types";
import { useListProfessionalCategoriesQuery } from "../../services/publicApi";
import { workPreferenceOptions } from "../../utils/businessCategories";

interface ProfessionalStepProps {
  data: ProfessionalData;
  errors: FormErrors;
  onChange: (field: keyof ProfessionalData, value: string | string[]) => void;
  regionId?: string; // Add regionId prop for API call
}

export const ProfessionalStep: React.FC<ProfessionalStepProps> = ({ data, errors, onChange, regionId }) => {
  // Fetch professional categories based on region
  const { data: categoriesResponse, isLoading: categoriesLoading } = useListProfessionalCategoriesQuery({
    regionId: regionId || undefined,
    limit: 20
  });

  // Transform categories data for the select component
  const professionalCategoryOptions = useMemo(() => {
    const baseOptions = [];
    
    if (categoriesResponse?.data) {
      // Handle new API response structure: data array directly contains categories
      const categories = Array.isArray(categoriesResponse.data) 
        ? categoriesResponse.data 
        : [];
      
      // Remove duplicates based on value and sort by label
      const uniqueCategories = categories
        .filter((category: any, index: number, self: any[]) => 
          self.findIndex((c: any) => c.value === category.value) === index
        )
        .sort((a: any, b: any) => a.label.localeCompare(b.label));
      
      baseOptions.push(...uniqueCategories.map((category: any) => ({
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* <FormInput
        label="Name"
        placeholder="Enter Name"
        value={data.name}
        onChange={(e) => {
          const cleaned = (e.target.value || "").replace(/[^A-Za-z ]/g, "");
          onChange("name", cleaned);
        }}
        error={errors.name}
        isRequired
      /> */}

      <FormInput
        label="Designation"
        placeholder="Enter Designation"
        value={data.role}
        pattern="[A-Za-z\s]*"
        onChange={(e) => {
          const cleaned = (e.target.value || "").replace(/[^A-Za-z , .]/g, "");
          onChange("role", cleaned);
        }}
        error={errors.role}
        isRequired
      />

      <FormSelect
        label="Work Preference"
        options={workPreferenceOptions}
        placeholder="Select work preference"
        value={data.workPreference}
        onChange={(e) => onChange("workPreference", e.target.value)}
        error={errors.workPreference}
        isRequired
      />

      <FormInput
        label="Years of Experience"
        placeholder="Enter Years of Experience"
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={data.yearsOfExperience}
        onKeyDown={(e) => {
          if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
            e.preventDefault();
          }
        }}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D+/g, "");
          onChange("yearsOfExperience", digits);
        }}
        error={errors.yearsOfExperience}
      />

      <FormSelect
        label="Professional Category"
        options={professionalCategoryOptions}
        placeholder={categoriesLoading ? "Loading categories..." : "Search or select a category"}
        value={data.professionalCategory}
        onChange={(e) => {
          const value = e.target.value;
          onChange("professionalCategory", value);
          // Clear other category field if not "other"
          if (value !== "other") {
            onChange("professionalCategoryCustom", "");
          }
        }}
        error={errors.professionalCategory}
        isRequired
        searchable
        searchPlaceholder="Search categories..."
        disabled={categoriesLoading}
      />

      {/* Show custom input when "Other" is selected */}
      {data.professionalCategory === "other" && (
        <FormInput
          label="Please specify your professional category"
          placeholder="Enter your professional category"
          value={data.professionalCategoryCustom || ""}
          onChange={(e) => {
            const cleaned = (e.target.value || "").replace(/[^A-Za-z\s&\-]/g, "");
            onChange("professionalCategoryCustom", cleaned);
          }}
          error={errors.professionalCategoryCustom}
          isRequired
        />
      )}

      <FormInput
        label="Skills & Technologies"
        placeholder="e.g. Node.js, MongoDB, AWS, React"
        value={Array.isArray(data.skillsTechnologies) ? data.skillsTechnologies.join(", ") : data.skillsTechnologies}
        onChange={(e) => {
          const cleaned = (e.target.value || "").replace(/[^A-Za-z , .]/g, "");
          onChange("skillsTechnologies", cleaned);
        }}
        error={errors.skillsTechnologies}
      />
    </div>
  );
};

export default ProfessionalStep;
