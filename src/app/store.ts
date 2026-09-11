import { configureStore } from "@reduxjs/toolkit";
import type { TypedUseSelectorHook } from "react-redux";
import { useDispatch, useSelector } from "react-redux";
import { authApi } from "../services/authApi.ts";
import { p2pApi } from "../services/p2pApi";
import { publicApi } from "../services/publicApi";
import { connectionsApi } from "../services/connectionsApi";
import { searchApi } from "../services/searchApi";
import { opportunityApi } from "../services/opportunityApi";
import { eventsApi } from "../services/eventsApi";
import { meetingsApi } from "../services/meetingsApi";
import { visitorsApi } from "../services/visitorsApi";
import { testimonialsApi } from "../services/testimonialsApi";
import { chaptersApi } from "../services/chaptersApi";
import { dashboardApi } from "../services/dashboardApi";
import { m2oApi } from "../services/m2oApi";
import { notificationsApi } from "../services/notificationsApi";
import authReducer from "../features/auth/authSlice";

// Add reducers here as you build modules, e.g.:
// import authReducer from "../features/auth/authSlice";
import { feedApi } from "../services/feedApi.ts";
import { adminGeoApi } from "../services/superadmin/adminGeoApi";
import { adminFiltersApi } from "../services/superadmin/adminFiltersApi.ts";
import { adminSaDashboardApi } from "../services/superadmin/adminSaDashboardApi";
import { adminFranchiseApi } from "../services/superadmin/adminFranchiseApi";
import { adminSocialApi } from "../services/superadmin/adminSocialApi";
import { adminTeamApi } from "../services/superadmin/adminTeamApi";
// Executive Director APIs
import { edDashboardApi } from "../services/ed/edDashboardApi";
import { edRegionalApi } from "../services/ed/edRegionalApi";
import { edChaptersApi } from "../services/ed/edChaptersApi";
import { edSponsorsApi } from "../services/ed/edSponsorsApi";
import { edMeetingsApi } from "../services/ed/edMeetingsApi";
import { edPalmsApi } from "../services/ed/edPalmsApi";
import { edP2PApi } from "../services/ed/edP2PApi";
import { edOpportunityApi } from "../services/ed/edOpportunityApi";
import { edVisitorsApi } from "../services/ed/edVisitorsApi";
import { edEventsApi } from "../services/ed/edEventsApi";
import { edM2OApi } from "../services/ed/edM2OApi";
import { edTeamApi } from "../services/ed/edTeamApi";
import { edRolesApi } from "../services/ed/edRolesApi";
import { edReportsApi } from "../services/ed/edReportsApi";
import { edUsersApi } from "../services/ed/edUsersApi";
import { edPTeamApi } from "../services/ed/edPTeamApi";
import { professionalSidebarApi } from "../services/professional/professionalSidebarApi";
import { professionalFeedApi } from "../services/professional/professionalFeedApi";
import { professionalConnectionsApi } from "../services/professional/professionalConnectionsApi";
import { rightSidebarApi } from "../services/professional/rightSidebarApi";
import { professionalMessagesApi } from "../services/professional/professionalMessagesApi";
import { memberApi } from "../services/memberApi";
import { saEventsApi } from "../services/admin/saEventsApi";
// Social Admin APIs
import { socialDashboardApi } from "../services/social/dashboardApi";
import { socialRegionalBoardApi } from "../services/social/regionalBoardApi";
import { socialRegionalTeamApi } from "../services/social/regionalTeamApi";
import { socialChaptersApi } from "../services/social/chaptersApi";
import { socialEventsApi } from "../services/social/eventsApi";
import { socialTeamApi } from "../services/social/teamApi";
import { socialVolunteersApi } from "../services/social/volunteersApi";
import { socialDonationsApi } from "../services/social/donationsApi";
import { socialUserEventsApi } from "../services/social/userEventsApi";
import { socialUserConnectionsApi } from "../services/social/userConnectionsApi";
import { socialUserChaptersApi } from "../services/social/userChaptersApi";
import { socialMessagesApi } from "../services/social/socialMessagesApi";
import { groupsApi } from "../services/groupsApi";
import { edGroupsApi } from "../services/edGroupsApi";
import { categoriesApi } from "../services/categoriesApi";
import { approvalsApi } from "../services/approvalsApi";
import { moduleAccessApi } from "../services/moduleAccessApi";
import { adminModuleAccessApi } from "../services/adminModuleAccessApi";
import { userRolesApi } from "../services/userRolesApi";
import { pushApi } from "../services/pushApi";
import { moderationApi } from "../services/moderationApi";

export const store = configureStore({
  reducer: {
    // auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [p2pApi.reducerPath]: p2pApi.reducer,
    [publicApi.reducerPath]: publicApi.reducer,
    [connectionsApi.reducerPath]: connectionsApi.reducer,
    [searchApi.reducerPath]: searchApi.reducer,
    [opportunityApi.reducerPath]: opportunityApi.reducer,
    [eventsApi.reducerPath]: eventsApi.reducer,
    [meetingsApi.reducerPath]: meetingsApi.reducer,
    [visitorsApi.reducerPath]: visitorsApi.reducer,
    [chaptersApi.reducerPath]: chaptersApi.reducer,
    [testimonialsApi.reducerPath]: testimonialsApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [m2oApi.reducerPath]: m2oApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    auth: authReducer,
    [feedApi.reducerPath]: feedApi.reducer,
    [adminGeoApi.reducerPath]: adminGeoApi.reducer,
    [adminFiltersApi.reducerPath]: adminFiltersApi.reducer,
    [adminSaDashboardApi.reducerPath]: adminSaDashboardApi.reducer,
    [adminFranchiseApi.reducerPath]: adminFranchiseApi.reducer,
    [adminSocialApi.reducerPath]: adminSocialApi.reducer,
    [adminTeamApi.reducerPath]: adminTeamApi.reducer,
    // Executive Director reducers
    [edDashboardApi.reducerPath]: edDashboardApi.reducer,
    [edRegionalApi.reducerPath]: edRegionalApi.reducer,
    [edChaptersApi.reducerPath]: edChaptersApi.reducer,
    [edSponsorsApi.reducerPath]: edSponsorsApi.reducer,
    [edMeetingsApi.reducerPath]: edMeetingsApi.reducer,
    [edPalmsApi.reducerPath]: edPalmsApi.reducer,
    [edP2PApi.reducerPath]: edP2PApi.reducer,
    [edOpportunityApi.reducerPath]: edOpportunityApi.reducer,
    [edVisitorsApi.reducerPath]: edVisitorsApi.reducer,
    [edEventsApi.reducerPath]: edEventsApi.reducer,
    [edM2OApi.reducerPath]: edM2OApi.reducer,
    [edTeamApi.reducerPath]: edTeamApi.reducer,
    [edRolesApi.reducerPath]: edRolesApi.reducer,
    [edReportsApi.reducerPath]: edReportsApi.reducer,
    [edUsersApi.reducerPath]: edUsersApi.reducer,
    [edPTeamApi.reducerPath]: edPTeamApi.reducer,
    [professionalSidebarApi.reducerPath]: professionalSidebarApi.reducer,
    [professionalFeedApi.reducerPath]: professionalFeedApi.reducer,
    [professionalConnectionsApi.reducerPath]: professionalConnectionsApi.reducer,
    [rightSidebarApi.reducerPath]: rightSidebarApi.reducer,
    [professionalMessagesApi.reducerPath]: professionalMessagesApi.reducer,
    [memberApi.reducerPath]: memberApi.reducer,
    [saEventsApi.reducerPath]: saEventsApi.reducer,
    // Social Admin reducers
    [socialDashboardApi.reducerPath]: socialDashboardApi.reducer,
    [socialRegionalBoardApi.reducerPath]: socialRegionalBoardApi.reducer,
    [socialRegionalTeamApi.reducerPath]: socialRegionalTeamApi.reducer,
    [socialChaptersApi.reducerPath]: socialChaptersApi.reducer,
    [socialEventsApi.reducerPath]: socialEventsApi.reducer,
    [socialTeamApi.reducerPath]: socialTeamApi.reducer,
    [socialVolunteersApi.reducerPath]: socialVolunteersApi.reducer,
    [socialDonationsApi.reducerPath]: socialDonationsApi.reducer,

    // Social user events reducer
    [socialUserEventsApi.reducerPath]: socialUserEventsApi.reducer,
    // Social user connections reducer
    [socialUserConnectionsApi.reducerPath]: socialUserConnectionsApi.reducer,
    // Social user chapters reducer
    [socialUserChaptersApi.reducerPath]: socialUserChaptersApi.reducer,
    // Social messages reducer
    [socialMessagesApi.reducerPath]: socialMessagesApi.reducer,
    // Groups reducer
    [groupsApi.reducerPath]: groupsApi.reducer,
    // ED Groups reducer
    [edGroupsApi.reducerPath]: edGroupsApi.reducer,
    // Categories reducer
    [categoriesApi.reducerPath]: categoriesApi.reducer,
    // Approvals reducer
    [approvalsApi.reducerPath]: approvalsApi.reducer,
    // Module Access reducer
    [moduleAccessApi.reducerPath]: moduleAccessApi.reducer,
    // Admin Module Access reducer
    [adminModuleAccessApi.reducerPath]: adminModuleAccessApi.reducer,
    // User Roles reducer
    [userRolesApi.reducerPath]: userRolesApi.reducer,
    [pushApi.reducerPath]: pushApi.reducer,
    [moderationApi.reducerPath]: moderationApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable immutable state checking in development for better performance
      // This is only a development warning and won't affect production
      immutableCheck: false,
      serializableCheck: true,
    }).concat(
      authApi.middleware,
      p2pApi.middleware,
      publicApi.middleware,
      connectionsApi.middleware,
      searchApi.middleware,
      opportunityApi.middleware,
      eventsApi.middleware,
      meetingsApi.middleware,
      feedApi.middleware,
      visitorsApi.middleware,
      chaptersApi.middleware,
      testimonialsApi.middleware,
      dashboardApi.middleware,
      m2oApi.middleware,
      notificationsApi.middleware,
      adminGeoApi.middleware,
      adminFiltersApi.middleware,
      adminSaDashboardApi.middleware,
      adminFranchiseApi.middleware,
      adminSocialApi.middleware,
      adminTeamApi.middleware,
      // Executive Director middleware
      edDashboardApi.middleware,
      edRegionalApi.middleware,
      edChaptersApi.middleware,
      edSponsorsApi.middleware,
      edMeetingsApi.middleware,
      edPalmsApi.middleware,
      edP2PApi.middleware,
      edOpportunityApi.middleware,
      edVisitorsApi.middleware,
      edEventsApi.middleware,
      edM2OApi.middleware,
      edTeamApi.middleware,
      edRolesApi.middleware,
      edReportsApi.middleware,
      edUsersApi.middleware,
      edPTeamApi.middleware,
      professionalSidebarApi.middleware,
      professionalFeedApi.middleware,
      professionalConnectionsApi.middleware,
      rightSidebarApi.middleware,
      professionalMessagesApi.middleware,
      memberApi.middleware,
      saEventsApi.middleware,
      // Social Admin middleware
      socialDashboardApi.middleware,
      socialRegionalBoardApi.middleware,
      socialRegionalTeamApi.middleware,
      socialChaptersApi.middleware,
      socialEventsApi.middleware,
      socialTeamApi.middleware,
      socialVolunteersApi.middleware,
      socialDonationsApi.middleware,
      // Social user events middleware
      socialUserEventsApi.middleware,
      // Social user connections middleware
      socialUserConnectionsApi.middleware,
      // Social user chapters middleware
      socialUserChaptersApi.middleware,
      // Social messages middleware
      socialMessagesApi.middleware,
      // Groups middleware
      groupsApi.middleware,
      // ED Groups middleware
      edGroupsApi.middleware,
      // Categories middleware
      categoriesApi.middleware,
      // Approvals middleware
      approvalsApi.middleware,
      // Module Access middleware
      moduleAccessApi.middleware,
      // Admin Module Access middleware
      adminModuleAccessApi.middleware,
      // User Roles middleware
      userRolesApi.middleware,
      pushApi.middleware,
      moderationApi.middleware,
    ),
});

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
