import React from "react";
import GroupCard from "../../components/groups/GroupCard";
import type { GroupCardProps } from "../../components/groups/GroupCard";
import GradientContainer from "../../components/common/GradientContainer";
import PageHeader from "../../components/common/PageHeader";
import { ToastContainer } from "../../components/common/ToastContainer";
import type { ToastMessage } from "../../components/common/ToastContainer";
import {
  useCancelJoinRequestMutation,
  useJoinGroupMutation,
  useListGroupsQuery,
  useRequestJoinGroupMutation,
} from "../../services/groupsApi";

const GroupSuggestionsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [joiningGroupId, setJoiningGroupId] = React.useState<string | null>(null);
  const [cancellingGroupId, setCancellingGroupId] = React.useState<string | null>(null);
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const [requestJoinGroup] = useRequestJoinGroupMutation();
  const [joinGroup] = useJoinGroupMutation();
  const [cancelJoinRequest] = useCancelJoinRequestMutation();
  
  const { data: suggestedGroupsData, isLoading, error, refetch } = useListGroupsQuery({
    tab: "suggested",
    page: 1,
    limit: 20,
    search: searchQuery,
    showPrivate: true,
  });

  const addToast = React.useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Handle search on Enter key
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmedSearch = searchTerm.trim();
      setSearchQuery(trimmedSearch);
      refetch();
    }
  };

  // Handle search button click
  const handleSearch = () => {
    const trimmedSearch = searchTerm.trim();
    setSearchQuery(trimmedSearch);
    refetch();
  };

  const handleJoinRequest = async (groupId: string, privacy?: 'PUBLIC' | 'PRIVATE') => {
    try {
      setJoiningGroupId(groupId);
      if (privacy === 'PRIVATE') {
        await requestJoinGroup(groupId).unwrap();
        addToast('Join request sent successfully', 'success');
      } else {
        await joinGroup(groupId).unwrap();
        addToast('Joined group successfully', 'success');
      }
      refetch();
    } catch (error: any) {
      console.error('Error joining group:', error);
      if (error?.data?.code === 'REQUEST_ALREADY_EXISTS') {
        addToast('You already have a pending request to join this group', 'info');
        refetch();
      } else {
        addToast(privacy === 'PRIVATE' ? 'Failed to send join request' : 'Failed to join group', 'error');
      }
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleCancelRequest = async (groupId: string) => {
    try {
      setCancellingGroupId(groupId);
      await cancelJoinRequest(groupId).unwrap();
      addToast('Join request cancelled successfully', 'success');
      refetch();
    } catch (error) {
      console.error('Error cancelling join request:', error);
      addToast('Failed to cancel join request', 'error');
    } finally {
      setCancellingGroupId(null);
    }
  };

  return (
    <div className="min-h-screen text-white">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <PageHeader 
            breadcrumbs={[
              { 
                label: "Groups", 
                onClick: () => window.history.back()
              },
              { 
                label: "Suggest Groups" 
              }
            ]}
          />

      <div className="flex items-center gap-3">
          <GradientContainer className="flex-1 max-w-md">
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
            className="px-5 py-2.5 rounded-xl bg-[#D85D27] text-white hover:bg-orange-700 transition-colors"
          >
            Search
          </button>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[#111823] rounded-xl p-4 animate-pulse">
              <div className="h-32 bg-gray-700 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-3/4"></div>
            </div>
          ))
        ) : error ? (
          <div className="col-span-full text-center py-8">
            <p className="text-red-400">Failed to load suggested groups. Please try again.</p>
          </div>
        ) : suggestedGroupsData?.items?.length ? (
          suggestedGroupsData.items.map((group) => {
            // Determine status based on requestStatus
            let status: GroupCardProps['status'] = 'none';
            if ((group as any).requestStatus === 'PENDING') {
              status = 'pending_requested';
            }
            
            return (
              <GroupCard
                key={group.id}
                id={group.id}
                title={group?.name}
                description={group?.description}
                members={group?.memberCount}
                isPrivate={group?.privacy === "PRIVATE"}
                status={status}
                isSuggestion={true}
                cover={group?.coverImageUrl}
                onJoinRequest={handleJoinRequest}
                onCancelRequest={handleCancelRequest}
                isJoining={joiningGroupId === group.id}
                isCancelling={cancellingGroupId === group.id}
              />
            );
          })
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-400">No suggested groups found at the moment.</p>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
};

export default GroupSuggestionsPage;
