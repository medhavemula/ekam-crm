import React from "react";
import { useNavigate } from "react-router-dom";
import GradientContainer from "../common/GradientContainer";

export interface AdminEventCardProps {
  id: string;
  title: string;
  date: string;
  chapter: string;
  location: string;
  description: string;
  category: string;
  imageUrl?: string;
  startsAt?: string;
  endsAt?: string;
  badge?: string;
  chapterId?: string;
  regionId?: string;
  status?: string;
  approvalStatus?: string;
  joinedCount?: string;
  showJoinedCount?: boolean;
  pageType: "my-events" | "upcoming-events" | "event-requests";
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onJoin?: (id: string) => void;
  onViewMembers?: (id: string) => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
}

export const AdminEventCard: React.FC<AdminEventCardProps> = ({
  id,
  title,
  date,
  chapter,
  location,
  description,
  category,
  imageUrl,
  startsAt,
  endsAt,
  badge,
  chapterId,
  regionId,
  status,
  approvalStatus,
  joinedCount = "",
  showJoinedCount = false,
  pageType,
  onAccept,
  onReject,
  onJoin,
  onViewMembers,
  isAccepting = false,
  isRejecting = false,
}) => {
  const navigate = useNavigate();

  const getCategoryColor = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes("donation") || lower.includes("fundraiser")) return "bg-[#D85D27]";
    if (lower.includes("meeting")) return "bg-[#D85D27]";
    return "bg-[#D85D27]";
  };

  const getStatusBadge = (status: "pending" | "accepted" | "rejected") => {
    switch (status) {
      case "accepted":
        return <span className="inline-block px-3 py-1 rounded-full bg-green-600 text-white text-xs font-medium">Accepted</span>;
      case "rejected":
        return <span className="inline-block px-3 py-1 rounded-full bg-red-600 text-white text-xs font-medium">Rejected</span>;
      default:
        return null;
    }
  };

  const handleCardClick = () => {
    navigate(`/social/admin/event-details/${id}`, {
      state: { pageType }
    });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    console.log("AdminEventCard - Editing event with data:", {
      id,
      title,
      date,
      chapter,
      location,
      description,
      category,
      imageUrl,
      startsAt,
      endsAt,
      badge,
      chapterId,
      regionId,
      status,
      approvalStatus
    });
    
    navigate(`/social/admin/edit-event/${id}`, {
      state: {
        eventData: {
          id,
          title,
          date,
          chapter,
          location,
          description,
          category,
          imageUrl,
          startsAt,
          endsAt,
          badge,
          chapterId,
          regionId,
          status,
          approvalStatus
        }
      }
    });
  };

  const handleViewMore = () => {
    navigate(`/social/admin/event-details/${id}`);
  };

  const renderActions = () => {
    switch (pageType) {
      case "my-events":
        return (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleViewMore}
              className="min-w-[106px] rounded-lg border border-[#D85D27] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              View More
            </button>
            <button
              onClick={handleEdit}
              className="min-w-[72px] rounded-lg border border-[#D85D27] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Edit
            </button>
          </div>
        );

      case "upcoming-events":
        return (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleViewMore}
              className="px-4 py-1.5 rounded-lg border border-orange-500 text-white text-sm hover:bg-white/10 transition-colors"
            >
              View More
            </button>
            <button
              onClick={() => onJoin?.(id)}
              className="px-4 py-1.5 rounded-lg border border-orange-500 text-white text-sm hover:bg-white/10 transition-colors"
            >
              Join Now
            </button>
            <button
              onClick={() => onViewMembers?.(id)}
              className="px-4 py-1.5 rounded-lg border border-orange-500 text-white text-sm hover:bg-white/10 transition-colors"
            >
              View Members
            </button>
            {showJoinedCount && (
              <span className="text-gray-400 text-xs">{joinedCount}</span>
            )}
          </div>
        );

      case "event-requests":
        if (status === "pending") {
          return (
            <div className="flex gap-2">
              <button
                onClick={() => onAccept?.(id)}
                disabled={isAccepting || isRejecting}
                className="px-4 py-1.5 rounded-lg border border-orange-500 text-white text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => onReject?.(id)}
                disabled={isAccepting || isRejecting}
                className="px-4 py-1.5 rounded-lg bg-gray-600 text-white text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          );
        } else if (status === "accepted" || status === "rejected") {
          return getStatusBadge(status as "accepted" | "rejected");
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <GradientContainer className="h-full overflow-hidden rounded-[24px] border border-white/25 bg-[#1E232A] p-0 transition-opacity hover:opacity-95">
      <div className="flex h-full flex-col">
        <div className="relative h-[310px] flex-shrink-0 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#2B2B2B] to-[#111722] flex items-center justify-center">
              <span className="text-white/60 text-sm font-medium uppercase tracking-wider">
                {category || "Event"}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          <span
            className={`absolute bottom-4 left-4 rounded-full px-5 py-2 text-sm font-medium text-white shadow-lg ${getCategoryColor(
              category,
            )}`}
          >
            {category}
          </span>
        </div>

        <div className="flex flex-1 flex-col bg-[#242628] px-4 pb-4 pt-3" onClick={handleCardClick}>
          <h3 className="mb-1 line-clamp-1 text-[20px] font-semibold leading-tight text-white">{title}</h3>
          <p className="mb-1 text-sm leading-5 text-white/90">{date}</p>
          <p className="text-sm leading-5 text-white/90">{chapter}</p>
          <p className="mb-3 text-sm leading-5 text-white/90">{location}</p>
          <p className="min-h-[66px] line-clamp-3 text-sm leading-6 text-white/85">{description}</p>

          <div className="mt-auto pt-4" onClick={(e) => e.stopPropagation()}>
            {renderActions()}
          </div>
        </div>
      </div>
    </GradientContainer>
  );
};

export default AdminEventCard;
