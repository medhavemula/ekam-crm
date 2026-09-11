import React from "react";

export interface TestimonialCardProps {
  name: string;
  avatarUrl?: string;
  testimonialText: string;
  showActions?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
}

/**
 * TestimonialCard Component
 * 
 * Reusable card component for displaying testimonials.
 * Can show with or without action buttons (Accept/Reject).
 */
export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  name,
  avatarUrl,
  testimonialText,
  showActions = false,
  onAccept,
  onReject,
}) => {
  return (
    <div className="bg-[#1a2332] border border-gray-700 rounded-lg p-6 hover:border-orange-500/50 transition-colors min-w-0">
      {/* Avatar */}
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center border-2 border-gray-500">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 className="text-center text-lg font-semibold text-orange-500 mb-3 break-words [overflow-wrap:anywhere]">
        {name}
      </h3>

      {/* Testimonial Text */}
      <p className="text-sm text-gray-300 leading-relaxed text-center mb-4 break-words [overflow-wrap:anywhere] whitespace-pre-wrap">
        {testimonialText}
      </p>

      {/* Action Buttons (for Requests tab) */}
      {showActions && (
        <div className="flex justify-center gap-3 mt-4">
          <button
            onClick={onAccept}
            className="px-6 py-2 bg-transparent border border-gray-500 hover:border-orange-500 text-white rounded-lg transition-colors"
          >
            Accept
          </button>
          <button
            onClick={onReject}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

export default TestimonialCard;
