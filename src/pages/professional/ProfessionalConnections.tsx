import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ConnectionRequestCard,
  ConnectionPendingCard,
  ConnectionSuggestionCard,
  ConnectionRequestModal,
} from "../../components/professional";
import ConnectionTabs from "../../components/professional/ConnectionTabs";
import { ModernConnectionCard } from "../../components/connections/ModernConnectionCard";
import { ProfessionalLayout } from "../../components/professional/ProfessionalLayout";
import { ToastContainer } from "../../components/common/ToastContainer";
import type { ToastMessage } from "../../components/common/ToastContainer";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import {
  useProfessionalConnectionsListQuery,
  useProfessionalConnectionsStatsQuery,
  useProfessionalConnectionRequestMutation,
  useProfessionalConnectionRespondMutation,
  useProfessionalConnectionWithdrawMutation,
  useProfessionalConnectionRemoveMutation,
} from "../../services/professional/professionalConnectionsApi";
import { useGetSuggestionsQuery } from "../../services/professional/rightSidebarApi";
import { useCreateDirectThreadMutation } from "../../services/professional/professionalMessagesApi";
import { useLazyGetProfileSummaryQuery } from "../../services/professional/professionalSidebarApi";
import { useAppSelector } from "../../app/store";

export default function ProfileConnections() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUserId = useAppSelector((state) => state.auth.user?._id);

  // Get initial tab from URL or default to "all"
  const tabFromUrl = searchParams.get("tab") as "all" | "requests" | "suggested" | "pending" | null;
  const initialTab =
    tabFromUrl && ["all", "requests", "suggested", "pending"].includes(tabFromUrl) ? tabFromUrl : "all";

  const [activeTab, setActiveTab] = useState<"all" | "requests" | "suggested" | "pending">(initialTab);
  // Pagination states
  const PAGE_SIZE = 12;
  const SUGGESTED_PAGE_SIZE = 9;
  const [allPage, setAllPage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [suggestedPage, setSuggestedPage] = useState(1);
  const [suggestedSearch, setSuggestedSearch] = useState("");

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [modalState, setModalState] = useState<{ isOpen: boolean; userId: string; userName: string }>({
    isOpen: false,
    userId: "",
    userName: "",
  });
  const [pendingRemoveConnectionId, setPendingRemoveConnectionId] = useState<string | null>(null);
  const [requestedUserIds, setRequestedUserIds] = useState<Set<string>>(new Set());

  // Fetch stats for tab counts
  const { data: statsData, refetch: refetchStats } = useProfessionalConnectionsStatsQuery();

  // Fetch all connections (type: "my")
  const { data: allConnectionsData, isLoading: isLoadingAll, refetch: refetchAllConnections } = useProfessionalConnectionsListQuery(
    { type: "my", page: allPage, limit: PAGE_SIZE },
    { skip: activeTab !== "all" },
  );

  // Fetch received requests (type: "received")
  const { data: requestsData, isLoading: isLoadingRequests, refetch: refetchRequests } = useProfessionalConnectionsListQuery(
    { type: "received", page: requestsPage, limit: PAGE_SIZE },
    { skip: activeTab !== "requests" },
  );

  // Fetch sent/pending requests (type: "sent")
  const { data: pendingData, isLoading: isLoadingPending } = useProfessionalConnectionsListQuery(
    { type: "sent", page: pendingPage, limit: PAGE_SIZE },
    { skip: activeTab !== "pending" },
  );

  // Fetch suggestions from dedicated suggestions API (max 25)
  const { data: suggestedData, isLoading: isLoadingSuggested, refetch: refetchSuggested } = useGetSuggestionsQuery(
    { limit: 25 },
    { skip: activeTab !== "suggested", refetchOnMountOrArgChange: true },
  );

  // Always keep suggested fresh when user switches to the tab
  useEffect(() => {
    if (activeTab === "suggested") {
      refetchSuggested?.();
    }
  }, [activeTab, refetchSuggested]);

  // Reset suggested page when search changes
  useEffect(() => {
    setSuggestedPage(1);
  }, [suggestedSearch]);

  // Client-side filter + paginate suggestions
  const filteredSuggestions = (suggestedData?.data || []).filter(
    (p) =>
      !requestedUserIds.has(p.id) &&
      (!suggestedSearch ||
        p.name.toLowerCase().includes(suggestedSearch.toLowerCase()) ||
        (p.company || "").toLowerCase().includes(suggestedSearch.toLowerCase()) ||
        (p.title || "").toLowerCase().includes(suggestedSearch.toLowerCase())),
  );
  const suggestedTotalPages = Math.max(1, Math.ceil(filteredSuggestions.length / SUGGESTED_PAGE_SIZE));
  const paginatedSuggestions = filteredSuggestions.slice(
    (suggestedPage - 1) * SUGGESTED_PAGE_SIZE,
    suggestedPage * SUGGESTED_PAGE_SIZE,
  );

  // Mutations
  const [respondToConnection] = useProfessionalConnectionRespondMutation();
  const [withdrawConnection] = useProfessionalConnectionWithdrawMutation();
  const [removeConnection] = useProfessionalConnectionRemoveMutation();
  const [requestConnection] = useProfessionalConnectionRequestMutation();
  const [createDirectThread] = useCreateDirectThreadMutation();
  const [refetchProfileSummary] = useLazyGetProfileSummaryQuery();

  // Toast helpers
  const addToast = (message: string, type: ToastMessage["type"]) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleAccept = async (id: string) => {
    try {
      await respondToConnection({ connectionId: id, action: "ACCEPT" }).unwrap();
      addToast("Connection request accepted successfully", "success");
      // Refresh all data to update counts
      refetchStats?.();
      refetchAllConnections?.();
      refetchRequests?.();
      // Manually refetch business profile data to ensure sidebar updates
      if (currentUserId) {
        refetchProfileSummary({ userId: currentUserId });
      }
      // Refresh suggested to remove newly-connected user from suggestions
      refetchSuggested?.();
    } catch (error) {
      console.error("Failed to accept connection:", error);
      addToast("Failed to accept connection request", "error");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await respondToConnection({ connectionId: id, action: "REJECT" }).unwrap();
      addToast("Connection request rejected", "info");
      // Refresh all data to update counts
      refetchStats?.();
      refetchRequests?.();
      // Manually refetch business profile data to ensure sidebar updates
      if (currentUserId) {
        refetchProfileSummary({ userId: currentUserId });
      }
      // Refresh suggested so rejected user doesn't linger in suggestions
      refetchSuggested?.();
    } catch (error) {
      console.error("Failed to reject connection:", error);
      addToast("Failed to reject connection request", "error");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await withdrawConnection({ connectionId: id }).unwrap();
      addToast("Connection request cancelled", "info");
      // Allow this user to reappear in suggested by removing from the local requested set
      setRequestedUserIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      // Refresh suggested so cancelled user doesn't linger in suggestions
      refetchSuggested?.();
    } catch (error) {
      console.error("Failed to cancel connection:", error);
      addToast("Failed to cancel connection request", "error");
    }
  };

  const handleRemoveConnection = async () => {
    if (!pendingRemoveConnectionId) return;
    try {
      await removeConnection({ connectionId: pendingRemoveConnectionId }).unwrap();
      addToast("Connection removed successfully", "success");
      setPendingRemoveConnectionId(null);
      refetchStats?.();
      refetchAllConnections?.();
      refetchSuggested?.();
      if (currentUserId) {
        refetchProfileSummary({ userId: currentUserId });
      }
    } catch (error) {
      console.error("Failed to remove connection:", error);
      addToast("Failed to remove connection", "error");
    }
  };

  const handleConnectClick = (userId: string, userName: string) => {
    // Check if already requested
    if (requestedUserIds.has(userId)) {
      addToast("Connection request already sent", "info");
      return;
    }
    setModalState({ isOpen: true, userId, userName });
  };

  const handleConnectSubmit = async (message: string) => {
    try {
      await requestConnection({ userId: modalState.userId, message }).unwrap();
      // Add to requested list for optimistic UI update
      setRequestedUserIds((prev) => new Set(prev).add(modalState.userId));
      addToast("Connection request sent successfully", "success");
      // Also refresh suggested to ensure the entry disappears
      refetchSuggested?.();
    } catch (error) {
      console.error("Failed to send connection request:", error);
      const errorMessage =
        (error as { data?: { message?: string } })?.data?.message || "Failed to send connection request";
      addToast(errorMessage, "error");
    }
  };

  const handleSendMessage = async (connectionId: string | number) => {
    try {
      // Find the connection to get the user ID
      const connection = allConnectionsData?.data?.find((conn) => conn.id === connectionId);
      if (!connection) {
        addToast("Connection not found", "error");
        return;
      }

      // Create or get existing thread
      const result = await createDirectThread({ peerId: connection.user.id }).unwrap();
      if (result.success && result.data) {
        // Navigate to messages page with the specific thread ID
        navigate(`/professional/messages/${result.data._id}`);
      }
    } catch (error) {
      console.error("Failed to create thread:", error);
      addToast("Failed to open message thread", "error");
    }
  };

  // Get breadcrumbs based on active tab
  const getBreadcrumbs = () => {
    const baseBreadcrumbs = [
      { label: "Professional", onClick: () => navigate("/professional/feed") },
      { label: "Connections", onClick: () => navigate("/professional/connections?tab=all") },
    ];

    switch (activeTab) {
      case "requests":
        return [...baseBreadcrumbs, { label: "Requests" }];
      case "suggested":
        return [...baseBreadcrumbs, { label: "Suggested" }];
      case "pending":
        return [...baseBreadcrumbs, { label: "Pending" }];
      default:
        return baseBreadcrumbs;
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} position="bottom-right" />
      <ConnectionRequestModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, userId: "", userName: "" })}
        onSubmit={handleConnectSubmit}
        userName={modalState.userName}
      />
      <ProfessionalLayout breadcrumbs={getBreadcrumbs()}>
        <div className="w-full">
          {/* Tabs - Responsive */}
          <div className="mb-4 lg:mb-6">
            <ConnectionTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={{
                all: statsData?.data?.my || 0,
                requests: statsData?.data?.received || 0,
                pending: statsData?.data?.sent || 0,
              }}
            />
          </div>

          {/* All Connections Tab */}
          {activeTab === "all" && (
            <>
              <div className="mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm">Connections</p>
                  <span className="px-2 py-0.5 bg-[#D85D27] text-white text-xs font-semibold rounded-sm">
                    {allConnectionsData?.total || 0}
                  </span>
                </div>
              </div>

              {isLoadingAll ? (
                <div className="text-center py-8 lg:py-12 text-gray-400">Loading connections...</div>
              ) : allConnectionsData?.data && allConnectionsData.data.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                  {allConnectionsData.data.map((connection) => (
                    <ModernConnectionCard
                      key={connection.id}
                      id={connection.id}
                      name={connection.user.name}
                      company={connection.user.company}
                      role={connection.user.role}
                      avatarUrl={connection.user.avatarUrl}
                      status="connected"
                      connectionCount={connection.user.connectionsCount || 0}
                      onViewProfile={() => navigate(`/professional/profile/${connection.user.id}`)}
                      onSendMessage={handleSendMessage}
                      onRemove={() => setPendingRemoveConnectionId(connection.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 lg:py-12 text-gray-400">No connections found</div>
              )}
              {/* Pagination for All */}
              {allConnectionsData?.total !== undefined && (
                <div className="flex items-center justify-end gap-3 mt-6 text-gray-300 text-sm">
                  <span>
                    Page {allPage} of {Math.max(1, Math.ceil((allConnectionsData?.total || 0) / PAGE_SIZE))}
                  </span>
                  <button
                    onClick={() => setAllPage((p) => Math.max(1, p - 1))}
                    disabled={allPage <= 1}
                    className={`px-3 py-1.5 rounded-md border ${
                      allPage <= 1 ? "opacity-50 cursor-not-allowed border-gray-700 text-gray-500" : "border-white/20 hover:bg-white/10"
                    }`}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() =>
                      setAllPage((p) =>
                        p < Math.max(1, Math.ceil((allConnectionsData?.total || 0) / PAGE_SIZE)) ? p + 1 : p,
                      )
                    }
                    disabled={allPage >= Math.max(1, Math.ceil((allConnectionsData?.total || 0) / PAGE_SIZE))}
                    className={`px-3 py-1.5 rounded-md border ${
                      allPage >= Math.max(1, Math.ceil((allConnectionsData?.total || 0) / PAGE_SIZE))
                        ? "opacity-50 cursor-not-allowed border-gray-700 text-gray-500"
                        : "border-white/20 hover:bg-white/10"
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <>
              <div className="mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm">Requests</p>
                  <span className="px-2 py-0.5 bg-[#D85D27] text-white text-xs font-semibold rounded-sm">
                    {requestsData?.total || 0}
                  </span>
                </div>
              </div>

              {isLoadingRequests ? (
                <div className="text-center py-8 lg:py-12 text-gray-400">Loading requests...</div>
              ) : requestsData?.data && requestsData.data.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                  {requestsData.data.map((request) => (
                    <ConnectionRequestCard
                      key={request.id}
                      id={request.id}
                      name={request.user.name}
                      company={request.user.company || ''}
                      role={request.user.role || ''}
                      avatarUrl={request.user.avatarUrl}
                      backgroundUrl={undefined}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onViewProfile={() => navigate(`/professional/profile/${request.user.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 lg:py-12 text-gray-400">No connection requests</div>
              )}
              {/* Pagination for Requests */}
              {requestsData?.total !== undefined && (
                <div className="flex items-center justify-end gap-3 mt-6 text-gray-300 text-sm">
                  <span>
                    Page {requestsPage} of {Math.max(1, Math.ceil((requestsData?.total || 0) / PAGE_SIZE))}
                  </span>
                  <button
                    onClick={() => setRequestsPage((p) => Math.max(1, p - 1))}
                    disabled={requestsPage <= 1}
                    className={`px-3 py-1.5 rounded-md border ${
                      requestsPage <= 1 ? "opacity-50 cursor-not-allowed border-gray-700 text-gray-500" : "border-white/20 hover:bg-white/10"
                    }`}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() =>
                      setRequestsPage((p) =>
                        p < Math.max(1, Math.ceil((requestsData?.total || 0) / PAGE_SIZE)) ? p + 1 : p,
                      )
                    }
                    disabled={requestsPage >= Math.max(1, Math.ceil((requestsData?.total || 0) / PAGE_SIZE))}
                    className={`px-3 py-1.5 rounded-md border ${
                      requestsPage >= Math.max(1, Math.ceil((requestsData?.total || 0) / PAGE_SIZE))
                        ? "opacity-50 cursor-not-allowed border-gray-700 text-gray-500"
                        : "border-white/20 hover:bg-white/10"
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {/* Suggested Tab */}
          {activeTab === "suggested" && (
            <>
              <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm">People you may know</p>
                  <span className="px-2 py-0.5 bg-[#D85D27] text-white text-xs font-semibold rounded-sm">
                    {filteredSuggestions.length}
                  </span>
                </div>
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search suggestions..."
                    value={suggestedSearch}
                    onChange={(e) => setSuggestedSearch(e.target.value)}
                    className="w-full px-3 py-2 pl-9 bg-[#1a1f26] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
                  />
                  <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" strokeWidth="2" /><path d="m21 21-4.35-4.35" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              {isLoadingSuggested ? (
                <div className="text-center py-8 lg:py-12 text-gray-400">Loading suggestions...</div>
              ) : paginatedSuggestions.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                    {paginatedSuggestions.map((person) => (
                      <ConnectionSuggestionCard
                        key={person.id}
                        id={person.id}
                        name={person.name}
                        company={person.company || ""}
                        role={person.title || ""}
                        avatarUrl={person.photoUrlDecrypted || person.photoUrl}
                        backgroundUrl={undefined}
                        onConnect={(userId) => handleConnectClick(userId, person.name)}
                        onViewProfile={(id) => navigate(`/professional/profile/${id}`)}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-3 mt-6 text-gray-300 text-sm">
                    <span>Page {suggestedPage} of {suggestedTotalPages}</span>
                    <button
                      onClick={() => setSuggestedPage((p) => Math.max(1, p - 1))}
                      disabled={suggestedPage <= 1}
                      className={`px-3 py-1.5 rounded-md border ${suggestedPage <= 1 ? "opacity-50 cursor-not-allowed border-gray-700 text-gray-500" : "border-white/20 hover:bg-white/10"}`}
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setSuggestedPage((p) => Math.min(suggestedTotalPages, p + 1))}
                      disabled={suggestedPage >= suggestedTotalPages}
                      className={`px-3 py-1.5 rounded-md border ${suggestedPage >= suggestedTotalPages ? "opacity-50 cursor-not-allowed border-gray-700 text-gray-500" : "border-white/20 hover:bg-white/10"}`}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 lg:py-12 text-gray-400">
                  {suggestedSearch ? "No results found" : "No suggestions available"}
                </div>
              )}
            </>
          )}

          {/* Pending Tab */}
          {activeTab === "pending" && (
            <>
              <div className="mb-3 lg:mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm">Pending</p>
                  <span className="px-2 py-0.5 bg-[#D85D27] text-white text-xs font-semibold rounded-sm">
                    {pendingData?.total || 0}
                  </span>
                </div>
              </div>

              {isLoadingPending ? (
                <div className="text-center py-8 lg:py-12 text-gray-400">Loading pending requests...</div>
              ) : pendingData?.data && pendingData.data.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                  {pendingData.data.map((request) => (
                    <ConnectionPendingCard
                      key={request.id}
                      id={request.id}
                      name={request.user.name}
                      company={request.user.company || ''}
                      role={request.user.role || ''}
                      avatarUrl={request.user.avatarUrl}
                      backgroundUrl={undefined}
                      onCancel={handleCancel}
                      onViewProfile={() => navigate(`/professional/profile/${request.user.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 lg:py-12 text-gray-400">No pending requests</div>
              )}
              {/* Pagination for Pending */}
              {pendingData?.total !== undefined && (
                <div className="flex items-center justify-end gap-3 mt-6 text-gray-300 text-sm">
                  <span>
                    Page {pendingPage} of {Math.max(1, Math.ceil((pendingData?.total || 0) / PAGE_SIZE))}
                  </span>
                  <button
                    onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                    disabled={pendingPage <= 1}
                    className={`px-3 py-1.5 rounded-md border ${
                      pendingPage <= 1 ? "opacity-50 cursor-not-allowed border-gray-700 text-gray-500" : "border-white/20 hover:bg-white/10"
                    }`}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() =>
                      setPendingPage((p) =>
                        p < Math.max(1, Math.ceil((pendingData?.total || 0) / PAGE_SIZE)) ? p + 1 : p,
                      )
                    }
                    disabled={pendingPage >= Math.max(1, Math.ceil((pendingData?.total || 0) / PAGE_SIZE))}
                    className={`px-3 py-1.5 rounded-md border ${
                      pendingPage >= Math.max(1, Math.ceil((pendingData?.total || 0) / PAGE_SIZE))
                        ? "opacity-50 cursor-not-allowed border-gray-700 text-gray-500"
                        : "border-white/20 hover:bg-white/10"
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </ProfessionalLayout>
      <ConfirmationDialog
        isOpen={pendingRemoveConnectionId !== null}
        onClose={() => setPendingRemoveConnectionId(null)}
        onConfirm={handleRemoveConnection}
        title="Remove this connection?"
        description="This member will be removed from your professional connections. You can send a new request again later."
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
