import React from "react";
import ProfileCard from "./ProfileCard";
import type { ProfileCardProps } from "./ProfileCard";

export interface ProfileHeaderProps {
  backgroundImage: string;
  profileCard: ProfileCardProps;
  showActionButtons?: boolean;
  onWriteTestimonial?: () => void;
  onSendMessage?: () => void;
}

/**
 * ProfileHeader Component
 * 
 * Displays the profile header with background image, profile card, and action buttons.
 * Reusable for any user's profile header.
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  backgroundImage,
  profileCard,
  showActionButtons = true,
  onWriteTestimonial,
  onSendMessage,
}) => {
  return (
    <div
      className="relative w-full h-64 md:h-80 bg-cover bg-center rounded-lg overflow-hidden mb-6"
      style={{ backgroundImage: `url('${backgroundImage}')` }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Profile Card - Positioned on the left */}
      <div className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2">
        <ProfileCard {...profileCard} />
      </div>

      {/* Action Buttons - Top Right */}
      {showActionButtons && (
        <div className="absolute top-4 right-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onWriteTestimonial}
            className="px-6 py-2 bg-[var(--ov-ember-fill)] hover:hover:bg-[var(--ov-ember-fill-hover)] text-[var(--ov-ink)] font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Write a Testimonial
          </button>
          <button
            onClick={onSendMessage}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-[var(--ov-ink)] font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Send Message
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileHeader;
