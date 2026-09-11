import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useProfessionalConnectionsSearchDirectoryQuery,
  useProfessionalConnectionRequestMutation,
} from "../../services/professional/professionalConnectionsApi";
import GradientContainer from "../common/GradientContainer";
import { ConnectionRequestModal } from "./ConnectionRequestModal";

export const ProfessionalSuggestions: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useProfessionalConnectionsSearchDirectoryQuery({
    page: 1,
    limit: 4,
  });
  const [requestConnection] = useProfessionalConnectionRequestMutation();

  const [modalState, setModalState] = useState<{ isOpen: boolean; userId: string; userName: string }>({
    isOpen: false,
    userId: "",
    userName: "",
  });
  const [requestedUserIds, setRequestedUserIds] = useState<Set<string>>(new Set());

  const suggestions = data?.data || [];

  const handleConnectClick = (userId: string, userName: string) => {
    if (requestedUserIds.has(userId)) {
      return;
    }
    setModalState({ isOpen: true, userId, userName });
  };

  const handleConnectSubmit = async (message: string) => {
    try {
      await requestConnection({ userId: modalState.userId, message }).unwrap();
      setRequestedUserIds((prev) => new Set(prev).add(modalState.userId));
      setModalState({ isOpen: false, userId: "", userName: "" });
    } catch (error) {
      console.error("Failed to send connection request:", error);
    }
  };

  if (isLoading) {
    return (
      <GradientContainer>
        <div className="rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold text-base">Suggest</h3>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-700"></div>
                  <div>
                    <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-7 w-20 bg-gray-700 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </GradientContainer>
    );
  }

  if (isError || suggestions.length === 0) {
    return (
      <GradientContainer>
        <div className="rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold text-base">Suggest</h3>
          </div>
          <p className="text-gray-400 text-sm text-center py-4">No suggestions available</p>
        </div>
      </GradientContainer>
    );
  }

  return (
    <>
      <ConnectionRequestModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, userId: "", userName: "" })}
        onSubmit={handleConnectSubmit}
        userName={modalState.userName}
      />
      <GradientContainer>
        <div className="rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-semibold text-base">Suggest</h3>
            <button
              onClick={() => navigate("/professional/connections?tab=suggested")}
              className="text-orange-500 text-sm hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {suggestions.map((person) => {
              const isRequested = requestedUserIds.has(person.id);
              const isPending = person.connection.status === "PENDING_SENT";
              const isConnected = person.connection.status === "ACCEPTED";
              const canConnect = person.connection.actionAllowed && !isRequested && !isPending && !isConnected;

              // Skip if already connected
              if (isConnected) return null;

              return (
                <div key={person.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center shrink-0">
                      {person.avatarUrl ? (
                        <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base font-bold text-white">{person.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{person.name}</div>
                      <div className="text-gray-400 text-xs truncate">
                        {person.headline || person.chapter || "Professional"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConnectClick(person.id, person.name)}
                    disabled={!canConnect}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ml-2 ${
                      !canConnect
                        ? "border border-gray-600 text-gray-500 cursor-not-allowed"
                        : "border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                    }`}
                  >
                    {isRequested || isPending ? "Pending" : "Connect"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </GradientContainer>
    </>
  );
};

export default ProfessionalSuggestions;
