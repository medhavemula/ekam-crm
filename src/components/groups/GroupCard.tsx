import React from "react";
import { useNavigate } from "react-router-dom";
import GradientContainer from "../common/GradientContainer";
import lockIcon from "../../assets/icons/lock.svg";
import publicIcon from "../../assets/icons/public.svg";
import { useRequestJoinGroupMutation, useJoinGroupMutation } from "../../services/groupsApi";
import { formatStepwiseDescription, hasStepwiseFormat } from "../../utils/descriptionFormatter";

export interface GroupCardProps {
  id: string;
  title: string;
  description: string;
  cover?: string;
  members?: number;
  isPrivate?: boolean;
  privacy?: 'PUBLIC' | 'PRIVATE';
  status?: 'none' | 'pending' | 'requested' | 'joined' | 'pending_requested' | 'rejected' | 'pending_owner' | 'invited';
  role?: 'OWNER' | 'ADMIN' | 'MEMBER';
  isSuggestion?: boolean;
  onJoinRequest?: (groupId: string, privacy?: 'PUBLIC' | 'PRIVATE') => void;
  onCancelRequest?: (groupId: string) => void;
  isJoining?: boolean;
  isCancelling?: boolean;
}

const getDescriptionLines = (description?: string) =>
  (hasStepwiseFormat(description) ? formatStepwiseDescription(description) : description || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);


const GroupCard: React.FC<GroupCardProps> = ({
  id,
  title,
  description,
  cover,
  members,
  isPrivate,
  privacy,
  status = 'none',
  role,
  isSuggestion = false,
  onJoinRequest,
  onCancelRequest,
  isJoining = false,
  isCancelling = false,
}) => {
  const navigate = useNavigate();
  const [requestJoinGroup, { isLoading: isRequesting }] = useRequestJoinGroupMutation();
  const [joinGroup, { isLoading: isJoiningGroup }] = useJoinGroupMutation();
  const descriptionLines = getDescriptionLines(description);
  
  const handleCardClick = () => {
    // Prevent navigation for rejected groups
    if (status === 'rejected') {
      return;
    }
    
    // Allow navigation for all other groups
    navigate(`/groups/${id}`, { state: { fromSuggestions: isSuggestion } });
  };

  const handleJoinGroup = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Use the callback if provided, otherwise use the internal mutation
    if (onJoinRequest) {
      const groupPrivacy = privacy || (isPrivate ? 'PRIVATE' : 'PUBLIC');
      onJoinRequest(id, groupPrivacy);
    } else {
      try {
        const groupPrivacy = privacy || (isPrivate ? 'PRIVATE' : 'PUBLIC');
        if (groupPrivacy === 'PRIVATE') {
          await requestJoinGroup(id).unwrap();
        } else {
          await joinGroup(id).unwrap();
        }
      } catch (error) {
        console.error("Failed to join group:", error);
      }
    }
  };

  const handleCancelRequest = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCancelRequest?.(id);
  };
  
  return (
    <GradientContainer>
      <div 
        className={`h-full rounded-xl overflow-hidden transition-colors flex flex-col ${
          (isPrivate && !isSuggestion && status !== 'joined' && status !== 'pending' && status !== 'none') ||
          status === 'rejected'
            ? 'cursor-not-allowed' 
            : 'cursor-pointer'
        }`}
        onClick={handleCardClick}
      >
        <div className="h-40 bg-gray-700/40 flex-shrink-0 relative">
          {role === 'OWNER' && status !== 'rejected' && (
            <button
              className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full text-sm border border-orange-500 text-white hover:bg-orange-500/10 transition bg-gray-900/80"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/groups/${id}/edit`);
              }}
            >
              Edit
            </button>
          )}
          {cover ? (
            <img src={cover} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700/40">
              <div className="w-20 h-20 rounded-full bg-gray-600/50 flex items-center justify-center">
                <span className="text-gray-300 text-3xl font-bold">
                  {title.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h4 className="text-white font-semibold mb-1 line-clamp-1">{title}</h4>
          <div className="text-gray-400 text-sm flex-grow">
            {descriptionLines.length > 1 ? (
              <div className="space-y-1">
                {descriptionLines.slice(0, 2).map((line, index) => (
                  <div key={index} className="flex gap-1.5 text-sm leading-tight">
                    <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-gray-500" />
                    <span className="line-clamp-1">{line}</span>
                  </div>
                ))}
                {descriptionLines.length > 2 && (
                  <div className="text-sm text-gray-500">...</div>
                )}
              </div>
            ) : (
              <span className="line-clamp-2">{description}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 mt-auto">
            {isPrivate ? (
              <img src={lockIcon} alt="Private" className="w-3 h-3" />
            ) : (
              <img src={publicIcon} alt="Public" className="w-3 h-3" />
            )}
            <span>{isPrivate ? "Private Group" : "Public Group"}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSuggestion ? (
                status === 'pending_requested' && onCancelRequest ? (
                  <button
                    className="px-3 py-1.5 rounded-full text-xs bg-gray-600 text-white hover:bg-gray-700 transition disabled:opacity-50"
                    onClick={handleCancelRequest}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                ) : (
                  <button
                    className={`px-3 py-1.5 rounded-full text-xs ${
                      status === 'pending_requested' 
                        ? 'bg-[#D85D27] text-white cursor-not-allowed' 
                        : 'border border-orange-500 text-gray-200 hover:bg-white/10'
                    } transition disabled:opacity-50`}
                    onClick={handleJoinGroup}
                    disabled={isJoining || isRequesting || isJoiningGroup || status === 'pending_requested'}
                  >
                    {status === 'pending_requested' 
                      ? 'Pending Request' 
                      : isJoining || isRequesting || isJoiningGroup 
                        ? 'Joining...' 
                        : (isPrivate ? 'Request to Join' : 'Join Now')
                    }
                  </button>
                )
              ) : (
                <>
                  {status === 'requested' && onCancelRequest ? (
                    <button
                      className="px-3 py-1.5 rounded-full text-xs bg-gray-600 text-white hover:bg-gray-700 transition disabled:opacity-50"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCancelRequest(id);
                      }}
                      disabled={isCancelling}
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel Request'}
                    </button>
                  ) : (
                    <button
                      className={`px-3 py-1.5 rounded-full text-xs ${
                        status === 'pending' 
                          ? 'bg-[#D85D27] text-white cursor-not-allowed' 
                          : status === 'rejected'
                          ? 'bg-red-500 text-white cursor-not-allowed'
                          : status === 'pending_owner'
                          ? 'bg-[#D85D27] text-white cursor-not-allowed'
                          : status === 'invited'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : status === 'requested'
                          ? 'bg-[#D85D27] text-white hover:bg-orange-700'
                          : 'border border-orange-500 text-gray-200 hover:bg-white/10'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Handle requested status - call join API
                        if (status === 'requested') {
                          onJoinRequest?.(id);
                          return;
                        }
                        
                        // Handle invited status - accept the invite
                        if (status === 'invited') {
                          handleJoinGroup(e);
                          return;
                        }
                        
                        // For suggestion page: only allow public groups to navigate
                        if (isSuggestion && isPrivate) {
                          return;
                        }
                        
                        // Don't allow navigation for rejected groups
                        if (status === 'rejected') {
                          return;
                        }
                        
                        // For private groups from main page, allow navigation if user has joined, is pending, or has no status
                        if (isPrivate && !['joined', 'pending', 'none', 'pending_requested', 'pending_owner'].includes(status)) {
                          return;
                        }
                        // For public groups, allow navigation for any status (including pending)
                        navigate(`/groups/${id}`, { state: { fromSuggestions: isSuggestion } });
                      }}
                    >
                      {status === 'pending' ? 'Pending Approval' : 
                       status === 'rejected' ? 'Rejected' :
                       status === 'pending_owner' ? 'Pending Approval' : 
                       status === 'invited' ? 'Accept Invite' :
                       status === 'requested' ? 'Join Now' :
                       isSuggestion ? (isPrivate ? 'Request to Join' : 'Join Now') :
                       'View More'}
                    </button>
                  )}
                </>
              )}
            </div>
            {typeof members === "number" && (
              <span className="text-xs text-gray-500">{members} Members</span>
            )}
          </div>
        </div>
      </div>
    </GradientContainer>
  );
};

export default GroupCard;
