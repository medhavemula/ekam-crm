import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, useEffect } from "react";
import { lazyPage, ArrivalScreen, RouteLoadingOverlay } from "./routing/lazyPage";
import { useAppDispatch, useAppSelector } from "./app/store";
import { authApi } from "./services/authApi";
import { setUser, setRole } from "./features/auth/authSlice";
import type { ReactElement } from "react";
import ResetPassword from "./pages/auth/ResetPassword";
import type { Role } from "./config/roles";
import { getPrimaryRole } from "./config/roles";
import { PushNotificationsProvider } from "./components/push/PushNotificationsProvider";

/**
 * Roles refused the chat screen outright.
 *
 * Not a permission they could be granted, so the screen says only that the page
 * is closed to them and offers no way to request it. Empty this list to open it
 * again.
 */
const CHAT_LOCKED_FOR = ["SUPER_ADMIN", "SUPER_ADMIN_TEAM"] as const;

// Lazy load components to catch errors better
const Login = lazyPage(() => import("./pages/auth/Login"));
const Register = lazyPage(() => import("./pages/auth/Register"));
const BusinessRegister = lazyPage(() => import("./pages/auth/BusinessRegister"));
const ProfessionalRegister = lazyPage(() => import("./pages/auth/ProfessionalRegister"));
const SocialRegister = lazyPage(() => import("./pages/auth/SocialRegister"));
const VerifyOtp = lazyPage(() => import("./pages/auth/VerifyOtp"));
const RegistrationSuccessPage = lazyPage(() => import("./pages/auth/RegistrationSuccessPage"));
const ForgotPassword = lazyPage(() => import("./pages/auth/ForgotPassword"));
const ResendCredentials = lazyPage(() => import("./pages/auth/ResendCredentials"));
const VerificationSuccess = lazyPage(() => import("./pages/auth/VerificationSuccess"));
const ChangePassword = lazyPage(() => import("./pages/auth/ChangePassword"));
const PasswordChanged = lazyPage(() => import("./pages/auth/PasswordChanged"));
const PTeamInviteTest = lazyPage(() => import("./pages/auth/PTeamInviteTest"));
const PTeamVerifyPage = lazyPage(() => import("./pages/auth/PTeamVerifyPage"));
const Dashboard = lazyPage(() => import("./pages/Dashboard"));
const P2PPage = lazyPage(() => import("./pages/business/P2PPage"));
const AddP2PPage = lazyPage(() => import("./pages/business/AddP2PPage"));
const EditP2PPage = lazyPage(() => import("./pages/business/EditP2PPage"));
const BusinessOpportunityGivenPage = lazyPage(() => import("./pages/business/BusinessOpportunityGivenPage"));
const AddBusinessOpportunityGivenPage = lazyPage(() => import("./pages/business/AddBusinessOpportunityGivenPage"));
const BusinessOpportunityReceivedPage = lazyPage(() => import("./pages/business/BusinessOpportunityReceivedPage"));
const EditBusinessOpportunityReceivedPage = lazyPage(() => import("./pages/business/EditBusinessOpportunityReceivedPage"));
const UpcomingEventsPage = lazyPage(() => import("./pages/business/UpcomingEventsPage"));
const EventDetailsPage = lazyPage(() => import("./pages/business/EventDetailsPage"));
const MeetingsPage = lazyPage(() => import("./pages/business/MeetingsPage"));
const MeetingDetailsPage = lazyPage(() => import("./pages/business/MeetingDetailsPage"));
const VisitorsPage = lazyPage(() => import("./pages/business/VisitorsPage"));
const AddVisitorPage = lazyPage(() => import("./pages/business/AddVisitorPage"));
const EditVisitorPage = lazyPage(() => import("./pages/business/EditVisitorPage"));
const ManyToOnePage = lazyPage(() => import("./pages/business/ManyToOnePage"));
const AddManyToOnePage = lazyPage(() => import("./pages/business/AddManyToOnePage"));
const EditManyToOnePage = lazyPage(() => import("./pages/business/EditManyToOnePage"));
const ManyToOneDetailsPage = lazyPage(() => import("./pages/business/ManyToOneDetailsPage"));
const BusinessClosedPage = lazyPage(() => import("./pages/business/business-closed/BusinessClosedPage"));
const AddBusinessClosedPage = lazyPage(() => import("./pages/business/business-closed/AddBusinessClosedPage"));
const ProfilePage = lazyPage(() => import("./pages/ProfilePage"));
const BlockedMembersSelfPage = lazyPage(() => import("./pages/BlockedMembersPage"));
const UpdateProfilePage = lazyPage(() => import("./pages/UpdateProfilePage"));
const EdProfilePage = lazyPage(() => import("./pages/ed/EdProfilePage"));
const CategoriesPage = lazyPage(() => import("./pages/CategoriesPage"));
const PersonalPALMSReportPage = lazyPage(() => import("./pages/reports/PersonalPALMSReportPage"));
const PALMSSummaryReportPage = lazyPage(() => import("./pages/reports/PALMSSummaryReportPage"));
const ReceivedBusinessOpportunityReportPage = lazyPage(
  () => import("./pages/reports/ReceivedBusinessOpportunityReportPage"),
);
const VisitorRegistrationReportPage = lazyPage(() => import("./pages/reports/VisitorRegistrationReportPage"));
const AdminInductedByReportPage = lazyPage(() => import("./pages/reports/AdminInductedByReportPage"));
const UserInductedByReportPage = lazyPage(() => import("./pages/reports/UserInductedByReportPage"));
const PALMSAttendanceReportPage = lazyPage(() => import("./pages/reports/PALMSAttendanceReportPage"));
const YourWeeklyReportPage = lazyPage(() => import("./pages/reports/YourWeeklyReportPage"));
const PersonalManyToOneReportPage = lazyPage(() => import("./pages/reports/PersonalManyToOneReportPage"));
const TestimonialsPage = lazyPage(() => import("./pages/business/TestimonialsPage"));
const MyFeedPage = lazyPage(() => import("./pages/business/MyFeedPage"));
const ConnectionsPage = lazyPage(() => import("./pages/business/ConnectionsPage"));
const AddConnectionPage = lazyPage(() => import("./pages/business/AddConnectionPage"));
const SearchPage = lazyPage(() => import("./pages/search/SearchPage"));
const ViewProfilePage = lazyPage(() => import("./pages/ViewProfilePage"));
const AdminViewMemberProfilePage = lazyPage(() => import("./pages/admin/ViewMemberProfilePage"));
const EditMemberRouter = lazyPage(() => import("./pages/admin/EditMemberRouter"));
const RegisterMemberPage = lazyPage(() => import("./pages/admin/RegisterMemberPage"));
const NotificationsPage = lazyPage(() => import("./pages/NotificationsPage"));
const FranchisePartnerPage = lazyPage(() => import("./pages/admin/super-admin/FranchisePartnerPage"));
const FranchisePartnerDetailPage = lazyPage(() => import("./pages/admin/super-admin/FranchisePartnerDetailPage"));
const SocialPartnerPage = lazyPage(() => import("./pages/admin/super-admin/SocialPartnerPage"));
const SocialPartnerDetailPage = lazyPage(() => import("./pages/admin/super-admin/SocialPartnerDetailPage"));
const SocialPartnerChaptersPage = lazyPage(() => import("./pages/admin/super-admin/SocialPartnerChaptersPage"));
const CreateExecutivePartnerPage = lazyPage(() => import("./pages/admin/shared/CreateExecutivePartnerPage"));
const EditExecutivePartnerPage = lazyPage(() => import("./pages/admin/super-admin/EditExecutivePartnerPage"));
const CreateSocialPartnerPage = lazyPage(() => import("./pages/admin/super-admin/CreateSocialPartnerPage"));
const EditSocialPartnerPage = lazyPage(() => import("./pages/admin/super-admin/EditSocialPartnerPage"));
const TeamRolePage = lazyPage(() => import("./pages/admin/super-admin/TeamRolePage"));
const CreateMemberPage = lazyPage(() => import("./pages/admin/super-admin/CreateMemberPage"));
const EditMemberPage = lazyPage(() => import("./pages/admin/super-admin/EditMemberPage"));
const EventsPage = lazyPage(() => import("./pages/admin/super-admin/EventsPage"));
const CreateEventPage = lazyPage(() => import("./pages/admin/super-admin/CreateEventPage"));
const EventDetailPage = lazyPage(() => import("./pages/admin/super-admin/EventDetailPage"));
const CountriesPage = lazyPage(() => import("./pages/admin/super-admin/CountriesPage"));
const RegionsPage = lazyPage(() => import("./pages/admin/super-admin/RegionsPage"));
const RegionalBoardPage = lazyPage(() => import("./pages/admin/shared/RegionalBoardPage"));
const MovedAway = lazyPage(() => import("./pages/admin/shared/ChapterChangePage"));
const ExtendMemberPage = lazyPage(() => import("./pages/admin/shared/ExtendMemberPage"));
const ChaptersPage = lazyPage(() => import("./pages/admin/shared/ChaptersPage"));
// Lazy loaded components
const RegionalTeamPage = lazyPage(() => import("./pages/admin/shared/RegionalTeamPage"));
const TeamMemberDetailPage = lazyPage(() => import("./pages/admin/shared/TeamMemberDetailPage"));
const ManageRolesPage = lazyPage(() => import("./pages/admin/super-admin/ManageRolesPage"));
const ManageVolunteersPage = lazyPage(() => import("./pages/social/ManageVolunteersPage"));
const SocialAdminDashboard = lazyPage(() => import("./pages/social/admin/SocialAdminDashboard"));
const SocialAdminProfilePage = lazyPage(() => import("./pages/social/admin/SocialAdminProfilePage"));
const SocialAdminRegionalBoard = lazyPage(() => import("./pages/social/admin/SocialAdminRegionalBoard"));
const SocialAdminChapterDetailsPage = lazyPage(() => import("./pages/social/admin/SocialAdminChapterDetailsPage"));
const SocialAdminMembersPage = lazyPage(() => import("./pages/social/admin/SocialAdminMembersPage"));
const SocialMemberViewPage = lazyPage(() => import("./pages/social/admin/SocialMemberViewPage"));
const SocialEditMemberPage = lazyPage(() => import("./pages/social/admin/SocialEditMemberPage"));
const SocialMoveChapterPage = lazyPage(() => import("./pages/social/admin/SocialMoveChapterPage"));
const SocialAdminInvitePage = lazyPage(() => import("./pages/social/admin/SocialAdminInvitePage"));
const SocialAdminCreateChapterPage = lazyPage(() => import("./pages/social/admin/SocialAdminCreateChapterPage"));
const SocialAdminAllActivities = lazyPage(() => import("./pages/social/admin/SocialAdminAllActivities"));
const SocialAdminAllEvents = lazyPage(() => import("./pages/social/admin/SocialAdminAllEvents"));
const SocialAdminMyEvents = lazyPage(() => import("./pages/social/admin/SocialAdminMyEvents"));
const SocialAdminEventsRequest = lazyPage(() => import("./pages/social/admin/SocialAdminEventsRequest"));
const SocialAdminUpcomingEvents = lazyPage(() => import("./pages/social/admin/SocialAdminUpcomingEvents"));
const SocialAdminEventMembersPage = lazyPage(() => import("./pages/social/admin/SocialAdminEventMembersPage"));
const SocialAdminAddEvent = lazyPage(() => import("./pages/social/admin/SocialAdminAddEvent"));
const SocialAdminEditEvent = lazyPage(() => import("./pages/social/admin/SocialAdminEditEvent"));
const SocialAdminEventDetailPage = lazyPage(() => import("./pages/social/admin/SocialAdminEventDetailPage"));
const BlockedMembersPage = lazyPage(() => import("./pages/admin/blocked-members/BlockedMembersPage"));
const ContentReportsPage = lazyPage(() => import("./pages/admin/ContentReportsPage"));
const SocialAdminRegionalTeam = lazyPage(() => import("./pages/social/admin/SocialAdminRegionalTeam"));
const SocialAdminRegionalTeamMemberPage = lazyPage(
  () => import("./pages/social/admin/SocialAdminRegionalTeamMemberPage"),
);
const SocialAdminTeamRole = lazyPage(() => import("./pages/social/admin/SocialAdminTeamRole"));
const SocialAdminLeadershipTeamPage = lazyPage(() => import("./pages/social/admin/SocialAdminLeadershipTeamPage"));
const SocialAdminLeadershipTeamMemberPage = lazyPage(() => import("./pages/social/admin/SocialAdminLeadershipTeamMemberPage"));
const SocialAdminManageRolesPage = lazyPage(() => import("./pages/social/admin/SocialAdminManageRolesPage"));
const DeleteAccountPage = lazyPage(() => import("./pages/account/DeleteAccountPage"));
const ProfessionalPage = lazyPage(() => import("./pages/admin/shared/ProfessionalPage"));
const AdminMeetingDetailPage = lazyPage(() => import("./pages/admin/shared/EDMeetingPALMSPage"));
const EDM20Page = lazyPage(() => import("./pages/admin/shared/EDM20Page"));
const CreateRegionalTeamPage = lazyPage(() => import("./pages/admin/shared/CreateExecutivePartnerPage"));

// Franchise Partner specific pages
const FranchiseChaptersPage = lazyPage(() => import("./pages/admin/super-admin/FranchiseChaptersPage"));
const FranchiseRegionalMembersPage = lazyPage(() => import("./pages/admin/super-admin/FranchiseRegionalMembersPage"));
const CreateRegionalMemberPage = lazyPage(() => import("./pages/admin/super-admin/CreateRegionalMemberPage"));
const FranchiseMembersListPage = lazyPage(() => import("./pages/admin/super-admin/FranchiseMembersListPage"));
const FranchiseReadyToLaunchChaptersPage = lazyPage(() => import("./pages/admin/super-admin/FranchiseReadyToLaunchChaptersPage"));
const FranchiseBusinessOpportunityPage = lazyPage(() => import("./pages/admin/super-admin/FranchiseBusinessOpportunityPage"));
const FranchiseBusinessClosedPage = lazyPage(() => import("./pages/admin/super-admin/FranchiseBusinessClosedPage"));

// Regular imports
import MembersPage from "./pages/admin/shared/MembersPage";
import AdminMeetingsPage from "./pages/admin/shared/MeetingsPage";
import CreateChapterPage from "./pages/admin/shared/CreateChapterPage";
import EditChapterPage from "./pages/admin/shared/EditChapterPage";
import ChapterDetailsPage from "./pages/admin/shared/ChapterDetailsPage";
import LeadershipTeamPage from "./pages/admin/shared/LeadershipTeamPage";
import AdminVisitorsPage from "./pages/admin/shared/VisitorsPage";
import AdminEditVisitorPage from "./pages/admin/shared/AdminEditVisitorPage";
import AdminManyToOnePage from "./pages/admin/shared/ManyToOnePage";
import AdminPALMSAttendancePage from "./pages/admin/shared/PALMSAttendancePage";
import AdminBusinessOpportunityPage from "./pages/admin/shared/BusinessOpportunityPage";
import AdminP2PPage from "./pages/admin/shared/P2PPage";
import BusinessOpportunityPage from "./pages/admin/shared/BusinessOpportunityPage";
import ProfessionalFeed from "./pages/professional/ProfessionalFeed";
import ProfessionalPostPage from "./pages/professional/ProfessionalPostPage";
import ProfessionalConnections from "./pages/professional/ProfessionalConnections";
import ProfessionalBusinessProfile from "./pages/professional/ProfessionalBusinessProfile";
import ProfessionalMessages from "./pages/professional/ProfessionalMessages";
import {
  AllActivities,
  AllEvents,
  MyEvents,
  EventsRequest,
  UpcomingEvents,
  SocialConnections,
  AddEvent,
  SocialMessages,
  SocialProfilePage,
} from "./pages/social";
import ViewEvent from "./pages/social/viewEvent";
import ViewEventPage from "./pages/social/ViewEventPage";
import AddVoluntaryPage from "./pages/social/AddVoluntaryPage";
import EditEventPage from "./pages/social/EditEventPage";
import ProfessionalProfilePage from "./pages/professional/ProfessionalProfilePage";
import { EkamFooter } from "./components/common";
import ModuleGuard from "./components/access/ModuleGuard";
import IdleWarningDialog from "./components/session/IdleWarningDialog";
import SuperAdminApprovalsPage from "./pages/admin/super-admin/SuperAdminApprovalsPage";

// Lazy load pages
const ChatPage = lazyPage(() => import("./pages/chat/ChatPage"));
const GroupsPage = lazyPage(() => import("./pages/groups/GroupsPage"));
const CreateGroupPage = lazyPage(() => import("./pages/groups/CreateGroupPage"));
const AdminGroupsLayout = lazyPage(() => import("./pages/groups/admin/AdminGroupsLayout"));
const AdminGroupDetailPage = lazyPage(() => import("./pages/groups/admin/AdminGroupDetailPage"));
const AdminCreateGroupPage = lazyPage(() => import("./pages/groups/admin/AdminCreateGroupPage"));

// Guest-only guard: redirects authenticated users to /dashboard
function GuestOnly({ children }: { children: ReactElement }) {
  const isAuthed = typeof window !== "undefined" && !!localStorage.getItem("accessToken");
  const mustChange = typeof window !== "undefined" && localStorage.getItem("mustChangePassword") === "true";
  if (isAuthed && mustChange) return <Navigate to="/change-password" replace />;
  if (isAuthed && !mustChange) return <Navigate to="/dashboard" replace />;
  return children;
}

function DeleteAccountLoginRoute() {
  const isAuthed = typeof window !== "undefined" && !!localStorage.getItem("accessToken");
  const mustChange = typeof window !== "undefined" && localStorage.getItem("mustChangePassword") === "true";
  if (isAuthed && mustChange) return <Navigate to="/change-password" replace />;
  if (isAuthed) return <Navigate to="/delete-account?step=confirm" replace />;
  return <Login />;
}

// Protected-only guard: redirects unauthenticated users to /login
function ProtectedRoute({ children }: { children: ReactElement }) {
  const isAuthed = typeof window !== "undefined" && !!localStorage.getItem("accessToken");
  const mustChange = typeof window !== "undefined" && localStorage.getItem("mustChangePassword") === "true";
  const location = useLocation();
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (mustChange && location.pathname !== "/change-password") return <Navigate to="/change-password" replace />;
  // Mounted here so idle tracking runs exactly while someone is signed in, and stops
  // the moment they are not. Activity lives in localStorage, so a route change
  // remounting this does not reset anyone's clock.
  return (
    <>
      <IdleWarningDialog />
      {children}
    </>
  );
}

// Footer that is only visible on pre-login (guest) routes
function GuestFooter() {
  const location = useLocation();
  const isAuthed = typeof window !== "undefined" && !!localStorage.getItem("accessToken");

  const guestPaths = [
    "/",
    "/login",
    "/register",
    "/business/register",
    "/professional/register",
    "/social/register",
    "/verify-otp",
    "/registration-success",
    "/verification-success",
    "/forgot-password",
    "/resend-credentials",
    "/reset-password",
    "/password-changed",
    "/pteam/verify",
    "/pteam/test",
  ];

  if (isAuthed || !guestPaths.includes(location.pathname)) {
    return null;
  }

  return <EkamFooter />;
}

export default function App() {
  // Hydrate user once on app mount if we have a token but no user in store
  const HydrateUser = () => {
    const dispatch = useAppDispatch();
    const user = useAppSelector((s) => s.auth.user);
    useEffect(() => {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (token && !user) {
        (async () => {
          try {
            const meRes = await dispatch(authApi.endpoints.usersMe.initiate()).unwrap();
            const meData = meRes?.data || {};

            // Validate status or default to "active"
            const validStatuses = ["active", "inactive", "banned"];
            const userStatus = validStatuses.includes(meData.status) ? meData.status : "active";

            // Set user data
            dispatch(
              setUser({
                _id: String(meData._id || ""),
                name: String(meData.name || ""),
                email: String(meData.email || ""),
                isEmailVerified: Boolean(meData.isEmailVerified),
                isApproved: Boolean(meData.isApproved),
                status: userStatus as "active" | "inactive" | "banned",
                assignments: Array.isArray(meData.assignments) ? meData.assignments : [],
                basicInfo: meData.basicInfo || undefined,
                business: meData.business || undefined,
                professional: meData.professional || undefined,
                moduleAccess: meData.moduleAccess || undefined,
              }),
            );

            // Only update role from localStorage during refresh, not from API
            const storedRole = localStorage.getItem("userRole");
            const storedRoles = localStorage.getItem("userRoles");

            if (storedRole && storedRoles) {
              // Use the stored role from login
              dispatch(
                setRole({
                  role: storedRole as Role,
                  roles: JSON.parse(storedRoles),
                }),
              );
            } else if (Array.isArray(meData.assignments) && meData.assignments.length) {
              // Fallback to API data only if no stored role exists (initial login case)
              const roles = meData.assignments
                .map((a: { role?: string }) => a.role)
                .filter(Boolean) as string[];
              const primaryRole = getPrimaryRole(roles);

              // Persist roles to localStorage
              localStorage.setItem("userRole", primaryRole);
              localStorage.setItem("userRoles", JSON.stringify(roles));

              dispatch(
                setRole({
                  role: primaryRole,
                  roles,
                }),
              );
            }
          } catch {
            // ignore; route guards will handle unauthenticated state
          }
        })();
      }
    }, [dispatch, user]);
    return null;
  };

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<ArrivalScreen />}>
        <PushNotificationsProvider>
          <HydrateUser />
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <Routes>
              <Route
                path="/"
                element={
                  <GuestOnly>
                    <Login />
                  </GuestOnly>
                }
              />
              <Route
                path="/login"
                element={
                  <GuestOnly>
                    <Login />
                  </GuestOnly>
                }
              />
              <Route path="/delete-account/login" element={<DeleteAccountLoginRoute />} />
              <Route
                path="/register"
                element={
                  <GuestOnly>
                    <Register />
                  </GuestOnly>
                }
              />
              <Route
                path="/business/register"
                element={
                  <GuestOnly>
                    <BusinessRegister />
                  </GuestOnly>
                }
              />
              <Route
                path="/professional/register"
                element={
                  <GuestOnly>
                    <ProfessionalRegister />
                  </GuestOnly>
                }
              />
              <Route
                path="/social/register"
                element={
                  <GuestOnly>
                    <SocialRegister />
                  </GuestOnly>
                }
              />
              <Route
                path="/verify-otp"
                element={
                  <GuestOnly>
                    <VerifyOtp />
                  </GuestOnly>
                }
              />
              <Route
                path="/registration-success"
                element={
                  <GuestOnly>
                    <RegistrationSuccessPage />
                  </GuestOnly>
                }
              />
              <Route
                path="/verification-success"
                element={
                  <GuestOnly>
                    <VerificationSuccess />
                  </GuestOnly>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <GuestOnly>
                    <ForgotPassword />
                  </GuestOnly>
                }
              />
              <Route
                path="/resend-credentials"
                element={
                  <GuestOnly>
                    <ResendCredentials />
                  </GuestOnly>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <GuestOnly>
                    <ResetPassword />
                  </GuestOnly>
                }
              />
              <Route
                path="/change-password"
                element={
                  <ProtectedRoute>
                    <ChangePassword />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/password-changed"
                element={
                  <GuestOnly>
                    <PasswordChanged />
                  </GuestOnly>
                }
              />
              {/* P-Team Welcome */}
              <Route
                path="/pteam/verify"
                element={
                  <GuestOnly>
                    <PTeamInviteTest />
                  </GuestOnly>
                }
              />

              {/* Admin Team Welcome */}
              <Route
                path="/auth/admin/team/verify"
                element={
                  <GuestOnly>
                    <PTeamInviteTest />
                  </GuestOnly>
                }
              />

              {/* Redirect old admin team verification URL */}
              <Route
                path="/admin/team/verify"
                element={
                  <GuestOnly>
                    <PTeamInviteTest />
                  </GuestOnly>
                }
              />

              {/* P-Team Password Setup */}
              <Route
                path="/pteam/set-password"
                element={
                  <GuestOnly>
                    <PTeamVerifyPage />
                  </GuestOnly>
                }
              />

              {/* Admin Team Password Setup */}
              <Route
                path="/auth/admin/team/set-password"
                element={
                  <GuestOnly>
                    <PTeamVerifyPage />
                  </GuestOnly>
                }
              />
              <Route
                path="/pteam/test"
                element={
                  <GuestOnly>
                    <PTeamInviteTest />
                  </GuestOnly>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/my-feed/chat/user/:userId"
                element={
                  <ProtectedRoute>
                    <ModuleGuard
                      moduleKey="business"
                      lockedFor={CHAT_LOCKED_FOR}
                      lockedTitle="You don't have access to Business"
                      lockedDescription="This section is not enabled for your account. Contact your administrator if you believe you should have access."
                    >
                      <ChatPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/my-feed/chat/thread/:threadId"
                element={
                  <ProtectedRoute>
                    <ModuleGuard
                      moduleKey="business"
                      lockedFor={CHAT_LOCKED_FOR}
                      lockedTitle="You don't have access to Business"
                      lockedDescription="This section is not enabled for your account. Contact your administrator if you believe you should have access."
                    >
                      <ChatPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/my-feed/chat"
                element={
                  <ProtectedRoute>
                    <ModuleGuard
                      moduleKey="business"
                      lockedFor={CHAT_LOCKED_FOR}
                      lockedTitle="You don't have access to Business"
                      lockedDescription="This section is not enabled for your account. Contact your administrator if you believe you should have access."
                    >
                      <ChatPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/franchise"
                element={
                  <ProtectedRoute>
                    <FranchisePartnerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/franchise/:id"
                element={
                  <ProtectedRoute>
                    <FranchisePartnerDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/franchise/create"
                element={
                  <ProtectedRoute>
                    <CreateExecutivePartnerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/franchise/edit/:id"
                element={
                  <ProtectedRoute>
                    <EditExecutivePartnerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/franchise/chapters"
                element={
                  <ProtectedRoute>
                    <FranchiseChaptersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/franchise/regional-members"
                element={
                  <ProtectedRoute>
                    <FranchiseRegionalMembersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/franchise/regional-members/:edId"
                element={
                  <ProtectedRoute>
                    <FranchiseRegionalMembersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/franchise/regional-members/:edId/create"
                element={
                  <ProtectedRoute>
                    <CreateRegionalMemberPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/franchise/members-list"
                element={
                  <ProtectedRoute>
                    <FranchiseMembersListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/franchise/ready-to-launch"
                element={
                  <ProtectedRoute>
                    <FranchiseReadyToLaunchChaptersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/franchise/business-opportunity"
                element={
                  <ProtectedRoute>
                    <FranchiseBusinessOpportunityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/franchise/business-closed"
                element={
                  <ProtectedRoute>
                    <FranchiseBusinessClosedPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/team"
                element={
                  <ProtectedRoute>
                    <TeamRolePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/team/create"
                element={
                  <ProtectedRoute>
                    <CreateMemberPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/team/edit/:id"
                element={
                  <ProtectedRoute>
                    <EditMemberPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/team/roles"
                element={
                  <ProtectedRoute>
                    <ManageRolesPage />
                  </ProtectedRoute>
                }
              />
              {/* Groups Routes - All group pages now use the shared layout */}
              <Route
                path="/groups/*"
                element={
                  <ProtectedRoute>
                    <GroupsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/groups/create"
                element={
                  <ProtectedRoute>
                    <CreateGroupPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/social/manage-voluntary"
                element={
                  <ProtectedRoute>
                    <ManageVolunteersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/add-volunteer"
                element={
                  <ProtectedRoute>
                    <AddVoluntaryPage />
                  </ProtectedRoute>
                }
              />
              {/* Social Admin - Leadership Team (per chapter) */}
              <Route
                path="/social/admin/regional-board/chapter/:chapterId/leadership-team"
                element={
                  <ProtectedRoute>
                    <SocialAdminLeadershipTeamPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/regional-board/chapter/:chapterId/leadership-team/member/:memberId"
                element={
                  <ProtectedRoute>
                    <SocialAdminLeadershipTeamMemberPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/events"
                element={
                  <ProtectedRoute>
                    <EventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/events/create"
                element={
                  <ProtectedRoute>
                    <CreateEventPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/events/edit/:id"
                element={
                  <ProtectedRoute>
                    <CreateEventPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/events/:id"
                element={
                  <ProtectedRoute>
                    <EventDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/countries"
                element={
                  <ProtectedRoute>
                    <CountriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regions"
                element={
                  <ProtectedRoute>
                    <RegionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/chapters"
                element={
                  <ProtectedRoute>
                    <ChaptersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/members"
                element={
                  <ProtectedRoute>
                    <MembersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/opportunity"
                element={<Navigate to="/admin/business-opportunity" replace />}
              />
              <Route
                path="/admin/p2p"
                element={<Navigate to="/admin/business/p2p" replace />}
              />
              <Route
                path="/admin/palms-attendance"
                element={<Navigate to="/reports/palms-attendance" replace />}
              />
              {/* Social Partner Routes */}
              <Route
                path="/admin/social"
                element={
                  <ProtectedRoute>
                    <SocialPartnerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/social/:id/chapters"
                element={
                  <ProtectedRoute>
                    <SocialPartnerChaptersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/social/:id"
                element={
                  <ProtectedRoute>
                    <SocialPartnerDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/social/create"
                element={
                  <ProtectedRoute>
                    <CreateSocialPartnerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/social/edit/:id"
                element={
                  <ProtectedRoute>
                    <EditSocialPartnerPage />
                  </ProtectedRoute>
                }
              />
              {/* Regional Board Routes */}
              <Route
                path="/admin/regional-board"
                element={
                  <ProtectedRoute>
                    <RegionalBoardPage />
                  </ProtectedRoute>
                }
              />
              {/* Register Member Route - Admin Only */}
              <Route
                path="/admin/register-member"
                element={
                  <ProtectedRoute>
                    <RegisterMemberPage />
                  </ProtectedRoute>
                }
              />
              {/* Professional Management Routes */}
              <Route
                path="/admin/professionals"
                element={
                  <ProtectedRoute>
                    <ProfessionalPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/content-reports"
                element={
                  <ProtectedRoute>
                    <ContentReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/groups"
                element={
                  <ProtectedRoute>
                    <AdminGroupsLayout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/ed/groups/create"
                element={
                  <ProtectedRoute>
                    <AdminCreateGroupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/groups/:id"
                element={
                  <ProtectedRoute>
                    <AdminGroupDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/chapter/:chapterId"
                element={
                  <ProtectedRoute>
                    <ChapterDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/chapter/:chapterId/leadership-team"
                element={
                  <ProtectedRoute>
                    <LeadershipTeamPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/leadership-team"
                element={
                  <ProtectedRoute>
                    <LeadershipTeamPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/leadership-team/member/:id"
                element={
                  <ProtectedRoute>
                    <TeamMemberDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/chapter/:chapterId/members"
                element={
                  <ProtectedRoute>
                    <MembersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/approvals"
                element={
                  <ProtectedRoute>
                    <SuperAdminApprovalsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/platform-members"
                element={
                  <ProtectedRoute>
                    <MembersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/members/:memberId/change-chapter/:chapterId?"
                element={
                  <ProtectedRoute>
                    <MovedAway />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/members/:memberId/extend"
                element={
                  <ProtectedRoute>
                    <ExtendMemberPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/members/:memberId/view"
                element={
                  <ProtectedRoute>
                    <AdminViewMemberProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/members/:memberId/edit"
                element={
                  <ProtectedRoute>
                    <EditMemberRouter />
                  </ProtectedRoute>
                }
              />

              {/* Regional Access Routes - Same components, different paths */}
              <Route
                path="/admin/regional-access"
                element={
                  <ProtectedRoute>
                    <RegionalBoardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-access/chapter/:chapterId"
                element={
                  <ProtectedRoute>
                    <ChapterDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-access/chapter/:chapterId/members"
                element={
                  <ProtectedRoute>
                    <MembersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/chapter/:chapterId/palms"
                element={
                  <ProtectedRoute>
                    <AdminPALMSAttendancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/chapter/:chapterId/business-opportunity"
                element={
                  <ProtectedRoute>
                    <AdminBusinessOpportunityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-team"
                element={
                  <ProtectedRoute>
                    <RegionalTeamPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-team/create"
                element={
                  <ProtectedRoute>
                    <CreateRegionalTeamPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-team/edit/:id"
                element={
                  <ProtectedRoute>
                    <EditExecutivePartnerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-team/member/:id"
                element={
                  <ProtectedRoute>
                    <TeamMemberDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/meetings"
                element={
                  <ProtectedRoute>
                    <AdminMeetingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/blocked-members"
                element={
                  <ProtectedRoute>
                    <BlockedMembersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/ed/m2o/:id"
                element={
                  <ProtectedRoute>
                    <EDM20Page />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/meetings/:id"
                element={
                  <ProtectedRoute>
                    <AdminMeetingDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/chapters/create"
                element={
                  <ProtectedRoute>
                    <CreateChapterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/regional-board/chapters/edit/:chapterId"
                element={
                  <ProtectedRoute>
                    <EditChapterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/visitors"
                element={
                  <ProtectedRoute>
                    <AdminVisitorsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/visitors/:visitorId/edit"
                element={
                  <ProtectedRoute>
                    <AdminEditVisitorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/inducted-by-report"
                element={
                  <ProtectedRoute>
                    <AdminInductedByReportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/many-to-one"
                element={
                  <ProtectedRoute>
                    <AdminManyToOnePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/business-opportunity"
                element={
                  <ProtectedRoute>
                    <BusinessOpportunityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/business/events"
                element={
                  <ProtectedRoute>
                    <EventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/business/p2p"
                element={
                  <ProtectedRoute>
                    <AdminP2PPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/p2p"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <P2PPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/p2p/add"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <AddP2PPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/edit-p2p/:id"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <EditP2PPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/opportunity-given"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <BusinessOpportunityGivenPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/opportunity-given/add"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <AddBusinessOpportunityGivenPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/opportunity-received"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <BusinessOpportunityReceivedPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/opportunity-received/edit/:id"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <EditBusinessOpportunityReceivedPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/upcoming-events"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <UpcomingEventsPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/upcoming-events/:id"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <EventDetailsPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/meetings"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <MeetingsPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/meetings/:id"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <MeetingDetailsPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/visitors"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <VisitorsPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/visitors/add"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <AddVisitorPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/visitors/:id/edit"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <EditVisitorPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/many-to-one"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <ManyToOnePage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/add-many-to-one"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <AddManyToOnePage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/edit-many-to-one/:id"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <EditManyToOnePage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/many-to-one/:id"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <ManyToOneDetailsPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/business-received"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <BusinessClosedPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/business-received/add"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <AddBusinessClosedPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/blocked-members"
                element={
                  <ProtectedRoute>
                    <BlockedMembersSelfPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ed/profile"
                element={
                  <ProtectedRoute>
                    <EdProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/profile"
                element={
                  <ProtectedRoute>
                    <SocialAdminProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <ProtectedRoute>
                    <CategoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/update/:section"
                element={
                  <ProtectedRoute>
                    <UpdateProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/delete-account"
                element={<DeleteAccountPage />}
              />
              <Route
                path="/reports/personal-palms"
                element={
                  <ProtectedRoute>
                    <PersonalPALMSReportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/palms-summary"
                element={
                  <ProtectedRoute>
                    <PALMSSummaryReportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/opportunity-received"
                element={
                  <ProtectedRoute>
                    <ReceivedBusinessOpportunityReportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/visitor-registration"
                element={
                  <ProtectedRoute>
                    <VisitorRegistrationReportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/inducted-by"
                element={
                  <ProtectedRoute>
                    <UserInductedByReportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/palms-attendance"
                element={
                  <ProtectedRoute>
                    <PALMSAttendanceReportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/weekly"
                element={
                  <ProtectedRoute>
                    <YourWeeklyReportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/personal-many-to-one"
                element={
                  <ProtectedRoute>
                    <PersonalManyToOneReportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/testimonials"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <TestimonialsPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/my-feed"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <MyFeedPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post/:postId"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <MyFeedPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/connections"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <ConnectionsPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/business/connections/add"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="business">
                      <AddConnectionPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <SearchPage />
                  </ProtectedRoute>
                }
              />
              {/* Professional section*/}
              <Route
                path="/professional/feed"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="professional">
                      <ProfessionalFeed />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/professional/post/:id"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="professional">
                      <ProfessionalPostPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/professional/connections"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="professional">
                      <ProfessionalConnections />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/professional/messages"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="professional">
                      <ProfessionalMessages />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/professional/messages/:threadId"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="professional">
                      <ProfessionalMessages />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/professional/profile/:userId"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="professional">
                      <ProfessionalProfilePage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/professional/businessprofile/:userId"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="professional">
                      <ProfessionalBusinessProfile />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />

              {/* Social Admin Dashboard */}
              <Route
                path="/social/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <SocialAdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Social Admin Regional Board */}
              <Route
                path="/social/admin/regional-board"
                element={
                  <ProtectedRoute>
                    <SocialAdminRegionalBoard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/social/admin/regional-board/chapter/:chapterId"
                element={
                  <ProtectedRoute>
                    <SocialAdminChapterDetailsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/social/admin/regional-board/chapter/:chapterId/invite"
                element={
                  <ProtectedRoute>
                    <SocialAdminInvitePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/social/admin/regional-board/create-chapter"
                element={
                  <ProtectedRoute>
                    <SocialAdminCreateChapterPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/social/admin/regional-board/platform-members"
                element={
                  <ProtectedRoute>
                    <SocialAdminMembersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/regional-board/platform-members/:userId/move"
                element={
                  <ProtectedRoute>
                    <SocialMoveChapterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/regional-board/platform-members/:userId/view"
                element={
                  <ProtectedRoute>
                    <SocialMemberViewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/regional-board/platform-members/:userId/edit"
                element={
                  <ProtectedRoute>
                    <SocialEditMemberPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/social/admin/regional-board/chapter/:chapterId/members"
                element={
                  <ProtectedRoute>
                    <SocialAdminMembersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/regional-board/chapter/:chapterId/members/:userId/move"
                element={
                  <ProtectedRoute>
                    <SocialMoveChapterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/regional-board/chapter/:chapterId/members/:userId/extend"
                element={
                  <ProtectedRoute>
                    <ExtendMemberPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/regional-board/chapter/:chapterId/members/:userId/view"
                element={
                  <ProtectedRoute>
                    <SocialMemberViewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/regional-board/chapter/:chapterId/members/:userId/edit"
                element={
                  <ProtectedRoute>
                    <SocialEditMemberPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/regional-board/chapter/:chapterId/events"
                element={
                  <ProtectedRoute>
                    <SocialAdminUpcomingEvents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/regional-board/chapter/:chapterId/event-requests"
                element={
                  <ProtectedRoute>
                    <SocialAdminEventsRequest />
                  </ProtectedRoute>
                }
              />

              {/* Social Admin - Social Section (tabs: All Activities, All Events, My Events, Events Request, Upcoming Events) */}
              <Route
                path="/social/admin/all-activities"
                element={
                  <ProtectedRoute>
                    <SocialAdminAllActivities />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/all-events"
                element={
                  <ProtectedRoute>
                    <SocialAdminAllEvents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/event/:id"
                element={
                  <ProtectedRoute>
                    <SocialAdminEventDetailPage />
                  </ProtectedRoute>
                }
              />


              <Route
                path="/social/admin/my-events"
                element={
                  <ProtectedRoute>
                    <SocialAdminMyEvents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/events-request"
                element={
                  <ProtectedRoute>
                    <SocialAdminEventsRequest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/upcoming-events"
                element={
                  <ProtectedRoute>
                    <SocialAdminUpcomingEvents />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/social/admin/upcoming-events/:eventId/members"
                element={
                  <ProtectedRoute>
                    <SocialAdminEventMembersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/add-event"
                element={
                  <ProtectedRoute>
                    <SocialAdminAddEvent />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/edit-event/:id"
                element={
                  <ProtectedRoute>
                    <SocialAdminEditEvent />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/event-details/:id"
                element={
                  <ProtectedRoute>
                    <SocialAdminEventDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Social Admin - Regional Team */}
              <Route
                path="/social/admin/regional-team"
                element={
                  <ProtectedRoute>
                    <SocialAdminRegionalTeam />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/admin/regional-team/member/:id"
                element={
                  <ProtectedRoute>
                    <SocialAdminRegionalTeamMemberPage />
                  </ProtectedRoute>
                }
              />
              {/* Social Admin - Team & Role */}
              <Route
                path="/social/admin/team-role"
                element={
                  <ProtectedRoute>
                    <SocialAdminTeamRole />
                  </ProtectedRoute>
                }
              />

              {/* Social Admin - Manage Roles */}
              <Route
                path="/social/admin/manage-roles"
                element={
                  <ProtectedRoute>
                    <SocialAdminManageRolesPage />
                  </ProtectedRoute>
                }
              />

              {/* Social section */}
              <Route
                path="/social/all-activities"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="social">
                      <AllActivities />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/all-events"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="social">
                      <AllEvents />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/my-events"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="social">
                      <MyEvents />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/events-request"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="social">
                      <EventsRequest />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/event/:id"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="social">
                      <ViewEvent />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/event-details/:id"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="social">
                      <ViewEventPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/event/:id/edit"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="social">
                      <EditEventPage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/add-event"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="social">
                      <AddEvent />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/upcoming-events"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="social">
                      <UpcomingEvents />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/connections"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="social">
                      <SocialConnections />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/messages"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="social">
                      <SocialMessages />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/messages/:threadId"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="social">
                      <SocialMessages />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/social/profile/:userId"
                element={
                  <ProtectedRoute>
                    <ModuleGuard moduleKey="social">
                      <SocialProfilePage />
                    </ModuleGuard>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/viewprofile/:id"
                element={
                  <ProtectedRoute>
                    <ViewProfilePage />
                  </ProtectedRoute>
                }
              />


              <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </div>
          </div>
          <GuestFooter />
        </PushNotificationsProvider>
      </Suspense>
      {/* After the boundary, not before it: the routes suspend as they render,
          so by the time this renders the first chunk is already in flight and
          the screen can open in the same commit rather than a frame later. */}
      <RouteLoadingOverlay />
    </BrowserRouter>
  );
}
