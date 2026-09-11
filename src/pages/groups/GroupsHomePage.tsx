import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import GroupCard from "../../components/groups/GroupCard";
import GradientContainer from "../../components/common/GradientContainer";
import ModuleLocked from "../../components/access/ModuleLocked";
import { useListGroupsQuery, useRequestJoinGroupMutation, useJoinGroupMutation, useListMyInvitesQuery, useCancelJoinRequestMutation, useGetProfileSummaryQuery, useAcceptInviteMutation, useDeclineInviteMutation } from "../../services/groupsApi";
import { useMeQuery, useUsersMeQuery } from "../../services/authApi";
import { useAppSelector } from "../../app/store";
import type { Group } from "../../services/groupsApi";
import { ToastContainer } from '../../components/common/ToastContainer';
import type { ToastMessage } from '../../components/common/ToastContainer';
import { formatStepwiseDescription, hasStepwiseFormat } from "../../utils/descriptionFormatter";

interface GroupInvite {
  id: string;
  groupId: string;
  status: string;
  createdAt: string;
  group: {
    id: string;
    name: string;
    description?: string;
    privacy: 'PUBLIC' | 'PRIVATE';
    memberCount: number;
    coverImageUrl?: string;
  };
}

const GroupsHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'my' | 'invites'>('my');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileSummaryExpanded, setIsProfileSummaryExpanded] = useState(false);
  const profileSummaryRef = useRef<HTMLDivElement | null>(null);

  // Get current user ID and profile data
  const { data: userData } = useMeQuery();
  const { data: usersMeData } = useUsersMeQuery();
  const authUser = useAppSelector((s) => s.auth.user);

  const currentUserId =
    userData?.data?._id ||
    (userData?.data as { id?: string })?.id ||
    usersMeData?.data?._id ||
    (usersMeData?.data as { id?: string })?.id ||
    "";

  // Check moduleAccess for Groups - show if either business OR professional is true
  const moduleAccess = authUser?.moduleAccess || {};
  const canAccess = moduleAccess.business === true || moduleAccess.professional === true;

  // Fetch my groups only (no more requested groups)
  const { data: myGroupsData, isLoading: isLoadingMy, refetch: refetchMyGroups } = useListGroupsQuery({
    tab: "my",
    page: currentPage,
    limit: 9,
    search: searchQuery,
  });

  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Add toast helper function
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  // Remove toast
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Join group mutation
  const [requestJoinGroup, { isLoading: isJoining }] = useRequestJoinGroupMutation();
  
  // Direct join group mutation (for public groups)
  const [joinGroup, { isLoading: isDirectJoining }] = useJoinGroupMutation();
  
  // Cancel join request mutation
  const [cancelJoinRequest, { isLoading: isCancelling }] = useCancelJoinRequestMutation();

  const [acceptInvite, { isLoading: isAcceptingInvite }] = useAcceptInviteMutation();
  const [declineInvite, { isLoading: isDecliningInvite }] = useDeclineInviteMutation();

  // Handle joining group
  const handleJoinGroup = async (groupId: string, privacy?: 'PUBLIC' | 'PRIVATE') => {
    try {
      // Use different API based on privacy setting
      if (privacy === 'PUBLIC') {
        await joinGroup(groupId).unwrap();
        addToast('Joined group successfully', 'success');
      } else {
        // Private group - send join request
        await requestJoinGroup(groupId).unwrap();
        addToast('Join request sent successfully', 'success');
      }
      
      // Refetch data to update the UI
      refetchMyGroups();
      refetchPendingInvites();
      refetchAcceptedInvites();
      refetchDeclinedInvites();
    } catch (error: any) {
      console.error('Error joining group:', error);
      
      // Handle specific error codes
      if (error?.data?.code === 'REQUEST_ALREADY_EXISTS') {
        addToast('You already have a pending request to join this group', 'info');
        refetchMyGroups();
        refetchPendingInvites();
        refetchAcceptedInvites();
        refetchDeclinedInvites();
      } else {
        const errorMessage = privacy === 'PUBLIC' ? 'Failed to join group' : 'Failed to send join request';
        addToast(errorMessage, 'error');
      }
    }
  };

  // Handle cancel join request
  const handleCancelRequest = async (groupId: string) => {
    try {
      await cancelJoinRequest(groupId).unwrap();
      addToast('Join request cancelled successfully', 'success');
      // Refetch data to update the UI
      refetchMyGroups();
      refetchPendingInvites();
      refetchAcceptedInvites();
      refetchDeclinedInvites();
    } catch (error: any) {
      console.error('Error cancelling join request:', error);
      addToast('Failed to cancel join request', 'error');
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await acceptInvite(inviteId).unwrap();
      addToast('Invitation accepted successfully', 'success');
      refetchMyGroups();
      refetchPendingInvites();
      refetchAcceptedInvites();
      refetchDeclinedInvites();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      addToast('Failed to accept invitation', 'error');
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await declineInvite(inviteId).unwrap();
      addToast('Invitation rejected successfully', 'success');
      refetchPendingInvites();
      refetchAcceptedInvites();
      refetchDeclinedInvites();
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      addToast('Failed to reject invitation', 'error');
    }
  };

  // Fetch group invitations with three different statuses
  const { data: pendingInvitesData, refetch: refetchPendingInvites } = useListMyInvitesQuery({ status: "PENDING" }, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const { data: acceptedInvitesData, refetch: refetchAcceptedInvites } = useListMyInvitesQuery({ status: "ACCEPTED" }, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const { data: declinedInvitesData, refetch: refetchDeclinedInvites } = useListMyInvitesQuery({ status: "DECLINED" }, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  // Fetch profile summary - using dynamic account ID from current user
  const { data: profileData, isLoading: isLoadingProfile } = useGetProfileSummaryQuery(currentUserId, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    skip: !currentUserId, // Skip query if no user ID is available
  });

  const pendingInvites = pendingInvitesData?.items || [];
  
  // Combined loading state for invites
  const isLoadingInvites = !pendingInvitesData && !acceptedInvitesData && !declinedInvitesData;

  // Handle tab clicks and refetch data
  const handleTabClick = (tab: 'my' | 'invites') => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when switching tabs
    if (tab === 'invites') {
      refetchPendingInvites();
      refetchAcceptedInvites();
      refetchDeclinedInvites();
    } else {
      refetchMyGroups();
    }
  };

  // Handle search
  const handleSearch = () => {
    const trimmedSearch = searchTerm.trim();
    setSearchQuery(trimmedSearch);
    setCurrentPage(1); // Reset to first page when searching
    if (activeTab === 'my') {
      refetchMyGroups();
    }
  };

  // Handle search on Enter key
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Pagination component - Simple version matching RegionalTeamPage
  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-8">
        <div className="text-sm text-gray-300">Page {currentPage} of {totalPages}</div>
        <div className="flex gap-2">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-4 py-2 rounded-md bg-[#111823] border border-white/10 text-white disabled:opacity-50 hover:bg-white/10 transition-colors"
          >
            Prev
          </button>
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 rounded-md bg-[#111823] border border-white/10 text-white disabled:opacity-50 hover:bg-white/10 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    );
  };
  useEffect(() => {
    const handleFocus = () => {
      refetchPendingInvites();
      refetchAcceptedInvites();
      refetchDeclinedInvites();
      refetchMyGroups();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchPendingInvites, refetchAcceptedInvites, refetchDeclinedInvites, refetchMyGroups]);

  useEffect(() => {
    if (!isProfileSummaryExpanded && profileSummaryRef.current) {
      profileSummaryRef.current.scrollTop = 0;
    }
  }, [isProfileSummaryExpanded]);

  const handleProfileSummaryToggle = () => {
    if (isProfileSummaryExpanded && profileSummaryRef.current) {
      profileSummaryRef.current.scrollTop = 0;
    }
    setIsProfileSummaryExpanded((prev) => !prev);
  };

  // Type guard to check if the group has the required properties
  const isGroupValid = (group: any): group is Group => {
    return group &&
      typeof group.id === 'string' &&
      typeof group.name === 'string' &&
      typeof group.privacy === 'string' &&
      typeof group.memberCount === 'number';
  };

  // Fetch suggested groups for the suggest panel
  const { data: suggestedGroupsData, isLoading: isLoadingSuggested } = useListGroupsQuery({
    tab: "suggested",
    page: 1,
    limit: 5,
    showPrivate: true,
    search: searchQuery,
  });

  const isLoading = activeTab === 'my' ? isLoadingMy : isLoadingInvites;
  const error = myGroupsData?.success === false;

  // My groups only (no more requested groups)
  const uniqueGroups = myGroupsData?.items || [];
  const totalPages = Math.ceil((myGroupsData?.total || 0) / 9);
  const totalItems = myGroupsData?.total || 0;

  // Show ModuleLocked if user cannot access Groups
  if (!canAccess) {
    return (
      <ModuleLocked 
        title="You don't have access to Groups"
        moduleKey="groups"
        hideNavbar={true}
      />
    );
  }

  return (
    <div className="min-h-screen text-white relative">
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Profile and Suggestions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <GradientContainer>
              <div className="rounded-2xl overflow-hidden p-0">
                {isLoadingProfile ? (
                  // Loading skeleton for profile
                  <div className="p-5">
                    <div className="w-full h-32 bg-gray-700 rounded-lg mb-4 animate-pulse"></div>
                    <div className="w-16 h-16 rounded-full bg-gray-700 mx-auto -mt-8 mb-3 animate-pulse"></div>
                    <div className="text-center">
                      <div className="h-5 bg-gray-700 rounded w-3/4 mx-auto mb-2 animate-pulse"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto mb-2 animate-pulse"></div>
                      <div className="h-4 bg-gray-700 rounded w-2/3 mx-auto animate-pulse"></div>
                    </div>
                    <div className="my-4 h-px bg-white/10" />
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="h-5 bg-gray-700 rounded w-1/2 mx-auto mb-1 animate-pulse"></div>
                        <div className="h-3 bg-gray-700 rounded w-3/4 mx-auto animate-pulse"></div>
                      </div>
                      <div>
                        <div className="h-5 bg-gray-700 rounded w-1/2 mx-auto mb-1 animate-pulse"></div>
                        <div className="h-3 bg-gray-700 rounded w-3/4 mx-auto animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ) : profileData?.data ? (
                  <>
                    <div
                      className="w-full h-32 bg-cover bg-center"
                      style={{
                        backgroundImage: profileData?.data?.header?.bannerUrl 
                          ? `url('${profileData.data.header.bannerUrl}')`
                          : "url('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=60')",
                      }}
                    />
                    <div className="px-5 pb-5 -mt-8">
                      <div className="w-16 h-16 rounded-full ring-4 ring-[#111823] overflow-hidden mx-auto">
                        {profileData?.data?.header?.logoUrl ? (
                          <img
                            src={profileData.data.header.logoUrl}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800">
                            <div className="w-12 h-12 rounded-full bg-gray-900/30 flex items-center justify-center">
                              <span className="text-gray-100 text-lg font-bold">
                                {profileData?.data?.header?.name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-center mt-3">
                        <div className="text-white font-semibold">{profileData?.data?.header?.name || 'No name'}</div>
                        {profileData?.data?.header?.location && (
                          <div className="text-gray-400 text-sm">{profileData.data.header.location}</div>
                        )}
                        {profileData?.data?.header?.tagline && (() => {
                          const role = profileData.data.header.tagline;
                          const lineHeight = 1.5;
                          const needsTruncation = role.split('\n').length > 3 || role.length > 150;
                          const formatRoleText = (text: string) =>
                            text.split('\n\n').filter((s: string) => s.trim() !== '');
                          return (
                            <div className="mt-2 w-full px-2 text-left">
                              <div
                                ref={profileSummaryRef}
                                className={`text-gray-300 text-sm ${isProfileSummaryExpanded ? "max-h-48 overflow-y-auto pr-1 custom-scrollbar" : "line-clamp-3 overflow-hidden"}`}
                                style={{ lineHeight }}
                              >
                                {formatRoleText(role).map((section: string, index: number) => {
                                  const isHeading = section.endsWith(':');
                                  const isListItem = section.trim().startsWith('●');
                                  if (isHeading) {
                                    return (
                                      <h4 key={index} className="font-semibold text-white mt-3 first:mt-0">
                                        {section}
                                      </h4>
                                    );
                                  } else if (isListItem) {
                                    const items = section.split('\n').filter((item: string) => item.trim() !== '');
                                    return (
                                      <ul key={index} className="list-disc pl-5 space-y-1">
                                        {items.map((item: string, i: number) => (
                                          <li key={i} className="text-gray-300">
                                            {item.trim().replace('●', '').trim()}
                                          </li>
                                        ))}
                                      </ul>
                                    );
                                  }
                                  return (
                                    <p key={index} className="text-gray-300">{section}</p>
                                  );
                                })}
                              </div>
                              {needsTruncation && (
                                <button
                                  onClick={handleProfileSummaryToggle}
                                  className="text-orange-400 hover:text-orange-300 text-xs mt-1 focus:outline-none"
                                >
                                  {isProfileSummaryExpanded ? 'Read Less' : 'Read More'}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="my-4 h-px bg-white/10" />
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-white font-semibold">{profileData?.data?.stats?.posts || 0}</div>
                          <div className="text-gray-400 text-xs">Posts</div>
                        </div>
                        <div>
                          <div className="text-white font-semibold">{profileData?.data?.stats?.connections || 0}</div>
                          <div className="text-gray-400 text-xs">Connections</div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // Error or no data state
                  <div className="p-5 text-center">
                    <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-3"></div>
                    <div className="text-gray-400">Profile unavailable</div>
                  </div>
                )}
              </div>
            </GradientContainer>

            {/* Suggest panel */}
            <GradientContainer>
              <div className="rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-base">Suggest</h3>
                  <button
                    onClick={() => navigate("/groups/suggestions")}
                    className="text-orange-500 text-sm hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {isLoadingSuggested ? (
                    // Loading skeleton for suggested groups
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-2 md:gap-3 border-b border-white/10 pb-0.5 last:border-0">
                        <div className="w-12 h-12 md:w-26 md:h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <div className="w-full h-full bg-gray-700 animate-pulse"></div>
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="h-4 bg-gray-700 rounded mb-1 animate-pulse"></div>
                          <div className="h-3 bg-gray-700 rounded w-3/4 animate-pulse"></div>
                          <div className="h-3 bg-gray-700 rounded w-1/2 animate-pulse"></div>
                        </div>
                      </div>
                    ))
                  ) : suggestedGroupsData?.items?.length ? (
                    suggestedGroupsData.items.filter(isGroupValid).map((group) => (
                      <div
                        key={group.id}
                        onClick={() => navigate(`/groups/${group.id}`)}
                        className="flex gap-2 md:gap-3 border-b border-white/10 pb-0.5 last:border-0 cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 md:w-26 md:h-16 rounded-lg overflow-hidden flex-shrink-0">
                          {group.coverImageUrl && group.coverImageUrl.trim() !== '' ? (
                            <img
                              src={group.coverImageUrl}
                              alt={group.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-700/40">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-600/50 flex items-center justify-center">
                                <span className="text-gray-300 text-sm md:text-base font-bold">
                                  {group.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-between">
                          <h4 className="text-white font-medium text-xs md:text-sm leading-tight line-clamp-1">{group.name}</h4>
                          <div className="text-[10px] text-gray-400 flex items-center">
                            <span>{group.privacy === "PRIVATE" ? "Private" : "Public"}</span>
                            <span>•</span>
                            <span>{group.memberCount} Mem</span>
                          </div>
                          <p className="text-gray-400 text-[10px] line-clamp-2">
                            {hasStepwiseFormat(group.description) ? (
                              <div className="space-y-0.5">
                                {formatStepwiseDescription(group.description).split('\n').slice(0, 2).map((line, index) => (
                                  <div key={index} className="text-[10px]">{line}</div>
                                ))}
                              </div>
                            ) : (
                              <span>{group.description}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-400 text-sm">No suggested groups available</p>
                    </div>
                  )}
                </div>
              </div>
            </GradientContainer>
          </div>
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search and Create */}
            <div className="space-y-3 md:flex md:items-center md:gap-3 md:space-y-0 lg:flex lg:items-center lg:gap-3 lg:space-y-0">
              <GradientContainer className="md:flex-1 lg:w-[35%]">
                <input
                  placeholder="Search........."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full bg-[#111823] border border-white/10 rounded-xl px-4 py-2.5 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-orange-500/50"
                />
              </GradientContainer>
              <button 
                onClick={handleSearch}
                className="md:w-auto lg:w-[15%] px-5 py-2.5 rounded-lg bg-[#D85D27] text-white whitespace-nowrap hover:bg-orange-700 transition-colors"
              >
                Search
              </button>
              <div className="md:flex-1 lg:w-[30%]"></div>
              <button
                className="md:w-auto lg:w-[20%] px-5 py-2.5 rounded-lg bg-[#D85D27] text-white whitespace-nowrap"
                onClick={() => navigate('/groups/create')}
              >
                Create Group +
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-4 flex border-b border-white/10">
              <button
                className={`px-4 py-2 font-medium text-sm ${activeTab === 'my'
                    ? 'text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-400 hover:text-white'
                  }`}
                onClick={() => handleTabClick('my')}
              >
                My Groups {totalItems > 0 && `(${totalItems})`}
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${activeTab === 'invites'
                    ? 'text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-400 hover:text-white'
                  }`}
                onClick={() => handleTabClick('invites')}
              >
                Invitations {pendingInvites.length > 0 && `(${pendingInvites.length})`}
              </button>
            </div>

            {/* Content based on active tab */}
            <div className="mt-6">
              {activeTab === 'my' ? (
                /* Groups Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-[#111823] rounded-xl p-4 animate-pulse">
                      <div className="h-32 bg-gray-700 rounded-lg mb-3"></div>
                      <div className="h-4 bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                    </div>
                  ))
                ) : error ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-red-400">Failed to load groups. Please try again.</p>
                  </div>
                ) : uniqueGroups?.length ? (
                  uniqueGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      id={group.id}
                      title={group?.name}
                      description={group?.description || 'No description available'}
                      members={group?.memberCount}
                      isPrivate={group?.privacy === "PRIVATE"}
                      privacy={group?.privacy}
                      status={
  group?.role === "OWNER" || group?.role === "ADMIN" || group?.role === "MEMBER"
    ? group?.approvalStatus === "REJECTED"
      ? "rejected"
      : group?.approvalStatus === "PENDING"
        ? "pending"  // Show Pending Approval for pending groups
        : "joined"
    : group?.approvalStatus === "REJECTED"
      ? "rejected"
      : group?.approvalStatus === "APPROVED"
        ? "none"
        : "none"
}
                      role={group?.role}
                      cover={group?.coverImageUrl}
                      onJoinRequest={handleJoinGroup}
                      onCancelRequest={handleCancelRequest}
                      isJoining={isJoining || isDirectJoining}
                      isCancelling={isCancelling}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-400">No groups found. Join or create groups to see them here.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Invitations Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {isLoadingInvites ? (
                  // Loading skeleton for invites
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-[#111823] rounded-xl p-4 animate-pulse">
                      <div className="h-32 bg-gray-700 rounded-lg mb-3"></div>
                      <div className="h-4 bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-3/4 mb-4"></div>
                      <div className="flex gap-2">
                        <div className="h-8 bg-gray-700 rounded w-1/2"></div>
                        <div className="h-8 bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))
                ) : pendingInvites.length > 0 ? (
                  pendingInvites.map((invite: GroupInvite) => (
                    <div key={invite.id} className="bg-[#111823] rounded-xl p-4">
                      <div
                        className="h-32 bg-cover bg-center rounded-lg mb-3 relative"
                        style={{
                          backgroundImage: invite.group.coverImageUrl && invite.group.coverImageUrl.trim() !== '' ? `url('${invite.group.coverImageUrl}')` : 'none',
                          backgroundColor: (!invite.group.coverImageUrl || invite.group.coverImageUrl.trim() === '') ? '#374151' : 'transparent',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        {(!invite.group.coverImageUrl || invite.group.coverImageUrl.trim() === '') && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-gray-600/50 flex items-center justify-center">
                              <span className="text-gray-300 text-2xl font-bold">
                                {invite.group.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <h3 className="text-white font-medium mb-1">{invite.group.name}</h3>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {hasStepwiseFormat(invite.group.description) ? (
                          <div className="space-y-1">
                            {formatStepwiseDescription(invite.group.description).split('\n').slice(0, 2).map((line, index) => (
                              <div key={index} className="text-sm">{line}</div>
                            ))}
                          </div>
                        ) : (
                          <span>{invite.group.description || 'No description provided'}</span>
                        )}
                      </p>
                      <div className="flex items-center text-xs text-gray-400 mb-3">
                        <span>{invite.group.privacy === 'PRIVATE' ? 'Private' : 'Public'}</span>
                        <span className="mx-2">•</span>
                        <span>{invite.group.memberCount} Members</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptInvite(invite.id)}
                          disabled={isAcceptingInvite || isDecliningInvite}
                          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        >
                          {isAcceptingInvite ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleDeclineInvite(invite.id)}
                          disabled={isAcceptingInvite || isDecliningInvite}
                          className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        >
                          {isDecliningInvite ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <div className="bg-[#111823] rounded-xl p-6 max-w-md mx-auto">
                      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <h3 className="text-white text-lg font-medium mb-2">No Invitations</h3>
                      <p className="text-gray-400 text-sm">You don't have any pending group invitations.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
            {/* Pagination - Only show for My Groups tab */}
            {activeTab === 'my' && <Pagination />}
            {/* Removed extra div and button that were causing syntax errors */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupsHomePage;
