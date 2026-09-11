import { useNavigate } from "react-router-dom";
import GradientContainer from "../common/GradientContainer";
import { useAppSelector } from "../../app/store";

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  chapter: string;
  location: string;
  description: string;
  category: string;
  status: "joined" | "ongoing" | "upcoming" | "pending" | "completed" | "approved" | "rejected";
  categoryBadgeColor?: string;
  imageUrl?: string;
  joinedCountText?: string;
  showJoinedCount?: boolean;
  rightActionLabel?: string;
  onRightActionClick?: (e: React.MouseEvent) => void;
  rightActionPlacement?: "header" | "content";
  onCardClick?: () => void;
  onButtonClick?: (e: React.MouseEvent) => void;
  source?: 'my-events' | 'upcoming-events';
}

export default function EventCard({
  id,
  title,
  date,
  time,
  chapter,
  location,
  description,
  category,
  status,
  categoryBadgeColor = "bg-orange-500",
  imageUrl,
  joinedCountText = "1k+ Joined",
  showJoinedCount = true,
  rightActionLabel,
  onRightActionClick,
  rightActionPlacement = "header",
  onCardClick,
  onButtonClick,
  source = 'my-events',
}: EventCardProps) {
  const navigate = useNavigate();
  
  // Check if user is admin
  const userRole = useAppSelector((state) => state.auth.role);
  const isAdmin = userRole && ['SUPER_ADMIN', 'FRANCHISE_PARTNER', 'EXECUTIVE_DIRECTOR', 'SOCIAL_PARTNER'].includes(userRole);

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick();
      return;
    }
    
    // Determine the source of navigation
    const navSource = source || 'my-events';
    const eventData = {
      id,
      title,
      date,
      time,
      chapter,
      location,
      description,
      category,
      status,
      source: navSource
    };

    // Determine the correct route based on user role
    const baseRoute = isAdmin ? '/social/admin' : '/social';

    navigate(`${baseRoute}/event-details/${id}`, {
      state: {
        from: navSource,
        event: eventData
      }
    });
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onButtonClick) {
      onButtonClick(e);
    }
  };

  const fallbackGradient = () => {
    const c = category.toLowerCase();
    if (c.includes("donation") || c.includes("charity") || c.includes("fundraiser"))
      return "from-[#D85D27] to-[#7a3010]";
    if (c.includes("meeting")) return "from-blue-600 to-blue-900";
    if (c.includes("workshop")) return "from-purple-600 to-purple-900";
    return "from-[#2B2B2B] to-[#111722]";
  };

  const badgeBase =
    "inline-flex items-center justify-center px-5 py-1.5 rounded-full text-sm font-medium";

  const getStatusButton = () => {
    switch (status) {
      case "joined":
        return (
          <span className={`${badgeBase} bg-[#D85D27] text-white`}>Joined</span>
        );
      case "ongoing":
        return (
          <span className={`${badgeBase} bg-[#D85D27] text-white`}>Ongoing</span>
        );
      case "pending":
        return (
          <span className={`${badgeBase} bg-[#D85D27] text-white`}>Pending</span>
        );
      case "approved":
        return (
          <span className={`${badgeBase} bg-emerald-500 text-white`}>Approved</span>
        );
      case "upcoming":
        return (
          <button
            onClick={handleButtonClick}
            className={`${badgeBase} bg-[#D85D27] text-white hover:bg-[#C24F20] transition-colors`}
          >
            Join Now
          </button>
        );
      case "completed":
        return (
          <span className={`${badgeBase} bg-gray-500/70 text-white`}>Completed</span>
        );
      case "rejected":
        return (
          <span className={`${badgeBase} bg-red-600 text-white`}>Rejected</span>
        );
      default:
        return null;
    }
  };

  const categoryColor = () => {
    const c = category.toLowerCase();
    if (c.includes("donation") || c.includes("charity") || c.includes("fundraiser")) return "bg-orange-500";
    if (c.includes("meeting")) return "bg-blue-600";
    if (c.includes("workshop")) return "bg-purple-600";
    return categoryBadgeColor;
  };

  return (
    <GradientContainer className="overflow-hidden h-full cursor-pointer hover:opacity-90 transition-opacity">
      <div className="h-full flex flex-col" onClick={handleCardClick}>
        {/* Image with category badge and optional edit button */}
        <div className="relative h-48 flex-shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${fallbackGradient()} flex items-center justify-center`}
            >
              <span className="text-white/70 text-sm font-medium uppercase tracking-wider">
                {category || "Event"}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Category badge */}
          <span className={`absolute bottom-3 left-3 ${categoryColor()} text-white text-xs font-medium px-3 py-1 rounded-full`}>
            {category}
          </span>
          
          {/* Optional right action in header */}
          {rightActionLabel && rightActionPlacement === "header" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRightActionClick?.(e);
              }}
              className="absolute top-3 right-3 px-3 py-1 rounded-full border border-orange-500 text-white text-xs hover:bg-white/10 transition-colors"
            >
              {rightActionLabel}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
          <p className="text-gray-400 text-xs mb-1">{date} • {time}</p>
          <p className="text-gray-400 text-xs mb-1">{chapter}</p>
          <p className="text-gray-400 text-xs mb-3">{location}</p>
          <p className="text-gray-300 text-sm line-clamp-2 min-h-[40px]">{description}</p>

          {/* Actions - always at bottom */}
          <div className="mt-auto pt-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {getStatusButton()}
              </div>
              {showJoinedCount &&
                (status === "upcoming" || status === "joined" || status === "ongoing") && (
                  <span className="text-gray-400 text-xs ml-2">{joinedCountText}</span>
                )}
              {rightActionLabel && rightActionPlacement === "content" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRightActionClick?.(e);
                  }}
                  className="ml-2 px-3 py-1.5 rounded-full border border-orange-500 text-white text-xs hover:bg-white/10 transition-colors"
                >
                  {rightActionLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </GradientContainer>
  );
}