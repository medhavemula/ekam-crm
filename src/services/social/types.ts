// ============ Scope Types ============
export type SocialScopeResponse = {
  success: boolean;
  data: {
    allowedCountryIds: string[];
    allowedRegionIds: string[];
    allowedSocialChapterIds: string[];
  };
};

// ============ Dashboard Types ============
export type SocialDashboardOverviewParams = {
  from?: string;
  to?: string;
  countryId: string; // Required - get from user.assignments[].scope.country
  regionId?: string;
  socialChapterId?: string;
};

export type SocialDashboardOverviewResponse = {
  success: boolean;
  data: {
    chapters: number;
    members: number;
    regionalMembers: number;
    noOfEvents: number;
    totalFundsDonated: number;
    totalFundsRaised: number;
    ongoingEvents: number;
    upcomingEvents: number;
    volunteers: number;
    pendingApprovals: number;
  };
};

export type SocialDashboardChartsParams = {
  from?: string;
  to?: string;
  countryId: string;
  regionId?: string;
  socialChapterId?: string;
  granularity?: "month" | "week";
};

export type SocialDashboardChartsResponse = {
  success: boolean;
  data: {
    membersGrowth: Array<{ period: string; count: number }>;
    eventsGrowth: Array<{ period: string; count: number }>;
    fundsDonated: Array<{ period: string; amount: number; currency: string }>;
    fundsRaised: Array<{ period: string; amount: number; currency: string }>;
  };
};

// ============ Activities Types (Admin) ============
export type SocialActivitiesOverviewParams = {
  from?: string;
  to?: string;
  countryId?: string;
  regionId?: string;
  socialChapterId?: string;
  eventType?: "" | "DONATION" | "FUNDRAISER" | "MEETING" | "OTHER";
};

export type SocialActivitiesKpis = {
  noOfEvents: number;
  noOfAttendedEvents: number;
  totalFundsDonated: number;
  totalFundsRaised: number;
  totalMembers: number;
  totalMemberServed: number;
  totalVolunteers: number;
  ongoingEvents: number;
  upcomingEvents: number;
};

export type SocialActivitiesCharts = {
  totalMember: Array<{ month: string; count: number }>;
  totalFundsDonated: Array<{ month: string; total: number }>;
  totalFundsRaised: Array<{ month: string; total: number }>;
};

export type SocialActivitiesOverviewResponse = {
  success: boolean;
  data: {
    kpis: SocialActivitiesKpis;
    charts: SocialActivitiesCharts;
    window: { from: string; to: string };
  };
};

// ============ All Activities Types (User-facing /social/dashboard/overview) ============
export type SocialAllActivitiesOverviewParams = {
  from?: string;
  to?: string;
  eventType?: "" | "DONATION" | "FUNDRAISER" | "MEETING" | "OTHER";
};

export type SocialAllActivitiesKpis = {
  noOfEvents: number;
  noOfAttendedEvents: number;
  totalFundsDonated: number;
  totalFundsRaised: number;
  totalMembers: number;
  ongoingEvents: number;
  upcomingEvents: number;
};

export type SocialAllActivitiesCharts = {
  totalMember: Array<{ month: string; count: number }>;
  totalAttendees: Array<{ month: string; total: number }>;
  totalFundsDonated: Array<{ month: string; total: number }>;
  totalFundsRaised: Array<{ month: string; total: number }>;
};

export type SocialAllActivitiesOverviewResponse = {
  success: boolean;
  data: {
    kpis: SocialAllActivitiesKpis;
    charts: SocialAllActivitiesCharts;
    window: { from: string; to: string };
  };
};

// ============ Regional Board Types ============
export type SocialRegionalBoardParams = {
  q?: string;
  area?: string;
  chapter?: string;
  page?: number;
  limit?: number;
};

export type SocialChapterItem = {
  id: string;
  name: string;
  area: string;
  regionId?: string;
  regionName?: string;
  members: number;
  pendingApprovals: number;
};

export type SocialRegionalBoardResponse = {
  success: boolean;
  data: {
    items: SocialChapterItem[];
    page: number;
    limit: number;
    total: number;
  };
};

// ============ Chapter Types ============
export type CreateSocialChapterParams = {
  name: string;
  // Optional: omitted when the client cannot determine it, in which case the
  // server falls back to the region the caller already has in scope.
  regionId?: string;
  area?: string;
  city?: string;
};

export type SocialChapterOverviewResponse = {
  success: boolean;
  data: {
    chapter: {
      id: string;
      name: string;
      area: string;
      regionName: string | null;
    };
    event: {
      date: string;
      mode: string;
      venue: string | null;
    } | null;
    members: { total: number };
    executiveTeam?: { total: number };
    kpis: {
      noOfEvents: number;
      totalFundsRaised: number;
      ongoingEvents: number;
      upcomingEvents: number;
      pendingApprovals: number;
    };
  };
};

export type SocialChapterMembersParams = {
  socialChapterId: string;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type SocialChapterMember = {
  name: string;
  email: string;
  phone: string;
};

export type SocialChapterMembersResponse = {
  success: boolean;
  data: {
    items: SocialChapterMember[];
    page: number;
    limit: number;
    total: number;
  };
};

export type SocialEventMembersParams = {
  eventId: string;
  name?: string;
  area?: string;
  chapter?: string;
  page?: number;
  limit?: number;
};

export type SocialEventMember = {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  chapter?: string;
  chapterName?: string;
  area?: string;
  avatarUrl?: string;
};

export type SocialEventMembersResponse = {
  success: boolean;
  data: {
    items: SocialEventMember[];
    page: number;
    limit: number;
    total: number;
  };
};

export type SocialEventVolunteersParams = {
  eventId: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type SocialEventVolunteer = {
  id: string;
  name: string;
  attendance?: string;
  phone?: string;
  chapterName?: string;
  noOfVoluntary?: number;
  fundsDonated?: number;
  area?: string;
};

export type SocialEventVolunteersResponse = {
  success: boolean;
  data: {
    items: SocialEventVolunteer[];
    page: number;
    limit: number;
    total: number;
  };
};

// ============ Events Types ============
export type SocialEventsListParams = {
  from?: string;
  to?: string;
  q?: string;
  eventType?: string;
  tab?: "all" | "mine" | "upcoming" | "requests";
  socialChapterId?: string;
  approvalStatus?: string;
  page?: number;
  limit?: number;
};

export type SocialEventItem = {
  id: string;
  title: string;
  badge: string;
  startsAt: string;
  imageUrl: string | null;
  description: string;
  location: string;
  chapterId?: string;
  chapterName?: string;
  countryId?: string;
  regionId?: string;
  status: string;
  approvalStatus?: string;
  joinedCount?: number;
  isCreatedByMe?: boolean;
  isJoined?: boolean;
  endsAt?: string;
};

export type SocialEventsListResponse = {
  success: boolean;
  data: {
    kpis: {
      noOfEvents: number;
      noOfAttendedEvents: number;
      totalFundsDonated: number;
      totalFundsRaised: number;
    };
    page: number;
    limit: number;
    total: number;
    items: SocialEventItem[];
  };
};

export type CreateSocialEventParams = {
  title: string;
  description?: string;
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  tz?: string;
  socialChapterId: string;
  countryId?: string;
  regionId?: string;
  eventType?: string;
  category?: string;
  categoryLabel?: string;
  imageUrl?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  costForMembers?: number;
  maxAttendees?: number;
  link?: string;
  mode?: "IN_PERSON" | "ONLINE" | "HYBRID";
};

export type UpdateSocialEventParams = {
  id: string;
  title?: string;
  description?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  tz?: string;
  countryId?: string;
  regionId?: string;
  eventType?: string;
  category?: string;
  categoryLabel?: string;
  imageUrl?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  costForMembers?: number;
  maxAttendees?: number;
  link?: string;
  mode?: "IN_PERSON" | "ONLINE" | "HYBRID";
};

export type ApproveRejectEventParams = {
  id: string;
  remark?: string;
};

// ============ Team Types ============
export type SocialTeamUsersParams = {
  name?: string;
  roleId?: string;
  socialChapterId?: string;
  page?: number;
  limit?: number;
};

export type SocialTeamUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  roleId?: string;
  status: string;
  socialChapterId?: string;
};

export type SocialTeamUsersResponse = {
  success: boolean;
  data: {
    items: SocialTeamUser[];
    page: number;
    limit: number;
    total: number;
  };
};

export type CreateSocialTeamUserParams = {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  roleId: string;
  socialChapterId?: string;
};

export type UpdateSocialTeamUserParams = {
  id: string;
  roleId?: string;
  status?: string;
  socialChapterId?: string;
};

export type SocialTeamRolesParams = {
  search?: string;
  page?: number;
  limit?: number;
};

export type SocialTeamRole = {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
};

export type SocialTeamRolesResponse = {
  success: boolean;
  data: {
    items: SocialTeamRole[];
    page: number;
    limit: number;
    total: number;
  };
};

export type CreateSocialTeamRoleParams = {
  name: string;
  description?: string;
  permissions?: string[];
};

export type UpdateSocialTeamRoleParams = {
  id: string;
  name?: string;
  description?: string;
  permissions?: string[];
};

// ============ Regional Team Types (Social Admin) ============
export type SocialRegionalTeamListParams = {
  name?: string;
  role_code?: string;
  social_chapter_id?: string;
  status?: "ACTIVE" | "BLOCKED" | "ENDED";
  page?: number;
  limit?: number;
};

export type SocialRegionalTeamMember = {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarInitial: string;
  } | null;
  role: {
    code: string;
    label: string;
  };
  scope: "REGION" | "CHAPTER";
  region: {
    id: string;
    name: string;
  } | null;
  chapter: {
    id: string;
    name: string;
  } | null;
  chapters?: Array<{
    id: string;
    name: string;
    assignment_id?: string;
  }>;
  area?: string;
  status: "ACTIVE" | "BLOCKED" | "ENDED";
  start_date?: string;
  end_date?: string;
  assignment_ids?: string[];
};

export type SocialRegionalTeamListResponse = {
  success: boolean;
  data: {
    items: SocialRegionalTeamMember[];
    page?: number;
    limit?: number;
    total?: number;
  };
};

export type CreateSocialRegionalTeamMemberParams = {
  user_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role_code: string;
  scope: "REGION" | "CHAPTER";
  region_id?: string;
  socialChapterId?: string;
  social_chapter_id?: string;
  social_chapter_ids?: string[];
  area?: string;
  start_date?: string;
};

export type UpdateSocialRegionalTeamMemberParams = {
  id: string;
  role_code?: string;
  socialChapterId?: string;
  social_chapter_id?: string;
  social_chapter_ids?: string[];
  area?: string;
  status?: "ACTIVE" | "BLOCKED" | "ENDED";
  end_date?: string;
};

export type SocialRegionalTeamRole = {
  code: string;
  scope: "REGION" | "CHAPTER";
  display_name: string;
};

export type SocialRegionalTeamRolesResponse = {
  success: boolean;
  data: {
    roles: SocialRegionalTeamRole[];
  };
};

export type SocialRegionalTeamAssignableUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  phoneCountryCode?: string;
  region: {
    id: string;
    name: string;
  } | null;
  chapter: {
    id: string;
    name: string;
  } | null;
  avatarInitial: string;
};

export type SocialRegionalTeamUsersSearchParams = {
  q?: string;
  page?: number;
  limit?: number;
};

export type SocialRegionalTeamUsersSearchResponse = {
  success: boolean;
  data: {
    items: SocialRegionalTeamAssignableUser[];
    page: number;
    limit: number;
    total: number;
  };
};

export type SocialRegionalTeamOverviewResponse = {
  success: boolean;
  data: {
    member: {
      id: string;
      user: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        avatarInitial?: string;
      } | null;
      role: {
        code: string;
        label: string;
      };
      scope: "REGION" | "CHAPTER";
      region: {
        id: string;
        name: string;
      } | null;
      chapter: {
        id: string;
        name: string;
      } | null;
      area?: string;
      status: "ACTIVE" | "BLOCKED" | "ENDED";
      start_date?: string;
      end_date?: string;
    };
    cards: {
      chapters: number;
      regionalMembers: number;
      readyToLaunchChapters: number;
      totalMembers: number;
      events: number;
      fundsRaised?: number;
      chapterName?: string | null;
    };
  };
};

// ============ Volunteers Types ============

export type SocialVolunteersParams = {
  countryId: string;
  regionId?: string;
  socialChapterId?: string;
  eventId?: string; // ✅ ADD: Filter by event
  q?: string;
  page?: number;
  limit?: number;
};

export type SocialVolunteer = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  socialChapterId?: string;
  regionId?: string;
  countryId?: string;
  eventId?: string; // ✅ ADD: Event association
  area?: string; // ✅ ADD: Area field
  referredBy?: string; // ✅ ADD: Referred by field
  createdAt?: string; // ✅ ADD: Created date
  // Populated fields from backend
  chapterName?: string;
  eventName?: string;
  eventDate?: string;
};

export type SocialVolunteersResponse = {
  success: boolean;
  data: {
    items: SocialVolunteer[];
    page: number;
    limit: number;
    total: number;
  };
};

export type CreateSocialVolunteerParams = {
  name: string;
  email?: string;
  phone?: string;
  countryId: string;
  regionId: string;
  socialChapterId: string;
  referredBy?: string; // ✅ ADD: Who referred this volunteer
  area?: string; // ✅ ADD: Area/location
  eventId?: string; // ✅ ADD: Event association
};
