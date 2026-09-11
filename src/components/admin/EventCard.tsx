import React from "react";
import GradientContainer from "../common/GradientContainer";

export interface EventCardProps {
  id: number;
  title: string;
  category: string;
  date: string;
  startTime?: string;
  endTime?: string;
  description: string;
  imageUrl: string;
  onReadMore?: () => void;
  onEdit?: () => void;
  onJoin?: () => void;
  /** WEB-BUS-27: capacity state, so Join can say what it will actually do. */
  isFull?: boolean;
  youJoined?: boolean;
  spotsLeft?: number | null;
  joining?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  title,
  category,
  date,
  startTime,
  endTime,
  description,
  imageUrl,
  onReadMore,
  onEdit,
  onJoin,
  isFull,
  youJoined,
  spotsLeft,
  joining,
}) => {
  // Category badge colors
  const getCategoryColor = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes("training")) return "bg-orange-600";
    if (lower.includes("business")) return "bg-orange-500";
    return "bg-orange-600";
  };

  return (
    <GradientContainer className="h-full">
      <div className="rounded-2xl overflow-hidden h-full flex flex-col">
        {/* Image Section */}
        <div className="relative h-48 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#2B2B2B] to-[#111722] flex items-center justify-center">
              <span className="text-white/60 text-sm font-medium uppercase tracking-wider">
                {category || "Event"}
              </span>
            </div>
          )}
          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span
              className={`${getCategoryColor(
                category
              )} text-white text-xs font-medium px-3 py-1 rounded-full`}
            >
              {category}
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 flex-1 flex flex-col">
          {/* Title */}
          <h3 className="text-white font-semibold text-base mb-2 line-clamp-2">
            {title}
          </h3>

          {/* Date & Time */}
          <p className="text-gray-400 text-sm mb-3">
          {date}
            {startTime && endTime && ` : ${startTime} to ${endTime}`}
            {/* {startTime && !endTime && ` • ${startTime}`} */}
          </p>

          {/* Description */}
          <p className="text-gray-400 text-sm mb-4 line-clamp-3 flex-1">
            {description}
          </p>

          {/* Actions */}
          {(onReadMore || onEdit || onJoin) && (
            <div className="flex items-center gap-3 mt-auto">
              {onJoin && (
                <button
                  onClick={onJoin}
                  disabled={youJoined || isFull || joining}
                  title={
                    youJoined
                      ? "You are on the attendee list"
                      : isFull
                        ? "This event has reached its maximum attendance"
                        : undefined
                  }
                  className={
                    youJoined || isFull || joining
                      ? "px-5 py-2 rounded-md bg-gray-600 text-gray-300 text-sm font-medium cursor-not-allowed"
                      : "px-5 py-2 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white text-sm font-medium transition-colors"
                  }
                >
                  {joining ? "Joining..." : youJoined ? "Joined" : isFull ? "Full" : "Join"}
                </button>
              )}
              {onJoin && !youJoined && !isFull && typeof spotsLeft === "number" && (
                <span className="text-xs text-gray-400">{spotsLeft} left</span>
              )}
              {onReadMore && (
                <button
                  onClick={onReadMore}
                  className="px-5 py-2 rounded-md border border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white text-sm font-medium transition-colors"
                >
                  Read More
                </button>
              )}
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-5 py-2 rounded-md border border-gray-600 text-white hover:bg-gray-700 text-sm font-medium transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </GradientContainer>
  );
};

export default EventCard;
