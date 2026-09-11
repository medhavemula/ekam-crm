import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { ConnectionCard, ConnectionsTabs, ConnectionsActionsBar } from "../../components/connections";
import ComposeMessageModal from "../../components/modals/ComposeMessageModal";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { useConnectionsListQuery, useConnectionsStatsQuery, useConnectionRespondMutation, useConnectionWithdrawMutation, useConnectionRemoveMutation, useSyncChapterConnectionsMutation } from "../../services/connectionsApi";
import { useCreateDirectThreadMutation } from "../../services/professional/professionalMessagesApi";
import { useListBusinessCategoriesQuery } from "../../services/publicApi";
import type { ConnectionCardApi } from "../../services/connectionsApi";
import { useToast } from "../../components/toast/ToastProvider";
import { transformApiCategories, getCategoryLabel } from "../../utils/businessCategories";

type TabType = "connections" | "sent" | "received";

export default function ConnectionsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [userName] = useState("");
  // WEB-BUS-28: a notification links straight to the record, e.g.
  // /business/connections?tab=received&focus=<connectionId>. Open on that tab and
  // bring the row into view rather than dropping the member at the top of a list.
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const tabFromUrl = searchParams.get("tab") as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(
    tabFromUrl === "sent" || tabFromUrl === "received" || tabFromUrl === "connections"
      ? tabFromUrl
      : "connections",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [searchRefreshKey, setSearchRefreshKey] = useState(0);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | number | null>(null);
  const [removingId, setRemovingId] = useState<string | number | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [sort] = useState<"recency"|"strength"|"name">("recency");
  // Check authentication
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const typeParam = useMemo(() => {
    if (activeTab === "connections") return "my" as const;
    if (activeTab === "sent") return "sent" as const;
    return "received" as const;
  }, [activeTab]);

  const listQuery = useConnectionsListQuery(
    { type: typeParam, q: appliedSearchTerm || undefined, page, limit, sort, refreshKey: searchRefreshKey }
  );
  const statsQuery = useConnectionsStatsQuery(undefined, { refetchOnMountOrArgChange: true, refetchOnFocus: true, refetchOnReconnect: true });
  
  const { data: businessCategoriesResponse } = useListBusinessCategoriesQuery({ limit: 100 });
  const businessCategoryOptions = useMemo(() => 
    transformApiCategories(businessCategoriesResponse?.data || []), 
    [businessCategoriesResponse]
  );
  
  const [respond] = useConnectionRespondMutation();
  const [withdraw] = useConnectionWithdrawMutation();
  const [remove] = useConnectionRemoveMutation();
  const [syncChapterConnections] = useSyncChapterConnectionsMutation();

  const handleViewProfile = (id: string | number) => {
    const state = activeTab === "connections" 
      ? {} 
      : activeTab === "sent" 
      ? { from: 'sent-requests' }
      : { from: 'received-requests' };
    navigate(`/viewprofile/${String(id)}`, { state });
  };

  const [createDirectThread] = useCreateDirectThreadMutation();

  const handleSendMessage = async (id: string | number) => {
    try {
      const found = listQuery.data?.data?.find(
        (c: ConnectionCardApi) => String(c.user?.id) === String(id) || String(c.id) === String(id)
      );
      
      if (!found?.user?.id) {
        throw new Error('User not found');
      }

      // Create a direct thread with the user
      const response = await createDirectThread({
        peerId: found.user.id
      }).unwrap();

      // Navigate to the chat page with the thread ID using the correct route
      if (response?.data?._id) {
        // Navigate to the thread directly to ensure the conversation is opened
        navigate(`/business/my-feed/chat?threadId=${response.data._id}`, { 
          state: { shouldOpenThread: true, threadId: response.data._id }
        });
      } else {
        // If thread already exists, navigate to chat page which will find the existing thread
        navigate(`/business/my-feed/chat?peerId=${found.user.id}`, { 
          state: { shouldOpenThread: true, peerId: found.user.id }
        });
      }
    } catch (error) {
      console.error('Error creating chat thread:', error);
      showToast({ 
        title: 'Error', 
        description: 'Could not start chat. Please try again.', 
        kind: 'error' 
      });
    }
  };

  const handleAccept = async (id: string | number) => {
    try {
      await respond({ connectionId: String(id), action: 'ACCEPT' }).unwrap();
      // Follow the connection to where it went. Accepting removes the card from
      // Received Requests, and staying on that now-empty tab read as the request
      // having disappeared - the accepted connection was in My Connections all
      // along, with nothing on screen saying so.
      setActiveTab("connections");
      setPage(1);
      statsQuery.refetch();
      showToast({ title: "Connection accepted", description: "You are now connected — see My Connections.", kind: "success" });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to accept connection', e);
      showToast({ title: "Failed to accept", description: "Please try again.", kind: "error" });
    }
  };

  const handleReject = async (id: string | number) => {
    try {
      await respond({ connectionId: String(id), action: 'REJECT' }).unwrap();
      listQuery.refetch();
      statsQuery.refetch();
      showToast({ title: "Request rejected", description: "The connection request was rejected.", kind: "success" });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to reject connection', e);
      showToast({ title: "Failed to reject", description: "Please try again.", kind: "error" });
    }
  };

  const handleWithdraw = async (id: string | number) => {
    setWithdrawingId(id);
    setIsWithdrawDialogOpen(true);
  };

  const handleRemoveConnection = (id: string | number) => {
    setRemovingId(id);
    setIsRemoveDialogOpen(true);
  };

  const handleConfirmWithdraw = async () => {
    if (!withdrawingId) return;
    
    try {
      await withdraw({ connectionId: String(withdrawingId) }).unwrap();
      listQuery.refetch();
      statsQuery.refetch();
      showToast({ title: "Request withdrawn", description: "The connection request has been withdrawn.", kind: "success" });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to withdraw connection', e);
      showToast({ title: "Failed to withdraw", description: "Please try again.", kind: "error" });
    } finally {
      setIsWithdrawDialogOpen(false);
      setWithdrawingId(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removingId) return;

    try {
      await remove({ connectionId: String(removingId) }).unwrap();
      listQuery.refetch();
      statsQuery.refetch();
      showToast({
        title: "Connection removed",
        description: "This member has been removed from your connections.",
        kind: "success",
      });
    } catch (e) {
      console.error("Failed to remove connection", e);
      showToast({ title: "Failed to remove", description: "Please try again.", kind: "error" });
    } finally {
      setIsRemoveDialogOpen(false);
      setRemovingId(null);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleImmediateSearch = () => {
    setPage(1);
    setAppliedSearchTerm(searchTerm);
    setSearchRefreshKey((prev) => prev + 1);
  };

  const handleAddConnection = () => {
    navigate("/business/connections/add");
  };

  const handleSyncConnections = async () => {
    try {
      const result = await syncChapterConnections().unwrap();
      showToast({ 
        title: "Success", 
        description: result.message || "Connections synced successfully", 
        kind: "success" 
      });
      // Refresh the connections list and stats
      listQuery.refetch();
      statsQuery.refetch();
    } catch (error) {
      console.error('Failed to sync connections:', error);
      showToast({ 
        title: "Sync Failed", 
        description: "Failed to sync connections. Please try again.", 
        kind: "error" 
      });
    }
  };

  const apiCards = listQuery.data?.data || [];
  const counts = statsQuery.data?.data || { my: 0, sent: 0, received: 0, blocked: 0 };
  const total = listQuery.data?.total ?? 0;
  const currentPage = listQuery.data?.page ?? page;
  const pageSize = listQuery.data?.pageSize ?? limit;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toStatus = (meta?: { status?: string; badge?: any }): "connected" | "sent" | "received" | undefined => {
    if (!meta) return undefined;
    if (meta.status === "ACCEPTED") return "connected";
    if (meta.status === "PENDING" && meta.badge === "REQUEST_SENT") return "sent";
    if (meta.status === "PENDING" && meta.badge === "REQUEST_RECEIVED") return "received";
    return undefined;
  };

  return (
    <>
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader
          breadcrumbs={[
            { label: "Business", onClick: () => navigate("/dashboard") },
            { label: "Connections" },
          ]}
        />

        {/* Tab Buttons */}
        <ConnectionsTabs
          activeTab={activeTab}
          onChange={(tab)=>{ 
            setActiveTab(tab); 
            setPage(1); 
            setSearchTerm(""); 
            setAppliedSearchTerm("");
            setSearchRefreshKey(0);
          }}
          counts={{
            connections: counts.my,
            sent: counts.sent,
            received: counts.received,
          }}
        />

        {/* Search Bar and Add Connection Button */}
        <ConnectionsActionsBar
          searchTerm={searchTerm}
          onSearchTermChange={handleSearch}
          onSearch={handleImmediateSearch}
          onAddConnection={handleAddConnection}
          onSyncConnections={handleSyncConnections}
        />

        {/* Loading State */}
        {listQuery.isLoading && (
          <div className="text-center py-12 text-white">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4">Loading connections...</p>
          </div>
        )}

        {/* Error State */}
        {listQuery.error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
            Failed to load connections. Please try again.
          </div>
        )}

        {/* Connections Grid */}
        {!listQuery.isLoading && !listQuery.error && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {apiCards.map((connection: ConnectionCardApi) => (
            <ConnectionCard
              key={connection.id}
              id={connection.id}
              highlighted={!!focusId && String(connection.id) === String(focusId)}
              name={connection.user.name}
              title={getCategoryLabel(businessCategoryOptions, connection.user.headline || "")}
              company={connection.user.chapter || ""}
              avatarUrl={connection.user.avatarUrl}
              status={toStatus(connection.meta)}
              onViewProfile={() => handleViewProfile(connection.user.id)}
              onSendMessage={() => handleSendMessage(connection.user.id)}
              onAccept={handleAccept}
              onReject={handleReject}
              onWithdraw={handleWithdraw}
              onRemove={handleRemoveConnection}
            />
          ))}
          </div>
        )}

        {/* Empty State */}
        {!listQuery.isLoading && !listQuery.error && apiCards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No connections found</p>
          </div>
        )}

        {total > 0 && (
          <div className="mt-6 flex items-center justify-end gap-2">
            <span className="text-sm text-gray-400 mr-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage <= 1}
              onClick={() => {
                if (currentPage > 1) {
                  const newPage = currentPage - 1;
                  setPage(newPage);
                }
              }}
              className="px-3 py-1 rounded-md border border-gray-700 text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
            >
              Prev
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => {
                if (currentPage < totalPages) {
                  const newPage = currentPage + 1;
                  setPage(newPage);
                }
              }}
              className="px-3 py-1 rounded-md border border-gray-700 text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>

    {/* Compose Message Modal */}
    <ComposeMessageModal
      isOpen={isComposeOpen}
      onClose={() => setIsComposeOpen(false)}
      onSubmit={(_subject, _body) => {
        setIsComposeOpen(false);
      }}
      recipientName=""
    />

    {/* Withdraw Confirmation Dialog */}
    <ConfirmationDialog
      isOpen={isWithdrawDialogOpen}
      onClose={() => {
        setIsWithdrawDialogOpen(false);
        setWithdrawingId(null);
      }}
      onConfirm={handleConfirmWithdraw}
      actionType="withdraw"
      cancelText="Cancel"
    />

    <ConfirmationDialog
      isOpen={isRemoveDialogOpen}
      onClose={() => {
        setIsRemoveDialogOpen(false);
        setRemovingId(null);
      }}
      onConfirm={handleConfirmRemove}
      title="Remove this connection?"
      description="This member will be removed from your connections list. You can send a new request again later."
      confirmText="Remove"
      cancelText="Cancel"
      variant="danger"
    />
    </>
  );
}
