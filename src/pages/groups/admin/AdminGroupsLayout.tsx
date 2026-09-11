import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { useGetAllGroupsQuery, useApproveGroupMutation, useRejectGroupMutation } from "../../../services/edGroupsApi";
import type { EdGroup } from "../../../services/edGroupsApi";
import { formatStepwiseDescription, hasStepwiseFormat } from "../../../utils/descriptionFormatter";

interface AdminGroupsLayoutProps {
  children?: React.ReactNode;
  defaultTab?: string;
}

const tabs = [
  { id: "all", label: "All Groups" },
  { id: "requested", label: "Requested Groups" },
  { id: "rejected", label: "Rejected Groups" },
];

type GroupStatus = "approved" | "requested" | "rejected" | "pending_approval" | "pending";

type Group = {
  id: string;
  name: string;
  type: string;
  description: string;
  members: string;
  status: GroupStatus;
  created_at: string;
  updated_at: string;
  coverImageUrl: string;
};

const AdminGroupsLayout: React.FC<AdminGroupsLayoutProps> = ({ children, defaultTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    action: "accept" | "reject";
    group?: Group;
  }>({ open: false, action: "accept" });

  // Get active tab from URL query params or use default
  const getActiveTabFromUrl = () => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl && ['all', 'requested', 'rejected'].includes(tabFromUrl)) {
      return tabFromUrl;
    }
    return defaultTab || "all";
  };

  const [activeTab, setActiveTab] = useState(getActiveTabFromUrl());

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (activeTab !== (defaultTab || "all")) {
      params.set('tab', activeTab);
    } else {
      params.delete('tab');
    }
    const newSearch = params.toString();
    const newPath = newSearch ? `${location.pathname}?${newSearch}` : location.pathname;
    navigate(newPath, { replace: true });
  }, [activeTab, defaultTab, location.pathname, location.search, navigate]);

  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(getActiveTabFromUrl());
  }, [location.search, defaultTab]);

  // Fetch groups based on active tab
  const getStatusForTab = () => {
    switch (activeTab) {
      case "requested":
        return "PENDING_APPROVAL";
      case "rejected":
        return "REJECTED";
      case "all":
      default:
        return undefined; // All groups
    }
  };

  const currentStatus = getStatusForTab();
  
  const { data: allGroupsData } = useGetAllGroupsQuery({
    page: currentPage,
    limit: 12,
    status: currentStatus,
    search: searchQuery,
  });

  // Mutations for ‘approveGroup’ and ‘rejectGroup’
  const [approveGroup] = useApproveGroupMutation();
  const [rejectGroup] = useRejectGroupMutation();

  // Transform group data from API
  const transformedGroups = useMemo(() => {
    const groups = allGroupsData?.data || [];
    
    return groups.map((edGroup: EdGroup) => ({
      id: edGroup.id,
      name: edGroup.name || '',
      type: edGroup.privacy === "PUBLIC" ? "Public group" : "Private group",
      description: edGroup.description || '',
      members: `${edGroup.memberCount || 0} Members`,
      status: (edGroup.approvalStatus?.toLowerCase() || 'pending') as GroupStatus,
      created_at: edGroup.createdAt || '',
      updated_at: edGroup.updatedAt || '',
      coverImageUrl: edGroup.coverImageUrl || '',
    }));
  }, [allGroupsData]);

  // Use transformed groups directly (no client-side filtering)
  const filteredGroups = transformedGroups;

  // Get pagination data from API response
  const limit = allGroupsData?.limit || 12;
  const total = allGroupsData?.total || 0;
  const totalPages = allGroupsData?.totalPages || Math.ceil(total / limit);

  // Handle search
  const handleSearch = () => {
    setSearchQuery(search);
    setCurrentPage(1);
  };

  // Handle group approval
  const handleApproveGroup = async (groupId: string) => {
    try {
      await approveGroup({ groupId }).unwrap();
      setConfirmState({ open: false, action: "accept" });
    } catch (error) {
      console.error("Failed to approve group:", error);
    }
  };

  // Handle group rejection
  const handleRejectGroup = async (groupId: string, reason: string) => {
    try {
      await rejectGroup({ groupId, data: { reason } }).unwrap();
      setConfirmState({ open: false, action: "reject" });
    } catch (error) {
      console.error("Failed to reject group:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-100">Groups</h1>
          <button
            onClick={() => navigate("/admin/ed/groups/create")}
            className="h-10 rounded-md bg-[#D85D27] px-6 text-sm font-semibold text-white shadow hover:bg-orange-600"
          >
            Create Group
          </button>
        </header>

        <section className="mb-6">
          <div className="rounded-lg border border-white/10 bg-[#0f1419] p-1">
            <div className="grid grid-cols-3 gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-[#D85D27] text-white shadow-inner ring-1 ring-white/10"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-6 flex flex-col gap-4 md:flex-row">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-md border border-[#30363d] bg-gradient-to-r from-[#0d1117] to-[#1a1f2e] px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <button 
              onClick={handleSearch}
              className="h-10 rounded-md bg-[#D85D27] px-6 text-sm font-semibold text-white shadow hover:bg-orange-600"
            >
              Search
            </button>
          </div>
        </section>

        {filteredGroups.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-[#30363d] bg-[#161b22] py-16 text-sm text-gray-400">
            No groups found for this filter.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {filteredGroups.map((group) => (
              <article
                key={group.id}
                onClick={() =>
                  navigate(`/admin/groups/${group.id}`, {
                    state: { fromAdmin: true, groupStatus: group.status, returnTab: activeTab },
                  })
                }
                className="flex flex-col overflow-hidden rounded-xl border border-[#30363d] bg-[#161b22] shadow-md cursor-pointer hover:border-orange-500/60"
              >
                <div className="relative h-32">
                  {group.coverImageUrl ? (
                    <img 
                      src={group.coverImageUrl} 
                      alt={group.name}
                      className="h-32 w-full object-cover"
                      onError={(e) => {
                        // Fallback to letter if image fails to load
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="h-32 w-full flex items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800"><div class="w-16 h-16 rounded-full bg-gray-900/30 flex items-center justify-center mx-auto"><span class="text-gray-100 text-2xl font-bold">${group.name.charAt(0).toUpperCase()}</span></div></div>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="h-32 w-full flex items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800">
                      <div className="w-16 h-16 rounded-full bg-gray-900/30 flex items-center justify-center">
                        <span className="text-gray-100 text-2xl font-bold">
                          {group.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{group.type}</span>
                  </div>

                  <h2 className="text-sm font-semibold text-gray-100 line-clamp-2">
                    {group.name}
                  </h2>

                  <div className="mt-1 text-xs text-gray-400">
                    {(() => {
                      const descriptionLines = (hasStepwiseFormat(group.description)
                        ? formatStepwiseDescription(group.description)
                        : group.description
                      )
                        .split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean);

                      if (descriptionLines.length <= 1) {
                        return <span className="line-clamp-2">{group.description}</span>;
                      }

                      return (
                        <div className="space-y-1">
                          {descriptionLines.slice(0, 2).map((line, index) => (
                            <div key={index} className="flex gap-1.5 text-xs leading-tight">
                              <span className="mt-[5px] h-1 w-1 flex-shrink-0 rounded-full bg-gray-500" />
                              <span className="line-clamp-1">{line}</span>
                            </div>
                          ))}
                          {descriptionLines.length > 2 && (
                            <div className="text-xs text-gray-500">...</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3 text-xs text-gray-400">
                    {(group.status === "requested" || group.status === "pending_approval" || group.status === "pending") ? (
                      <div className="flex gap-2">
                        <button
                          className="rounded-full border border-orange-500 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmState({ open: true, action: "accept", group });
                          }}
                        >
                          Accept
                        </button>
                        <button
                          className="rounded-full px-3 py-1 text-xs font-semibold text-white bg-gray-400 hover:bg-gray-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmState({ open: true, action: "reject", group });
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : group.status === "rejected" ? (
                      <button
                        className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white"
                      >
                        Rejected
                      </button>
                    ) : (
                      <button
                        className="rounded-full border border-orange-500 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/groups/${group.id}`, {
                            state: { fromAdmin: true, groupStatus: group.status, returnTab: activeTab },
                          });
                        }}
                      >
                        View More
                      </button>
                    )}
                    <span>{group.members}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        
        {/* Enhanced Pagination Controls */}
        {allGroupsData && (
          <div className="mt-8 flex items-center justify-between">
            {/* Count on left side */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} groups</span>
            </div>
            
            {/* Page numbers on right side */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-md border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:border-orange-500/60 transition-colors"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-[#D85D27] text-white"
                          : "border border-[#30363d] bg-[#161b22] text-gray-300 hover:border-orange-500/60"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-md border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:border-orange-500/60 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {children}
      </main>
      <ConfirmationDialog
        isOpen={confirmState.open}
        actionType={confirmState.action || undefined}
        onClose={() => setConfirmState((prev) => ({ ...prev, open: false }))}
        onConfirm={() => {
          if (confirmState.group && confirmState.action) {
            if (confirmState.action === "accept") {
              handleApproveGroup(confirmState.group.id);
            } else if (confirmState.action === "reject") {
              // For rejection, we might need a reason - for now using a default reason
              handleRejectGroup(confirmState.group.id, "Group rejected by admin");
            }
          }
        }}
      />
    </div>
  );
};

export default AdminGroupsLayout;
