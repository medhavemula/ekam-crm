/**
 * Dashboard Configuration by Role
 * Defines tabs, stats, and charts for each role
 */

import type { Role } from "./roles";
import { getPrimaryRole } from "./roles";

const SOCIAL_ADMIN_DASHBOARD_ROLES: Role[] = [
  "SOCIAL_CHAIRPERSON",
  "REGIONAL_GOVERNOR",
  "ASSISTANT_REGIONAL_GOVERNOR",
  "LAUNCH_GOVERNOR",
];

export interface DashboardTab {
  label: string;
  href: string;
  hasDropdown?: boolean;
  dropdownItems?: Array<{ label: string; href: string }>;
}

export interface StatConfig {
  title: string;
  key: string;
  icon?: "globe" | "users" | "briefcase" | "chapters" | "totalchapters" | "bo" | "bc" | "none";
}

export interface ChartConfig {
  title: string;
  key: string;
  color: "orange" | "purple" | "cyan";
  format?: "currency" | "number";
}

export interface DashboardConfig {
  tabs: DashboardTab[];
  showFilters: {
    dateRange: boolean;
    countries: boolean;
    regions: boolean;
    chapters: boolean;
    timeRange: boolean;
  };
  stats: StatConfig[];
  charts: ChartConfig[];
}

/**
 * Dashboard configurations for each role
 */
export const DASHBOARD_CONFIGS: Record<Role, DashboardConfig> = {
  // Social Chairperson Dashboard (Social Admin layout: 8 KPIs + 3 charts)
  SOCIAL_CHAIRPERSON: {
    tabs: [
      { label: "Dashboard", href: "/social/admin/dashboard" },
      { label: "Regional Board", href: "/social/admin/regional-board" },
      { label: "Regional Team", href: "/social/admin/regional-team" },
      { label: "Team & Role", href: "/social/admin/team-role" },
      { label: "Social", href: "/social/admin/all-activities" },
    ],
    showFilters: {
      dateRange: true,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Chapters", key: "chapters", icon: "none" },
      { title: "Members", key: "members", icon: "users" },
      { title: "Regional Members", key: "regionalMembers", icon: "users" },
      { title: "No of Events", key: "noOfEvents", icon: "none" },
      { title: "Total funds donated", key: "totalFundsDonated", icon: "none" },
      { title: "No of Voluntary", key: "volunteers", icon: "users" },
      { title: "On going events", key: "ongoingEvents", icon: "none" },
      { title: "Events", key: "upcomingEvents", icon: "none" },
    ],
    charts: [
      { title: "Total Chapter members", key: "totalMember", color: "orange", format: "number" },
      { title: "No of Events", key: "noOfEvents", color: "purple", format: "number" },
      { title: "Total funds donated", key: "totalFundsDonated", color: "cyan", format: "currency" },
    ],
  },

  // Social Regional Governor Dashboard (same layout as Social Chairperson)
  REGIONAL_GOVERNOR: {
    tabs: [
      { label: "Dashboard", href: "/social/admin/dashboard" },
      { label: "Regional Board", href: "/social/admin/regional-board" },
      { label: "Regional Team", href: "/social/admin/regional-team" },
      { label: "Team & Role", href: "/social/admin/team-role" },
      { label: "Social", href: "/social/admin/all-activities" },
    ],
    showFilters: {
      dateRange: true,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Chapters", key: "chapters", icon: "none" },
      { title: "Members", key: "members", icon: "users" },
      { title: "Regional Members", key: "regionalMembers", icon: "users" },
      { title: "No of Events", key: "noOfEvents", icon: "none" },
      { title: "Total funds donated", key: "totalFundsDonated", icon: "none" },
      { title: "No of Voluntary", key: "volunteers", icon: "users" },
      { title: "On going events", key: "ongoingEvents", icon: "none" },
      { title: "Events", key: "upcomingEvents", icon: "none" },
    ],
    charts: [
      { title: "Total Chapter members", key: "totalMember", color: "orange", format: "number" },
      { title: "No of Events", key: "noOfEvents", color: "purple", format: "number" },
      { title: "Total funds donated", key: "totalFundsDonated", color: "cyan", format: "currency" },
    ],
  },

  // Assistant Social Regional Governor Dashboard (same layout as Social Chairperson)
  ASSISTANT_REGIONAL_GOVERNOR: {
    tabs: [
      { label: "Dashboard", href: "/social/admin/dashboard" },
      { label: "Regional Board", href: "/social/admin/regional-board" },
      { label: "Regional Team", href: "/social/admin/regional-team" },
      { label: "Team & Role", href: "/social/admin/team-role" },
      { label: "Social", href: "/social/admin/all-activities" },
    ],
    showFilters: {
      dateRange: true,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Chapters", key: "chapters", icon: "none" },
      { title: "Members", key: "members", icon: "users" },
      { title: "Regional Members", key: "regionalMembers", icon: "users" },
      { title: "No of Events", key: "noOfEvents", icon: "none" },
      { title: "Total funds donated", key: "totalFundsDonated", icon: "none" },
      { title: "No of Voluntary", key: "volunteers", icon: "users" },
      { title: "On going events", key: "ongoingEvents", icon: "none" },
      { title: "Events", key: "upcomingEvents", icon: "none" },
    ],
    charts: [
      { title: "Total Chapter members", key: "totalMember", color: "orange", format: "number" },
      { title: "No of Events", key: "noOfEvents", color: "purple", format: "number" },
      { title: "Total funds donated", key: "totalFundsDonated", color: "cyan", format: "currency" },
    ],
  },

  // Launch Governor Dashboard (same social admin layout for now)
  LAUNCH_GOVERNOR: {
    tabs: [
      { label: "Dashboard", href: "/social/admin/dashboard" },
      { label: "Regional Board", href: "/social/admin/regional-board" },
      { label: "Regional Team", href: "/social/admin/regional-team" },
      { label: "Team & Role", href: "/social/admin/team-role" },
      { label: "Social", href: "/social/admin/all-activities" },
    ],
    showFilters: {
      dateRange: true,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Chapters", key: "chapters", icon: "none" },
      { title: "Members", key: "members", icon: "users" },
      { title: "Regional Members", key: "regionalMembers", icon: "users" },
      { title: "No of Events", key: "noOfEvents", icon: "none" },
      { title: "Total funds donated", key: "totalFundsDonated", icon: "none" },
      { title: "No of Voluntary", key: "volunteers", icon: "users" },
      { title: "On going events", key: "ongoingEvents", icon: "none" },
      { title: "Events", key: "upcomingEvents", icon: "none" },
    ],
    charts: [
      { title: "Total Chapter members", key: "totalMember", color: "orange", format: "number" },
      { title: "No of Events", key: "noOfEvents", color: "purple", format: "number" },
      { title: "Total funds donated", key: "totalFundsDonated", color: "cyan", format: "currency" },
    ],
  },

  SUPER_ADMIN: {
    tabs: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Franchise Partner", href: "/admin/franchise" },
      { label: "Social Partner", href: "/admin/social" },
      // Registrations with no ED to review them arrive here (WEB-AUTH-06).
      { label: "Approvals", href: "/admin/approvals" },
      { label: "Team & Role", href: "/admin/team" },
      { label: "Countries", href: "/admin/countries" },
      { label: "Regions", href: "/admin/regions" },
    ],
    showFilters: {
      dateRange: true,
      countries: true,
      regions: true,
      chapters: true,
      timeRange: true,
    },
    stats: [
      { title: "No of Countries", key: "countries", icon: "globe" },
      { title: "No of Regions", key: "regions", icon: "globe" },
      { title: "Chapters", key: "chapters", icon: "chapters" },
      { title: "Total Chapter Members", key: "totalMembers", icon: "totalchapters" },
      { title: "Business Opportunity", key: "businessOpportunity", icon: "bo" },
      { title: "Business Closed", key: "businessClosed", icon: "bc" },
    ],
    charts: [
      { title: "Chapters Growth", key: "chaptersGrowth", color: "orange", format: "number" },
      { title: "Business Opportunity", key: "businessOpportunity", color: "purple", format: "number" },
      { title: "Business Closed", key: "businessClosed", color: "cyan", format: "currency" },
    ],
  },

  SUPER_ADMIN_TEAM: {
    tabs: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Franchise Partner", href: "/admin/franchise" },
      { label: "Social Partner", href: "/admin/social" },
      { label: "Countries", href: "/admin/countries" },
      { label: "Regions", href: "/admin/regions" },
    ],
    showFilters: {
      dateRange: true,
      countries: true,
      regions: true,
      chapters: true,
      timeRange: true,
    },
    stats: [
      { title: "No of Countries", key: "countries", icon: "globe" },
      { title: "No of Regions", key: "regions", icon: "globe" },
      { title: "Chapters", key: "chapters", icon: "chapters" },
      { title: "Total Chapter Members", key: "totalMembers", icon: "totalchapters" },
      { title: "Business Opportunity", key: "businessOpportunity", icon: "bo" },
      { title: "Business Closed", key: "businessClosed", icon: "bc" },
    ],
    charts: [
      { title: "Chapters Growth", key: "chaptersGrowth", color: "orange", format: "number" },
      { title: "Business Opportunity", key: "businessOpportunity", color: "purple", format: "number" },
      { title: "Business Closed", key: "businessClosed", color: "cyan", format: "currency" },
    ],
  },

  // ED Team Dashboard (Same as Executive Director)
  ED_TEAM: {
    tabs: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Regional Board", href: "/admin/regional-board" },
      { label: "Regional Team", href: "/admin/regional-team" },
      {
        label: "Business",
        href: "/business",
        hasDropdown: true,
        dropdownItems: [
                    { label: "P2P", href: "/admin/business/p2p" },
          { label: "Business Opportunity", href: "/admin/business-opportunity" },
          { label: "Meetings", href: "/admin/meetings" },
          { label: "Many to One", href: "/admin/many-to-one" },
          { label: "Visitors", href: "/admin/visitors" },
          { label: "Events", href: "/admin/business/events" },
        ],
      },
      { label: "Professional", href: "/admin/professionals" },
      { label: "Content Reports", href: "/admin/content-reports" },
      // { label: "Groups", href: "/admin/groups" },
    ],
    showFilters: {
      dateRange: true,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Chapters", key: "chapters", icon: "chapters" },
      { title: "Business Members", key: "members", icon: "totalchapters" },
      { title: "Professional Members", key: "professionalMembers", icon: "users" },
      { title: "Blocked Members", key: "blockedMembers", icon: "users" },
      { title: "Regional Members", key: "regionalMembers", icon: "totalchapters" },
      { title: "Business Opportunity", key: "businessOpportunity", icon: "bo" },
      { title: "Business Closed", key: "businessClosed", icon: "bc" },
      { title: "Ready to launch chapters", key: "readyToLaunch", icon: "chapters" },
    ],
    charts: [
      { title: "Chapter Growth", key: "memberGrowth", color: "orange", format: "number" },
      { title: "Business Opportunities", key: "businessOpportunities", color: "purple", format: "number" },
      { title: "Business Closed", key: "businessClosed", color: "cyan", format: "currency" },
    ],
  },

  // Executive Director Dashboard (Image 1)
  EXECUTIVE_DIRECTOR: {
    tabs: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Regional Board", href: "/admin/regional-board" },
      { label: "Regional Team", href: "/admin/regional-team" },
      { label: "Team & Role", href: "/admin/team" },
      {
        label: "Business",
        href: "/business",
        hasDropdown: true,
        dropdownItems: [
                    { label: "P2P", href: "/admin/business/p2p" },
          { label: "Business Opportunity", href: "/admin/business-opportunity" },
          { label: "Meetings", href: "/admin/meetings" },
          { label: "Many to One", href: "/admin/many-to-one" },
          { label: "Visitors", href: "/admin/visitors" },
          { label: "Events", href: "/admin/business/events" },
        ],
      },
      { label: "Professional", href: "/admin/professionals" },
      { label: "Content Reports", href: "/admin/content-reports" },
      { label: "Groups", href: "/admin/groups" },
    ],
    showFilters: {
      dateRange: true,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Chapters", key: "chapters", icon: "chapters" },
      { title: "Business Members", key: "members", icon: "totalchapters" },
      { title: "Professional Members", key: "professionalMembers", icon: "users" },
      { title: "Blocked Members", key: "blockedMembers", icon: "users" },
      { title: "Regional Members", key: "regionalMembers", icon: "totalchapters" },
      { title: "Business Opportunity", key: "businessOpportunity", icon: "bo" },
      { title: "Business Closed", key: "businessClosed", icon: "bc" },
      { title: "Ready to launch chapters", key: "readyToLaunch", icon: "chapters" },
    ],
    charts: [
      { title: "Chapter Growth", key: "memberGrowth", color: "orange", format: "number" },
      { title: "Business Opportunities", key: "businessOpportunities", color: "purple", format: "number" },
      { title: "Business Closed", key: "businessClosed", color: "cyan", format: "currency" },
    ],
  },

  // Regional Director Dashboard (Image 2)
  REGIONAL_DIRECTOR: {
    tabs: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Regional Board", href: "/admin/regional-board" },
      { label: "Regional Team", href: "/admin/regional-team" },
      {
        label: "Business",
        href: "/business",
        hasDropdown: true,
        dropdownItems: [
                    { label: "P2P", href: "/admin/business/p2p" },
          { label: "Business Opportunity", href: "/admin/business-opportunity" },
          { label: "Meetings", href: "/admin/meetings" },
          { label: "Many to One", href: "/admin/many-to-one" },
          { label: "Visitors", href: "/admin/visitors" },
          { label: "Events", href: "/admin/business/events" },
        ],
      },
      { label: "Professional", href: "/admin/professionals" },
      { label: "Content Reports", href: "/admin/content-reports" },
      { label: "Groups", href: "/admin/groups" },
    ],
    showFilters: {
      dateRange: true,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Chapters", key: "chapters", icon: "chapters" },
      { title: "Business Members", key: "members", icon: "totalchapters" },
      { title: "Professional Members", key: "professionalMembers", icon: "users" },
      { title: "Blocked Members", key: "blockedMembers", icon: "users" },
      { title: "Regional Members", key: "regionalMembers", icon: "totalchapters" },
      { title: "Business Opportunity", key: "businessOpportunity", icon: "bo" },
      { title: "Business Closed", key: "businessClosed", icon: "bc" },
      { title: "Ready to launch chapters", key: "readyToLaunch", icon: "chapters" },
    ],
    charts: [
      { title: "Chapter Growth", key: "memberGrowth", color: "orange", format: "number" },
      { title: "Business Opportunities", key: "businessOpportunities", color: "purple", format: "number" },
      { title: "Business Closed", key: "businessClosed", color: "cyan", format: "currency" },
    ],
  },

  // Assistant Regional Director Dashboard (Image 3)
  ASSISTANT_REGIONAL_DIRECTOR: {
    tabs: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Regional Board", href: "/admin/regional-board" },
      {
        label: "Business",
        href: "/business",
        hasDropdown: true,
        dropdownItems: [
                    { label: "P2P", href: "/admin/business/p2p" },
          { label: "Business Opportunity", href: "/admin/business-opportunity" },
          { label: "Meetings", href: "/admin/meetings" },
          { label: "Many to One", href: "/admin/many-to-one" },
          { label: "Visitors", href: "/admin/visitors" },
          { label: "Events", href: "/admin/business/events" },
        ],
      },
      { label: "Professional", href: "/admin/professionals" },
      { label: "Content Reports", href: "/admin/content-reports" },
      { label: "Groups", href: "/admin/groups" },
    ],
    showFilters: {
      dateRange: true,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Chapters", key: "chapters", icon: "chapters" },
      { title: "Business Members", key: "members", icon: "totalchapters" },
      { title: "Professional Members", key: "professionalMembers", icon: "users" },
      { title: "Blocked Members", key: "blockedMembers", icon: "users" },
      { title: "Regional Members", key: "regionalMembers", icon: "totalchapters" },
      { title: "Business Opportunity", key: "businessOpportunity", icon: "bo" },
      { title: "Business Closed", key: "businessClosed", icon: "bc" },
      { title: "Ready to launch chapters", key: "readyToLaunch", icon: "chapters" },
    ],
    charts: [
      { title: "Chapter Growth", key: "memberGrowth", color: "orange", format: "number" },
      { title: "Business Opportunities", key: "businessOpportunities", color: "purple", format: "number" },
      { title: "Business Closed", key: "businessClosed", color: "cyan", format: "currency" },
    ],
  },

  // Launch Director Dashboard (Image 2)
  LAUNCH_DIRECTOR: {
    tabs: [
      { label: "Dashboard", href: "/dashboard" },
      {
        label: "Business",
        href: "/business",
        hasDropdown: true,
        dropdownItems: [
          { label: "P2P", href: "/business/p2p" },
          { label: "Business Opportunity Received (BOR)", href: "/business/opportunity-received" },
          { label: "Business Opportunity Given (BOG)", href: "/business/opportunity-given" },
          { label: "Business Closed", href: "/business/business-received" },
          { label: "Meetings", href: "/business/meetings" },
          { label: "Many to One", href: "/business/many-to-one" },
          { label: "Connections", href: "/business/connections" },
          { label: "Visitors", href: "/business/visitors" },
          { label: "Testimonials", href: "/business/testimonials" },
          { label: "Events", href: "/business/upcoming-events" },
          { label: "My Feed", href: "/business/my-feed" },
        ],
      },
      { label: "Professional", href: "/professional/feed" },
      { label: "Social", href: "/social/all-activities" },
      { label: "Groups", href: "/groups" },
      { label: "Regional Access", href: "/admin/regional-access" },
    ],
    showFilters: {
      dateRange: false,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Business Opportunity Received", key: "businessOpportunityReceived", icon: "none" },
      { title: "Business Opportunity Given", key: "businessOpportunityGiven", icon: "none" },
      { title: "Visitors", key: "visitors", icon: "users" },
      { title: "P2P", key: "p2p", icon: "users" },
    ],
    charts: [
      { title: "Revenue Received To My Business", key: "revenueReceived", color: "orange", format: "currency" },
      { title: "Business Closed", key: "businessClosed", color: "purple", format: "currency" },
      { title: "Business Opportunity Received", key: "receivedOpportunity", color: "cyan", format: "currency" },
    ],
  },

  // Chapter Director Dashboard (Image 3)
  CHAPTER_DIRECTOR: {
    tabs: [
      { label: "Dashboard", href: "/dashboard" },
      {
        label: "Business",
        href: "/business",
        hasDropdown: true,
        dropdownItems: [
          { label: "P2P", href: "/business/p2p" },
          { label: "Business Opportunity Received (BOR)", href: "/business/opportunity-received" },
          { label: "Business Opportunity Given (BOG)", href: "/business/opportunity-given" },
          { label: "Business Closed", href: "/business/business-received" },
          { label: "Meetings", href: "/business/meetings" },
          { label: "Many to One", href: "/business/many-to-one" },
          { label: "Connections", href: "/business/connections" },
          { label: "Visitors", href: "/business/visitors" },
          { label: "Testimonials", href: "/business/testimonials" },
          { label: "Events", href: "/business/upcoming-events" },
          { label: "My Feed", href: "/business/my-feed" },
        ],
      },
      { label: "Professional", href: "/professional/feed" },
      { label: "Social", href: "/social/all-activities" },
      { label: "Groups", href: "/groups" },
      { label: "Regional Access", href: "/admin/regional-access" },
    ],
    showFilters: {
      dateRange: false,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Business Opportunity Received", key: "businessOpportunityReceived", icon: "none" },
      { title: "Business Opportunity Given", key: "businessOpportunityGiven", icon: "none" },
      { title: "Visitors", key: "visitors", icon: "users" },
      { title: "P2P", key: "p2p", icon: "users" },
    ],
    charts: [
      { title: "Revenue Received To My Business", key: "revenueReceived", color: "orange", format: "currency" },
      { title: "Business Closed", key: "businessClosed", color: "purple", format: "currency" },
      { title: "Business Opportunity Received", key: "receivedOpportunity", color: "cyan", format: "currency" },
    ],
  },

  // Support Director Dashboard (Image 4)
  SUPPORT_DIRECTOR: {
    tabs: [
      { label: "Dashboard", href: "/dashboard" },
      {
        label: "Business",
        href: "/business",
        hasDropdown: true,
        dropdownItems: [
          { label: "P2P", href: "/business/p2p" },
          { label: "Business Opportunity Received (BOR)", href: "/business/opportunity-received" },
          { label: "Business Opportunity Given (BOG)", href: "/business/opportunity-given" },
          { label: "Business Closed", href: "/business/business-received" },
          { label: "Meetings", href: "/business/meetings" },
          { label: "Many to One", href: "/business/many-to-one" },
          { label: "Connections", href: "/business/connections" },
          { label: "Visitors", href: "/business/visitors" },
          { label: "Testimonials", href: "/business/testimonials" },
          { label: "Events", href: "/business/upcoming-events" },
          { label: "My Feed", href: "/business/my-feed" },
        ],
      },
      { label: "Professional", href: "/professional/feed" },
      { label: "Social", href: "/social/all-activities" },
      { label: "Groups", href: "/groups" },
      { label: "Regional Access", href: "/admin/regional-access" },
    ],
    showFilters: {
      dateRange: false,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Business Opportunity Received", key: "businessOpportunityReceived", icon: "none" },
      { title: "Business Opportunity Given", key: "businessOpportunityGiven", icon: "none" },
      { title: "Visitors", key: "visitors", icon: "users" },
      { title: "P2P", key: "p2p", icon: "users" },
    ],
    charts: [
      { title: "Revenue Received To My Business", key: "revenueReceived", color: "orange", format: "currency" },
      { title: "Business Closed", key: "businessClosed", color: "purple", format: "currency" },
      { title: "Business Opportunity Received", key: "receivedOpportunity", color: "cyan", format: "currency" },
    ],
  },

  // President Dashboard (Image 1)
  PRESIDENT: {
    tabs: [
      { label: "Dashboard", href: "/dashboard" },
      {
        label: "Business",
        href: "/business",
        hasDropdown: true,
        dropdownItems: [
          { label: "P2P", href: "/business/p2p" },
          { label: "Business Opportunity Received (BOR)", href: "/business/opportunity-received" },
          { label: "Business Opportunity Given (BOG)", href: "/business/opportunity-given" },
          { label: "Business Closed", href: "/business/business-received" },
          { label: "Meetings", href: "/business/meetings" },
          { label: "Many to One", href: "/business/many-to-one" },
          { label: "Connections", href: "/business/connections" },
          { label: "Visitors", href: "/business/visitors" },
          { label: "Testimonials", href: "/business/testimonials" },
          { label: "Events", href: "/business/upcoming-events" },
          { label: "My Feed", href: "/business/my-feed" },
        ],
      },
      { label: "Professional", href: "/professional/feed" },
      { label: "Social", href: "/social/all-activities" },
      { label: "Groups", href: "/groups" },
      // { label: "Regional Access", href: "/admin/regional-access" },
    ],
    showFilters: {
      dateRange: false,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Business Opportunity Received", key: "businessOpportunityReceived", icon: "none" },
      { title: "Business Opportunity Given", key: "businessOpportunityGiven", icon: "none" },
      { title: "Visitors", key: "visitors", icon: "users" },
      { title: "P2P", key: "p2p", icon: "users" },
    ],
    charts: [
      { title: "Revenue Received To My Business", key: "revenueReceived", color: "orange", format: "currency" },
      { title: "Business Closed", key: "businessClosed", color: "purple", format: "currency" },
      { title: "Business Opportunity Received", key: "receivedOpportunity", color: "cyan", format: "currency" },
    ],
  },

  // Vice President Dashboard (Image 1)
  VICE_PRESIDENT: {
    tabs: [
      { label: "Dashboard", href: "/dashboard" },
      {
        label: "Business",
        href: "/business",
        hasDropdown: true,
        dropdownItems: [
          { label: "P2P", href: "/business/p2p" },
          { label: "Business Opportunity Received (BOR)", href: "/business/opportunity-received" },
          { label: "Business Opportunity Given (BOG)", href: "/business/opportunity-given" },
          { label: "Business Closed", href: "/business/business-received" },
          { label: "Meetings", href: "/business/meetings" },
          { label: "Many to One", href: "/business/many-to-one" },
          { label: "Connections", href: "/business/connections" },
          { label: "Visitors", href: "/business/visitors" },
          { label: "Testimonials", href: "/business/testimonials" },
          { label: "Events", href: "/business/upcoming-events" },
          { label: "My Feed", href: "/business/my-feed" },
        ],
      },
      { label: "Professional", href: "/professional/feed" },
      { label: "Social", href: "/social/all-activities" },
      { label: "Groups", href: "/groups" },
      // { label: "Regional Access", href: "/admin/regional-access" },
    ],
    showFilters: {
      dateRange: false,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Business Opportunity Received", key: "businessOpportunityReceived", icon: "none" },
      { title: "Business Opportunity Given", key: "businessOpportunityGiven", icon: "none" },
      { title: "Visitors", key: "visitors", icon: "users" },
      { title: "P2P", key: "p2p", icon: "users" },
    ],
    charts: [
      { title: "Revenue Received To My Business", key: "revenueReceived", color: "orange", format: "currency" },
      { title: "Business Closed", key: "businessClosed", color: "purple", format: "currency" },
      { title: "Business Opportunity Received", key: "receivedOpportunity", color: "cyan", format: "currency" },
    ],
  },

  // Regular User Dashboard (existing dashboard)
  USER: {
    tabs: [
      { label: "Dashboard", href: "/dashboard" },
      {
        label: "Business",
        href: "/business",
        hasDropdown: true,
        dropdownItems: [
          { label: "P2P", href: "/business/p2p" },
          { label: "Business Opportunity Received (BOR)", href: "/business/opportunity-received" },
          { label: "Business Opportunity Given (BOG)", href: "/business/opportunity-given" },
          { label: "Business Closed", href: "/business/business-received" },
          { label: "Meetings", href: "/business/meetings" },
          { label: "Many to One", href: "/business/many-to-one" },
          { label: "Connections", href: "/business/connections" },
          { label: "Visitors", href: "/business/visitors" },
          { label: "Testimonials", href: "/business/testimonials" },
          { label: "Events", href: "/business/upcoming-events" },
          { label: "My Feed", href: "/business/my-feed" },
        ],
      },
      { label: "Professional", href: "/professional/feed" },
      { label: "Social", href: "/social/all-activities" },
      { label: "Groups", href: "/groups" },
    ],
    showFilters: {
      dateRange: false,
      countries: false,
      regions: false,
      chapters: false,
      timeRange: true,
    },
    stats: [
      { title: "Business Opportunity Received", key: "businessOpportunityReceived", icon: "users" },
      { title: "Business Opportunity Given", key: "businessOpportunityGiven", icon: "users" },
      { title: "Visitors", key: "visitors", icon: "users" },
      { title: "P2P", key: "p2p", icon: "users" },
    ],
    charts: [
      { title: "Revenue Received To My Business", key: "revenueReceived", color: "orange", format: "currency" },
      { title: "Business Closed", key: "businessClosed", color: "purple", format: "currency" },
      { title: "Business Opportunity Received", key: "receivedOpportunity", color: "cyan", format: "number" },
    ],
  },
};

/**
 * Get dashboard configuration for a role
 */
export function getDashboardConfig(role: Role): DashboardConfig {
  return DASHBOARD_CONFIGS[role] || DASHBOARD_CONFIGS.USER;
}

export function getDashboardConfigForRoles(
  roles: Array<Role | string | null | undefined>,
  fallbackRole: Role = "USER",
): DashboardConfig {
  const validRoles = roles.filter(Boolean) as string[];
  const socialRole = SOCIAL_ADMIN_DASHBOARD_ROLES.find((role) => validRoles.includes(role));
  if (socialRole) {
    return getDashboardConfig(socialRole);
  }

  if (!validRoles.length) {
    return getDashboardConfig(fallbackRole);
  }

  return getDashboardConfig(getPrimaryRole(validRoles));
}
