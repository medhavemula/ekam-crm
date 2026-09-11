import type { VisitType, VisitStatus } from "../services/visitorsApi";

// Convert backend visit type to frontend-friendly label
export const getVisitTypeLabel = (type: VisitType | string): string => {
  switch (type) {
    case "REGISTER_SOMEONE_ELSE":
      return "Register Someone Else";
    case "REGISTER_MYSELF":
      return "Register Myself";
    default:
      return type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }
};

// Convert backend visit status to frontend-friendly label
export const getVisitStatusLabel = (status: VisitStatus | string): string => {
  switch (status) {
    case "INVITED":
      return "Invited";
    case "REGISTERED":
      return "Registered";
    case "CHECKED_IN":
      return "Checked In";
    case "FOLLOWED_UP":
      return "Followed Up";
    case "APPLIED":
      return "Applied";
    case "JOINED":
      return "Joined";
    case "NO_SHOW":
      return "No Show";
    case "NOT_A_FIT":
      return "Not a Fit";
    case "DECLINED":
      return "Declined";
    default:
      return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }
};

// For admin visitors page (which might have different type values)
export const getAdminVisitorTypeLabel = (type: string): string => {
  switch (type) {
    case "BUSINESS_VISITOR":
      return "Business Visitor";
    case "CHAPTER_VISITOR":
      return "Chapter Visitor";
    case "PERSONAL_VISITOR":
      return "Personal Visitor";
    case "REGISTER_SOMEONE_ELSE":
      return "Register Someone Else";
    case "REGISTER_MYSELF":
      return "Register Myself";
    default:
      return type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }
};
