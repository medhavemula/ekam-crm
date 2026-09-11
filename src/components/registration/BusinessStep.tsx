import React, { useMemo } from "react";
import FormInput from "../forms/FormInput";
import FormSelect from "../forms/FormSelect";
import FormTextarea from "../forms/FormTextarea";
import type { BusinessData, FormErrors } from "../../types/registration.types";
import { useListBusinessCategoriesQuery } from "../../services/publicApi";
import { companySizeOptions } from "../../utils/businessCategories";

interface BusinessStepProps {
  data: BusinessData;
  errors: FormErrors;
  onChange: (field: keyof BusinessData, value: string) => void;
  regionId?: string; // Add regionId prop for API call
}

export const BusinessStep: React.FC<BusinessStepProps> = ({ data, errors, onChange, regionId }) => {
  // Fetch business categories based on region
  const { data: categoriesResponse, isLoading: categoriesLoading } = useListBusinessCategoriesQuery({
    regionId: regionId || undefined,
    limit: 20
  });

  // Transform categories data for the select component
  const businessCategoryOptions = useMemo(() => {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
      <FormInput
        label="Business Name"
        placeholder="Enter business Name"
        value={data.businessName}
        onChange={(e) => {
          const cleaned = (e.target.value || "").replace(/[^A-Za-z ]/g, "");
          onChange("businessName", cleaned);
        }}
        error={errors.businessName}
        isRequired
      />

      <FormSelect
        label="Business Category"
        options={businessCategoryOptions}
        placeholder={categoriesLoading ? "Loading categories..." : "Search or select a category"}
        value={data.businessCategory}
        onChange={(e) => {
          const value = e.target.value;
          onChange("businessCategory", value);
          // Clear other category field if not "other"
          if (value !== "other") {
            onChange("businessCategoryCustom", "");
          }
        }}
        error={errors.businessCategory}
        isRequired
        searchable
        searchPlaceholder="Search categories..."
        disabled={categoriesLoading}
      />

      {/* Show custom input when "Other" is selected */}
      {data.businessCategory === "other" && (
        <FormInput
          label="Please specify your business category"
          placeholder="Enter your business category"
          value={data.businessCategoryCustom || ""}
          onChange={(e) => {
            const cleaned = (e.target.value || "").replace(/[^A-Za-z\s&\-]/g, "");
            onChange("businessCategoryCustom", cleaned);
          }}
          error={errors.businessCategoryCustom}
          isRequired
        />
      )}

      {/* Sub-category field removed as per latest requirements */}

      <FormInput
        label="Established Year"
        placeholder="Enter Established year"
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={data.establishedYear}
        onChange={(e) => {
          const digits = (e.target.value || "").replace(/\D/g, "").slice(0, 4);
          onChange("establishedYear", digits);
        }}
        error={errors.establishedYear}
      />

      <FormInput
        label="Headquarters Location"
        placeholder="Enter Headquarters Location"
        value={data.headquartersLocation}
        pattern="[A-Za-z\s]*"
        onChange={(e) => {
          const cleaned = (e.target.value || "").replace(/[^A-Za-z ,]/g, "");
          onChange("headquartersLocation", cleaned);
        }}
        error={errors.headquartersLocation}
      />

      <FormInput
        label="Designation"
        placeholder="Enter Designation"
        value={data.contactRole}
        onChange={(e) => {
          // Allow letters, spaces, and common punctuation for Designation
          const cleaned = (e.target.value || "").replace(/[^A-Za-z\s\-.,'/&()]/g, "");
          onChange("contactRole", cleaned);
        }}
        error={errors.contactRole}
      />

      <FormSelect
        label="Company Size"
        options={companySizeOptions}
        placeholder="Select Company Size"
        value={data.companySize}
        onChange={(e) => onChange("companySize", e.target.value)}
        error={errors.companySize}
      />

      {/* <FormSelect
        label="Work Preference"
        options={workPreferenceOptions}
        placeholder="Select Work Preference"
        value={data.workPreference}
        onChange={(e) => onChange("workPreference", e.target.value)}
        error={errors.workPreference}
      /> */}

      <FormInput
        label="GST Number"
        placeholder="Enter GST Number"
        value={data.gstNumber}
        maxLength={15}
        onChange={(e) => {
          const cleaned = e.target.value
            .replace(/[^A-Za-z0-9]/g, "")
            .toUpperCase()
            .slice(0, 15);
          onChange("gstNumber", cleaned);
        }}
        error={errors.gstNumber}
      />

      <FormInput
        label="Business Registration Number"
        placeholder="Enter Business Registration Number"
        value={data.businessRegistrationNumber}
        maxLength={30}
        onChange={(e) => {
          const cleaned = e.target.value
            .replace(/[^A-Za-z0-9]/g, "")
            .toUpperCase()
            .slice(0, 30);
          onChange("businessRegistrationNumber", cleaned);
        }}
        error={errors.businessRegistrationNumber}
      />

      <FormInput
        label="PAN Number"
        placeholder="Enter PAN Number"
        value={data.panNumber}
        maxLength={10}
        onChange={(e) => {
          const cleaned = e.target.value
            .replace(/[^A-Za-z0-9]/g, "")
            .toUpperCase()
            .slice(0, 10);
          onChange("panNumber", cleaned);
        }}
        error={errors.panNumber}
      />

      <div className="md:col-span-2 lg:col-span-3">
        <FormTextarea
          label="Business Description"
          placeholder="Enter Business Description (max 4000 characters)"
          value={data.shortDescription}
          onChange={(e) => {
            const value = e.target.value;
            if (value.length <= 4000) {
              onChange("shortDescription", value);
            }
          }}
          onBlur={() => {
            if (data.shortDescription && data.shortDescription.length > 4000) {
              onChange("shortDescription", data.shortDescription.slice(0, 4000));
            }
          }}
          error={errors.shortDescription || (data.shortDescription && data.shortDescription.length > 4000 ? "Short description cannot exceed 4000 characters" : "")}
          rows={4}
          maxLength={4000}
        />
        <div className="mt-1 text-xs text-gray-400 text-right">
          {data.shortDescription?.length || 0}/4000 characters
        </div>
      </div>
    </div>
  );
};

export default BusinessStep;
