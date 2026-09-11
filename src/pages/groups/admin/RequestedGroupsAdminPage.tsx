import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { useGetPendingGroupsQuery, useApproveGroupMutation, useRejectGroupMutation } from "../../../services/edGroupsApi";
import type { EdGroup } from "../../../services/edGroupsApi";
import { formatStepwiseDescription, hasStepwiseFormat } from "../../../utils/descriptionFormatter";

const RequestedGroupsAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    action: "accept" | "reject";
    group?: EdGroup;
  }>({ open: false, action: "accept" });

  // Fetch pending groups from ED API
  const { data: pendingGroupsData, isLoading, error } = useGetPendingGroupsQuery({});

  // Mutations for approve/reject
  const [approveGroup] = useApproveGroupMutation();
  const [rejectGroup] = useRejectGroupMutation();

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

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!pendingGroupsData?.data) return [];
    return pendingGroupsData.data.filter((group: EdGroup) => {
      const matchesSearch = search === "" || (group.name?.toLowerCase().includes(search.toLowerCase()));
      return matchesSearch;
    });
  }, [pendingGroupsData, search]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="text-center py-20">
            <div className="text-gray-400 text-lg">Loading pending groups...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="text-center py-20">
            <div className="text-red-400 text-lg">Error loading pending groups</div>
            <button 
              className="mt-4 px-4 py-2 rounded-full border border-orange-600 text-white hover:bg-orange-600/10"
              onClick={() => navigate("/admin/groups")}
            >
              Back to Groups
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-100">Requested Groups</h1>
          <button 
            onClick={() => navigate("/admin/groups")}
            className="px-4 py-2 rounded-full border border-orange-600 text-white hover:bg-orange-600/10"
          >
            Back to All Groups
          </button>
        </header>

        {/* Search */}
        <section className="mb-6 flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </section>

        {/* Groups List */}
        {filteredGroups.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-[#30363d] bg-[#161b22] py-16 text-sm text-gray-400">
            {search ? "No groups found matching your search." : "No pending groups found."}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {filteredGroups.map((group: EdGroup) => (
              <article
                key={group.id}
                onClick={() =>
                  navigate(`/admin/groups/${group.id}`, {
                    state: { fromAdmin: true, groupStatus: group.approvalStatus },
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
                    <span>{group.privacy === "PUBLIC" ? "Public group" : "Private group"}</span>
                    <span className="text-yellow-400">{group.approvalStatus}</span>
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
                        return <span className="line-clamp-3">{group.description}</span>;
                      }

                      return (
                        <div className="space-y-1">
                          {descriptionLines.slice(0, 3).map((line, index) => (
                            <div key={index} className="flex gap-1.5 text-xs leading-tight">
                              <span className="mt-[5px] h-1 w-1 flex-shrink-0 rounded-full bg-gray-500" />
                              <span className="line-clamp-1">{line}</span>
                            </div>
                          ))}
                          {descriptionLines.length > 3 && (
                            <div className="text-xs text-gray-500">...</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3 text-xs text-gray-400">
                    <div className="flex gap-2">
                      <button
                        className="rounded-full border border-green-500 px-3 py-1 text-xs font-semibold text-green-400 hover:bg-green-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmState({ open: true, action: "accept", group });
                        }}
                      >
                        Accept
                      </button>
                      <button
                        className="rounded-full border border-red-500 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmState({ open: true, action: "reject", group });
                        }}
                      >
                        Reject
                      </button>
                    </div>
                    <span>{group.memberCount} Members</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={confirmState.open}
          actionType={confirmState.action || undefined}
          onClose={() => setConfirmState((prev) => ({ ...prev, open: false }))}
          onConfirm={() => {
            if (confirmState.group && confirmState.action) {
              if (confirmState.action === "accept") {
                handleApproveGroup(confirmState.group.id);
              } else if (confirmState.action === "reject") {
                handleRejectGroup(confirmState.group.id, "Group rejected by admin");
              }
            }
          }}
        />
      </main>
    </div>
  );
};

export default RequestedGroupsAdminPage;
