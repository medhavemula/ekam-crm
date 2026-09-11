// Utility functions for dynamic category handling
// These functions work with API data instead of hardcoded arrays

/**
 * Normalizes work preference values to display text
 * Example: 'full_time' -> 'Full Time'
 */
export function normalizeWorkPreference(value: string): string {
  if (!value) return '';
  
  // If it's already in the options, return the label
  const found = workPreferenceOptions.find(opt => opt.value === value);
  if (found) return found.label;
  
  // Otherwise, normalize the value (replace underscores with spaces and capitalize)
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalizes a category string from kebab-case/snake_case to Title Case
 * Example: 'web-app-developer' -> 'Web App Developer'
 */
function normalizeCategoryLabel(str: string): string {
  if (!str) return '';
  
  return str
    .split(/[-_]/) // Split by hyphen or underscore
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export type CategoryOption = { value: string; label: string; type?: string };

// Helper function to transform API response to category options
export function transformApiCategories(apiData: any[]): CategoryOption[] {
  if (!Array.isArray(apiData)) return [];
  
  return apiData.map((item: any) => ({
    value: item.value || item.id,
    label: item.label || item.name,
    type: item.type
  }));
}

// Helper function to get label by value from dynamic categories
export function getCategoryLabel(categories: CategoryOption[], categoryValue: string): string {
  if (!categoryValue) return '';
  
  const found = categories.find(opt => opt.value === categoryValue);
  if (found) return found.label;
  
  // If not found in categories, try to normalize the value
  return normalizeCategoryLabel(categoryValue);
}

// Legacy exports for backward compatibility (to be removed after migration)
export const businessCategoryOptions: CategoryOption[] = [];
export const professionalCategoryOptions: CategoryOption[] = [];
export const socialCategoryOptions: CategoryOption[] = [];

export type BusinessCategory = string;
export type ProfessionalCategory = string;
export type SocialCategory = string;

// Legacy functions - now use dynamic data
export function getBusinessCategoryLabel(category: string): string {
  return category; // Will be updated to use API data
}

export function getProfessionalCategoryLabel(category: string): string {
  return category; // Will be updated to use API data
}

export function getSocialCategoryLabel(category: string): string {
  return normalizeCategoryLabel(category);
}

// Common options that can still be hardcoded (non-category specific)
export const companySizeOptions = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501+", label: "501+ employees" },
];

export const workPreferenceOptions = [
  { label: "Full Time", value: "full_time" },
  { label: "Part Time", value: "part_time" },
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "On-Site", value: "onsite" },
  { label: "Contract", value: "contract" },
  { label: "Freelance", value: "freelance" },
  { label: "Temporary", value: "temporary" },
  { label: "Seasonal", value: "seasonal" },
  { label: "Consulting", value: "consulting" },
];
