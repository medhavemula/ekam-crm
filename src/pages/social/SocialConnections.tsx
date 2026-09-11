import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SocialLayout, SocialSidebar, MyConnectionsCard, ConnectionActionCard } from "../../components/social";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import type { ConnectionTab } from "../../components/social";
import {
  useAcceptUserSocialConnectionRequestMutation,
  useCancelUserSocialConnectionRequestMutation,
  useGetUserSocialConnectionsProfileSummaryQuery,
  useGetUserSocialConnectionsQuery,
  useGetUserSocialConnectionsStatsQuery,
  useRejectUserSocialConnectionRequestMutation,
  useRemoveUserSocialConnectionMutation,
  useSendUserSocialConnectionRequestMutation,
  useGetOrCreateSocialThreadMutation,
} from "../../services/social";

const toText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const v: any = value;
    if (typeof v.label === "string") return v.label;
    if (typeof v.name === "string") return v.name;
    if (typeof v.code === "string") return v.code;
    if (typeof v.value === "string") return v.value;
  }
  return "";
};

export default function SocialConnections() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ConnectionTab>("connections");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRefreshKey, setSearchRefreshKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingRemoveConnectionId, setPendingRemoveConnectionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  // Fetch connections from API
  const {
    data,
    isLoading,
    isError,
    error,
    refetch: refetchConnections,
  } = useGetUserSocialConnectionsQuery({
    tab: activeTab,
    q: searchQuery || undefined,
    page,
    limit,
    refreshKey: searchRefreshKey,
  });

  useEffect(() => {
    if (activeTab === "suggested") {
      setSearchRefreshKey((prev) => prev + 1);
    }
  }, [activeTab, searchQuery]);

  const { data: statsData, refetch: refetchStats } = useGetUserSocialConnectionsStatsQuery();
  const { data: profileSummaryData, refetch: refetchProfileSummary } =
    useGetUserSocialConnectionsProfileSummaryQuery();

  const [sendRequest, { isLoading: isSending }] = useSendUserSocialConnectionRequestMutation();
  const [acceptRequest, { isLoading: isAccepting }] = useAcceptUserSocialConnectionRequestMutation();
  const [rejectRequest, { isLoading: isRejecting }] = useRejectUserSocialConnectionRequestMutation();
  const [cancelRequest, { isLoading: isCancelling }] = useCancelUserSocialConnectionRequestMutation();
  const [removeConnection, { isLoading: isRemoving }] = useRemoveUserSocialConnectionMutation();
  const [getOrCreateThread] = useGetOrCreateSocialThreadMutation();

  const isMutating = isSending || isAccepting || isRejecting || isCancelling || isRemoving;

  // Map API response to UI format
  const connections = useMemo(() => {
    if (!data?.data?.items) {
      return [];
    }

    const mappedConnections = data.data.items.map((item: any) => {
      // Handle different API response structures
      const userData = item?.user || item?.member || item?.profile || item;
      const connectionData = item?.connection || item;
      
      // Get basic user info from various possible locations
      const name = toText(userData?.name) || toText(item?.name) || "Member";
      const title = toText(userData?.role) || toText(item?.role) || "";
      const company = toText(userData?.company) || toText(item?.company) || "";
      
      // Generate a fallback ID if none exists
      const itemId = String(
        item?.id || 
          userData?.id || 
          `temp-${Math.random().toString(36).substr(2, 9)}`
      );

      const mappedItem = {
        id: itemId,
        connectionId: item?.connectionId ? String(item.connectionId) : itemId,
        userId: String(userData?.id || item?.userId || itemId),
        name: name,
        title: title,
        company: company,
        mutualConnections: Number(
          userData?.mutualConnectionsCount || 
            userData?.connectionsCount || 
            item?.mutualConnections || 
            0
        ),
        avatar: typeof userData?.avatarUrl === 'string' ? userData.avatarUrl : undefined,
        status: item?.status || connectionData?.status,
      };
      
      return mappedItem;
    });
    
    return mappedConnections;
  }, [data]);

  const sidebarUser = {
    name: profileSummaryData?.data?.name || "",
    avatar: profileSummaryData?.data?.avatarUrl || undefined,
    company: profileSummaryData?.data?.company || "",
    role: profileSummaryData?.data?.role || "",
    postsCount: String(profileSummaryData?.data?.eventsCount ?? 0),
    connectionsCount: String(statsData?.data?.myConnections ?? data?.data?.total ?? 0),
  };

  const handleConnect = async (userId: string) => {
    if (isMutating) return;
    setActionError(null);
    try {
      await sendRequest({ userId }).unwrap();
      refetchConnections();
      refetchStats();
      refetchProfileSummary();
    } catch (e: any) {
      setActionError(e?.data?.message || "Failed to send request");
    }
  };

  const handleAccept = async (connectionId?: string) => {
    if (!connectionId) return;
    if (isMutating) return;
    setActionError(null);
    try {
      await acceptRequest({ connectionId }).unwrap();
      refetchConnections();
      refetchStats();
      refetchProfileSummary();
    } catch (e: any) {
      setActionError(e?.data?.message || "Failed to accept request");
    }
  };

  const handleDecline = async (connectionId?: string) => {
    if (!connectionId) return;
    if (isMutating) return;
    setActionError(null);
    try {
      await rejectRequest({ connectionId }).unwrap();
      refetchConnections();
      refetchStats();
      refetchProfileSummary();
    } catch (e: any) {
      setActionError(e?.data?.message || "Failed to reject request");
    }
  };

  const handleCancel = async (connectionId?: string) => {
    if (!connectionId) return;
    if (isMutating) return;
    setActionError(null);
    try {
      await cancelRequest({ connectionId }).unwrap();
      refetchConnections();
      refetchStats();
      refetchProfileSummary();
    } catch (e: any) {
      setActionError(e?.data?.message || "Failed to cancel request");
    }
  };

  const handleRemoveConnection = async () => {
    if (!pendingRemoveConnectionId || isMutating) return;
    setActionError(null);
    try {
      await removeConnection({ connectionId: pendingRemoveConnectionId }).unwrap();
      setPendingRemoveConnectionId(null);
      refetchConnections();
      refetchStats();
      refetchProfileSummary();
    } catch (e: any) {
      setActionError(e?.data?.message || "Failed to remove connection");
    }
  };

  const handleMessage = async (userId: string) => {
    setActionError(null);
    try {
      const result = await getOrCreateThread({ userId }).unwrap();
      if (result.success && result.data?.thread?.id) {
        navigate(`/social/messages/${result.data.thread.id}`);
      }
    } catch (e: any) {
      setActionError(e?.data?.message || "Failed to start conversation");
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "connections":
        return "My Connections";
      case "requests":
        return "Connection Requests";
      case "pending":
        return "Pending Requests";
      case "suggested":
        return "Suggested Connections";
      default:
        return "Connections";
    }
  };

  const currentConnections = connections;
  const serverTotal = data?.data?.total ?? 0;
  const serverItemsLen = data?.data?.items?.length ?? 0;
  // If backend "total" is inconsistent with returned items for a single-page result,

  const effectiveTotal =
    serverTotal <= limit && page === 1 && serverItemsLen > 0 && serverItemsLen !== serverTotal
      ? serverItemsLen
      : serverTotal;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / limit));

  const tabCounts = useMemo(() => {
    const base = {
      connections: statsData?.data?.myConnections ?? 0,
      requests: statsData?.data?.requests ?? 0,
      pending: statsData?.data?.pending ?? 0,
      suggested: statsData?.data?.suggested ?? 0,
    };

    // This prevents mismatches where stats may be stale/off.
    if (!searchQuery) {
      return {
        ...base,
        [activeTab]: effectiveTotal,
      };
    }

    return base;
  }, [activeTab, effectiveTotal, searchQuery, statsData]);

  return (
    <SocialLayout>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <SocialSidebar
          userName={sidebarUser.name}
          userAvatar={sidebarUser.avatar}
          company={sidebarUser.company}
          role={sidebarUser.role}
          postsCount={sidebarUser.postsCount}
          connectionsCount={sidebarUser.connectionsCount}
          tabCounts={tabCounts}
          coverImageUrl=""
          activeConnectionTab={activeTab}
          onConnectionTabChange={setActiveTab}
        />
        <div className="flex-1">
          <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-white text-lg sm:text-xl font-semibold">{getTabTitle()}</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`Search ${activeTab === "connections" ? "connections" : activeTab === "suggested" ? "suggestions" : activeTab === "requests" ? "requests" : "pending requests"}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#D85D27] w-full sm:w-64"
                  />
                </div>
              </div>
            </div>

            {actionError && (
              <div className="border border-red-500/30 bg-red-500/10 text-red-200 rounded-xl p-4 text-sm mb-4">
                {actionError}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : isError || error ? (
              <div className="border border-red-500/30 bg-red-500/10 text-red-200 rounded-xl p-4 text-sm">
                {(error as any)?.data?.message || (error as any)?.message || "Failed to load connections"}
                {isError && "Please check your permissions or try refreshing the page."}
              </div>
            ) : currentConnections.length === 0 && !searchQuery ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-2">
                  {activeTab === "connections" && "No connections yet"}
                  {activeTab === "requests" && "No connection requests"}
                  {activeTab === "pending" && "No pending requests"}
                  {activeTab === "suggested" && "No suggested connections"}
                </div>
                <div className="text-gray-500 text-sm">
                  {activeTab === "connections" && "Start connecting with other members in your social network!"}
                  {activeTab === "requests" && "You have no incoming requests right now."}
                  {activeTab === "pending" && "You have no outgoing pending requests right now."}
                  {activeTab === "suggested" && "No suggestions available right now."}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
                  {currentConnections.map((connection) => (
                    activeTab === "connections" ? (
                      <MyConnectionsCard
                        key={connection.id}
                        name={connection.name}
                        avatar={connection.avatar}
                        title={connection.title}
                        company={connection.company}
                        mutualConnections={connection.mutualConnections}
                        onCardClick={() => navigate(`/social/profile/${connection.userId}`)}
                        onMessage={() => handleMessage(connection.userId)}
                        onRemove={() => setPendingRemoveConnectionId(connection.connectionId)}
                      />
                    ) : (
                      <ConnectionActionCard
                        key={connection.id}
                        name={connection.name}
                        avatar={connection.avatar}
                        title={connection.title}
                        company={connection.company}
                        mutualConnections={connection.mutualConnections}
                        type={activeTab}
                        onConnect={isMutating ? undefined : () => handleConnect(connection.userId)}
                        onAccept={isMutating ? undefined : () => handleAccept(connection.connectionId)}
                        onDecline={isMutating ? undefined : () => handleDecline(connection.connectionId)}
                        onCancel={isMutating ? undefined : () => handleCancel(connection.connectionId)}
                      />
                    )
                  ))}
                </div>

                {effectiveTotal > 0 && (
                  <div className="mt-6 flex items-center justify-end gap-2">
                    <span className="text-sm text-gray-400 mr-2">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page <= 1 || isLoading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded-md border border-gray-700 text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages || isLoading}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1 rounded-md border border-gray-700 text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
                    >
                      Next
                    </button>
                  </div>
                )}

                {currentConnections.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-lg mb-2">
                      {activeTab === "connections" && "No connections yet"}
                      {activeTab === "requests" && "No connection requests"}
                      {activeTab === "pending" && "No pending requests"}
                      {activeTab === "suggested" && "No suggested connections"}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {activeTab === "connections" && "Join a social chapter to connect with members!"}
                      {activeTab === "requests" && "You have no incoming requests right now."}
                      {activeTab === "pending" && "You have no outgoing pending requests right now."}
                      {activeTab === "suggested" && "No suggestions available right now."}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <ConfirmationDialog
        isOpen={pendingRemoveConnectionId !== null}
        onClose={() => setPendingRemoveConnectionId(null)}
        onConfirm={handleRemoveConnection}
        title="Remove this connection?"
        description="This member will be removed from your social connections. You can send a new request again later."
        confirmText={isRemoving ? "Removing..." : "Remove"}
        cancelText="Cancel"
        variant="danger"
      />
    </SocialLayout>
  );
}
