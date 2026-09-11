/**
 * Common types for Executive Director (ED) API services
 */

// Base response types
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  request_id?: string;
};

export type ApiError = {
  success: false;
  message: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
  request_id?: string;
};

// Common query parameters
export type DateRangeParams = {
  startDate?: string; // ISO format: YYYY-MM-DDTHH:mm:ss
  endDate?: string; // ISO format: YYYY-MM-DDTHH:mm:ss
  // Backward compatibility
  from?: string; // Deprecated: use startDate instead
  to?: string; // Deprecated: use endDate instead
};

export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type EdFilterParams = DateRangeParams &
  PaginationParams & {
    regionId?: string;
    chapterId?: string;
    q?: string; // search query
  };

// Scope and access control
export type EdScope = {
  allowedRegionIds?: string[];
  allowedChapterIds?: string[];
};

// Common entity types
export type Region = {
  id: string;
  name: string;
  code?: string;
  countryId?: string;
  countryName?: string;
  status?: "ACTIVE" | "INACTIVE" | "BLOCKED";
  chaptersCount?: number;
  membersCount?: number;
};

export type Chapter = {
  id: string;
  name: string;
  code?: string;
  regionId: string;
  regionName?: string;
  location?: string;
  area?: string;
  city?: string;
  status?: "ACTIVE" | "INACTIVE" | "BLOCKED";
  membersCount?: number;
  renewalDate?: string;
  expiryDate?: string;
};

export type TeamMember = {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  roleCode: string;
  roleName?: string;
  scope: "COUNTRY" | "REGION" | "CHAPTER";
  countryId?: string;
  regionId?: string;
  chapterId?: string;
  status: "ACTIVE" | "BLOCKED" | "INACTIVE";
  startDate?: string;
  endDate?: string;
  isPrimary?: boolean;
};

export type Role = {
  code: string;
  name: string;
  description?: string;
  scope: "COUNTRY" | "REGION" | "CHAPTER";
  permissions?: string[];
};

// Paginated response wrapper
export type PaginatedResponse<T> = {
  success: boolean;
  data: {
    items: T[];
    page: number;
    limit: number;
    total: number;
  };
  request_id?: string;
};
