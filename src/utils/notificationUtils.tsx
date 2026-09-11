import React from 'react';
import P2PIcon from "../assets/icons/Notifications/p2p.svg";
import BOIcon from "../assets/icons/Notifications/BC.svg";
import MeetingsIcon from "../assets/icons/Notifications/Meetings.svg";
import TestimonialsIcon from "../assets/icons/Notifications/TReceived.svg";
import ConnectionIcon from "../assets/icons/Notifications/CRequest.svg";
import GroupIcon from "../assets/icons/Notifications/FRepost.svg";
import EventIcon from "../assets/icons/Notifications/Meetings.svg";
import SystemIcon from "../assets/icons/Notifications/System.svg";
import MessageIcon from "../assets/icons/Notifications/Message.svg";
import NewRegistrationIcon from "../assets/icons/Notifications/new-registration.svg";
// Group-specific notification icons
import GroupAcceptedIcon from "../assets/icons/Notifications/GroupAccepted.svg";
import GroupRejectedIcon from "../assets/icons/Notifications/GroupRejected.svg";
import GroupJoinedIcon from "../assets/icons/Notifications/GroupJoined.svg";
import GroupMemberJoinedIcon from "../assets/icons/Notifications/GroupMemberJoined.svg";
import GroupMemberRemovedIcon from "../assets/icons/Notifications/GroupMemberRemoved.svg";
import GroupMemberRequestIcon from "../assets/icons/Notifications/GroupMemberrequest.svg";
import LeaveGroupIcon from "../assets/icons/Notifications/LeaveGroup.svg";
import type { NotificationItem } from "../services/notificationsApi";

export type PushNavigationData = {
  notificationId?: string;
  notificationType?: string;
  kind?: string;
  id?: string;
  entityId?: string;
  threadId?: string;
  postId?: string;
  eventId?: string;
  groupId?: string;
  meetingId?: string;
  approvalId?: string;
  requestId?: string;
  userId?: string;
  screen?: string;
  module?: string;
  title?: string;
  body?: string;
  [key: string]: any;
};

// Add this at the top of the file, after imports
const NotificationIcon: React.FC<{ src: string; alt: string; className?: string }> = ({
  src,
  alt,
  className = "w-5 h-5"
}) => (
  <img src={src} alt={alt} className={className} />
);

export const getNotificationIcon = (notification?: { type?: string; data?: any }): React.ReactNode => {
  const base = "w-9 h-9 rounded-full bg-white/10 flex items-center justify-center";
  const iconColor = "text-[#3F3F3F]";
  
  // Check data.notificationType first, then fallback to type
  const type = notification?.data?.notificationType || notification?.type;
  const t = String(type || "").toUpperCase();

  // New Member Registration Notifications
  if (t === "MEMBER_REGISTERED") {
    return (
      <div className={base}>
        <NotificationIcon src={NewRegistrationIcon} alt="New Registration" className="w-5 h-5" />
      </div>
    );
  }

  // Message Notifications
  if (t === "MESSAGE_NEW" || t.includes("MESSAGE")) {
    return (
      <div className={base}>
        <NotificationIcon src={MessageIcon} alt="Message" className={`w-5 h-5 ${iconColor}`} />
      </div>
    );
  }

  // M2O (Many-to-One) Notifications
  if (t === "M2O_CREATED" || t.includes("M2O") || t.includes("MANYTOONE") || t.includes("MANY_TO_ONE")) {
    return (
      <div className={base}>
        <NotificationIcon src={MeetingsIcon} alt="M2O" className={`w-5 h-5 ${iconColor}`} />
      </div>
    );
  }

  // Group Notifications - Specific mappings
  if (t.includes("GROUP_")) {
    // Group join/accept notifications
    if (t.includes("ACCEPTED") || t.includes("APPROVED")) {
      return (
        <div className={base}>
          <NotificationIcon src={GroupAcceptedIcon} alt="Group Accepted" className={`w-5 h-5 ${iconColor}`} />
        </div>
      );
    }
    
    // Group rejection notifications
    if (t.includes("REJECTED")) {
      return (
        <div className={base}>
          <NotificationIcon src={GroupRejectedIcon} alt="Group Rejected" className={`w-5 h-5 ${iconColor}`} />
        </div>
      );
    }
    
    // Group joined notifications
    if (t.includes("JOINED") || t.includes("JOIN")) {
      return (
        <div className={base}>
          <NotificationIcon src={GroupJoinedIcon} alt="Group Joined" className={`w-5 h-5 ${iconColor}`} />
        </div>
      );
    }
    
    // Group leave notifications
    if (t.includes("LEAVE") || t.includes("LEFT")) {
      return (
        <div className={base}>
          <NotificationIcon src={LeaveGroupIcon} alt="Leave Group" className={`w-5 h-5 ${iconColor}`} />
        </div>
      );
    }
    
    // Default group icon for other group notifications
    return (
      <div className={base}>
        <NotificationIcon src={GroupIcon} alt="Group" className={`w-5 h-5 ${iconColor}`} />
      </div>
    );
  }
  
  // Member Notifications
  if (t.includes("MEMBER_")) {
    // Member joined group notifications
    if (t.includes("JOINED") || t.includes("JOIN")) {
      return (
        <div className={base}>
          <NotificationIcon src={GroupMemberJoinedIcon} alt="Member Joined" className={`w-5 h-5 ${iconColor}`} />
        </div>
      );
    }
    
    // Member removed from group notifications
    if (t.includes("REMOVED") || t.includes("REMOVE")) {
      return (
        <div className={base}>
          <NotificationIcon src={GroupMemberRemovedIcon} alt="Member Removed" className={`w-5 h-5 ${iconColor}`} />
        </div>
      );
    }
    
    // Member request notifications
    if (t.includes("REQUEST")) {
      return (
        <div className={base}>
          <NotificationIcon src={GroupMemberRequestIcon} alt="Member Request" className={`w-5 h-5 ${iconColor}`} />
        </div>
      );
    }
    
    // Default group icon for other member notifications
    return (
      <div className={base}>
        <NotificationIcon src={GroupIcon} alt="Member" className={`w-5 h-5 ${iconColor}`} />
      </div>
    );
  }

  // Connection & P2P Notifications
  if (t.includes("P2P") || t.includes("CONNECTION_")) {
    return (
      <div className={base}>
        <NotificationIcon
          src={t.includes("P2P") ? P2PIcon : ConnectionIcon}
          alt={t.includes("P2P") ? "P2P" : "Connection"}
          className={`w-5 h-5 ${iconColor}`}
        />
      </div>
    );
  }

  // Business & Opportunity Notifications
  if (t.includes("BUSINESS") || t.includes("OPPORTUNITY")) {
    return (
      <div className={base}>
        <NotificationIcon src={BOIcon} alt="Business" className={`w-5 h-5 ${iconColor}`} />
      </div>
    );
  }

  // Event & Meeting Notifications
  if (t.startsWith("EVENT_") || t.startsWith("MEETING") || t.startsWith("MEET")) {
    return (
      <div className={base}>
        <NotificationIcon src={EventIcon} alt="Event" className={`w-5 h-5 ${iconColor}`} />
      </div>
    );
  }

  // Testimonial Notifications
  if (t.startsWith("TESTIMONIAL")) {
    return (
      <div className={base}>
        <NotificationIcon src={TestimonialsIcon} alt="Testimonial" className={`w-5 h-5 ${iconColor}`} />
      </div>
    );
  }

  // System Notifications
  if (t === "SYSTEM" || t.includes("SYSTEM_")) {
    return (
      <div className={base}>
        <NotificationIcon src={SystemIcon} alt="System" className={`w-5 h-5 ${iconColor}`} />
      </div>
    );
  }

  // Module Upgrade Notifications
  if (t.includes("UPGRADE") || t.includes("MODULE") || t.includes("ACCESS")) {
    return (
      <div className={base}>
        <NotificationIcon src={SystemIcon} alt="Module Upgrade" className={`w-5 h-5 ${iconColor}`} />
      </div>
    );
  }

  // Default icon for unknown types
  return (
    <div className={base}>
      <NotificationIcon src={MessageIcon} alt="Notification" className={`w-5 h-5 ${iconColor}`} />
    </div>
  );
};

function getModuleAwareMessagePath(threadId?: string): string {
  if (typeof localStorage === "undefined") {
    return threadId ? `/business/my-feed/chat/thread/${threadId}` : "/business/my-feed/chat";
  }

  let moduleAccess: { business?: boolean; professional?: boolean; social?: boolean } = {};
  try {
    const raw = localStorage.getItem("moduleAccess");
    if (raw) moduleAccess = JSON.parse(raw);
  } catch {
    // ignore parse errors
  }

  if (moduleAccess.business) {
    return threadId ? `/business/my-feed/chat/thread/${threadId}` : "/business/my-feed/chat";
  }
  if (moduleAccess.professional) {
    return threadId ? `/professional/messages/${threadId}` : "/professional/messages";
  }
  if (moduleAccess.social) {
    return threadId ? `/social/messages/${threadId}` : "/social/messages";
  }

  // Fallback: default to business
  return threadId ? `/business/my-feed/chat/thread/${threadId}` : "/business/my-feed/chat";
}

export function getNavigationPathFromPushData(
  data: PushNavigationData = {},
  fallbackType?: string,
): string {
  const kind = data.kind || "";
  const targetId =
    data.entityId ||
    data.id ||
    data.threadId ||
    data.postId ||
    data.eventId ||
    data.groupId ||
    data.meetingId ||
    data.requestId ||
    data.approvalId;

  const type = data.notificationType || fallbackType || "";
  const normalizedType = String(type || "").toUpperCase();
  const normalizedScreen = String(data.screen || "").toLowerCase();

  // Handle post notifications
  if (normalizedScreen === "feedpost" || normalizedType === "POST_CREATED" || kind === "post") {
    const postId = data.postId || targetId;
    return postId ? `/post/${postId}` : "/business/my-feed";
  }

  // Handle new member registration notifications
  if (type === "MEMBER_REGISTERED" || kind === "member_registration") {
    const memberId = data.memberId || targetId;
    if (memberId) {
      return `/admin/regional-board/members/${memberId}/view`;
    }
    return "/admin/regional-board";
  }

  // Handle member approved admin notifications
  if (type === "MEMBER_APPROVED_ADMIN_NOTIFICATION" || kind === "member_approval_admin") {
    const chapterId = data.chapterId;
    if (chapterId) {
      return `/admin/regional-board/chapter/${chapterId}/members?chapterId=${chapterId}`;
    }
    return "/admin/regional-board";
  }

  // Handle Message notifications
  if (normalizedScreen === "chatthread") {
    const threadId = data.threadId || targetId;
    return getModuleAwareMessagePath(threadId || undefined);
  }

  if (normalizedType === "MESSAGE_NEW" || kind === "message" || normalizedType.includes("MESSAGE")) {
    const threadId = data.threadId || targetId;
    return getModuleAwareMessagePath(threadId || undefined);
  }

  // Handle Opportunity notifications
  // WEB-BUS-28: the payload already carries the record id, so pass it through as
  // ?focus= and let the list open on that row instead of dropping the user at the top.
  if (normalizedType === "OPPORTUNITY_WON") {
    return targetId ? `/business/business-received?focus=${targetId}` : "/business/business-received";
  }
  if (normalizedType === "OPPORTUNITY_GIVEN") {
    return targetId ? `/business/opportunity-received?focus=${targetId}` : "/business/opportunity-received";
  }
  if (kind === "opportunity" || normalizedType.includes("OPPORTUNITY")) {
    return targetId ? `/business/opportunity-received?focus=${targetId}` : "/business/opportunity-received";
  }

  // Handle other notification types
  if (kind === "p2p" || normalizedType.includes("P2P")) {
    return targetId ? `/business/p2p?focus=${targetId}` : "/business/p2p";
  }
  if (kind === "testimonial_request" || normalizedType.includes("TESTIMONIAL_REQUEST")) {
    // A request you were asked to answer lives under Requests, not the Received tab.
    const sub = normalizedType === "TESTIMONIAL_REQUEST" ? "received" : "given";
    return targetId
      ? `/business/testimonials?tab=requests&sub=${sub}&focus=${targetId}`
      : "/business/testimonials?tab=requests";
  }
  if (kind === "testimonial" || normalizedType.includes("TESTIMONIAL")) {
    return targetId ? `/business/testimonials?tab=received&focus=${targetId}` : "/business/testimonials";
  }
  if (normalizedScreen === "meetingdetail") {
    const meetingId = data.meetingId || targetId;
    return meetingId ? `/business/meetings/${meetingId}` : "/business/meetings";
  }

  if (normalizedScreen === "eventdetail") {
    const eventId = data.eventId || targetId;
    return eventId ? `/business/upcoming-events/${eventId}` : "/business/upcoming-events";
  }

  if (normalizedScreen === "notificationcenter") {
    return "/notifications";
  }

  if (kind === "meeting" || normalizedType.includes("MEETING")) {
    const meetingId = data.meetingId || targetId;
    return meetingId ? `/business/meetings/${meetingId}` : "/business/meetings";
  }

  if (kind === "event" || normalizedType.includes("EVENT")) {
    const eventId = data.eventId || targetId;
    return eventId ? `/business/upcoming-events/${eventId}` : "/business/upcoming-events";
  }
  if (kind === "m2o" || normalizedType.includes("M2O")) {
    return targetId ? `/business/many-to-one?focus=${targetId}` : "/business/many-to-one";
  }
  if (kind === "connection" || normalizedType.includes("CONNECTION")) {
    // Get user role to determine correct connections page
    const getUserRole = () => {
      if (typeof localStorage !== 'undefined') {
        const storedRole = localStorage.getItem('userRole');
        if (storedRole) return storedRole;
      }
      return 'USER'; // fallback
    };
    
    const userRole = getUserRole();

    const basePath =
      userRole === "PROFESSIONAL"
        ? "/professional/connections"
        : userRole === "SOCIAL"
          ? "/social/connections"
          : "/business/connections";

    // Open the tab the request actually sits on, and name the record so the page can
    // bring it into view. A request you received is not on the same tab as one you sent.
    const tab =
      normalizedType === "CONNECTION_REQUEST"
        ? "received"
        : normalizedType === "CONNECTION_WITHDRAWN"
          ? "sent"
          : "connections";
    const query = [`tab=${tab}`, targetId ? `focus=${targetId}` : ""].filter(Boolean).join("&");
    return `${basePath}?${query}`;
  }

  // Handle group approval required notifications
  if (type === "GROUP_APPROVAL_REQUIRED" || kind === "group_approval") {
    return "/admin/groups?tab=requested";
  }

  if (kind === "group" || normalizedType.includes("GROUP")) {
    const groupId = data.groupId || targetId;
    return groupId ? `/groups/${groupId}` : "/groups";
  }
  if (normalizedType === "SYSTEM" || normalizedType.includes("SYSTEM")) {
    return "/notifications";
  }

  // Module Upgrade Notifications
  if (normalizedType.includes("UPGRADE") || normalizedType.includes("MODULE") || normalizedType.includes("ACCESS")) {
    if (normalizedType.includes("REQUEST")) {
      return "/admin/upgrade-requests";
    }
    if (normalizedType.includes("APPROVED")) {
      return "/dashboard";
    }
    return "/settings/modules";
  }

  // Default navigation
  return "/dashboard";
}

export const getNotificationNavigationPath = (n: NotificationItem): string => {
  return getNavigationPathFromPushData((n.data || {}) as PushNavigationData, n.type);
};

export const filterNotifications = (
  notifications: NotificationItem[] = [],
  filter: 'all' | 'read' | 'unread' = 'all'
): NotificationItem[] => {
  if (!Array.isArray(notifications)) return [];

  return notifications.filter((n) => {
    if (filter === 'read') return !!n.readAt;
    if (filter === 'unread') return !n.readAt;
    return true;
  });
};

export const getUnreadCount = (notifications: NotificationItem[] = []): number => {
  if (!Array.isArray(notifications)) return 0;
  return notifications.filter(n => !n.readAt).length;
};

export const formatNotificationTitle = (notification: NotificationItem): string => {
  
  // Check data.notificationType first, then fallback to type
  const type = notification.data?.notificationType || notification.type;
  const { title, body } = notification;
  const t = String(type || "").toUpperCase();
  const kind = notification.data?.kind || "";

  // Handle post notifications
  if (t === "POST_CREATED" || kind === "post") {
    return title || "New Post";
  }

  // New member registration notifications
  if (t === "MEMBER_REGISTERED" || kind === "member_registration") {
    return "New Member Registration";
  }

  // Member approved admin notifications
  if (t === "MEMBER_APPROVED_ADMIN_NOTIFICATION" || kind === "member_approval_admin") {
    return "Member Approved";
  }

  // Message Notifications
  if (t === "MESSAGE_NEW" || t.includes("MESSAGE") || kind === "message") {
    return "New Message";
  }

  // Opportunity Notifications
  if (t === "OPPORTUNITY_WON" || kind === "opportunity_won") {
    return "Opportunity Successfully Closed";
  }
  if (t === "OPPORTUNITY_GIVEN" || kind === "opportunity_given") {
    return "New Opportunity Received";
  }
  if (t.includes("OPPORTUNITY") || kind === "opportunity") {
    return "Opportunity Update";
  }

  // Connection & P2P Notifications
  if (t.includes("P2P") || kind === "p2p") {
    if (t === "P2P_CREATED") {
      return "New P2P Added";
    }
    if (t === "P2P_COMPLETED") {
      return "P2P Completed";
    }
    if (t === "P2P_CANCELLED") {
      return "P2P Cancelled";
    }
    return "P2P Update";
  }
  if (t.includes("CONNECTION") || kind === "connection") {
    if (t === "CONNECTION_REQUEST") {
      return "New Connection Request";
    }
    if (t === "CONNECTION_ACCEPTED") {
      return "Connection Request Accepted";
    }
    if (t === "CONNECTION_REJECTED") {
      return "Connection Request Declined";
    }
    return "Connection Update";
  }

  // Group Notifications
  if (t.includes("GROUP") || t.includes("MEMBER") || kind === "group") {
    if (t.includes("APPROVAL") || kind === "group_approval") {
      return "Group Awaiting Approval";
    }
    if (t.includes("INVITE")) {
      return "Group Invitation";
    }
    if (t.includes("JOIN")) {
      return "New Group Member";
    }
    if (t.includes("REMOVED") || t.includes("LEFT")) {
      return "Member Left Group";
    }
    if (t.includes("ROLE_CHANGE")) {
      return "Group Role Updated";
    }
    return "Group Update";
  }

  // Meeting & Event Notifications
  // Meeting Notifications
  if (t.includes("MEETING") || t.includes("MEET") || kind === "meeting") {
    if (t.includes("REMINDER")) {
      return "Upcoming Meeting Reminder";
    }
    if (t.includes("INVITATION")) {
      return "Meeting Invitation";
    }
    if (t.includes("CANCELLED") || t.includes("CANCELED")) {
      return "Meeting Cancelled";
    }
    if (t.includes("RESCHEDULED")) {
      return "Meeting Rescheduled";
    }
    if (t.includes("UPDATED")) {
      return "Meeting Details Updated";
    }
    if (t.includes("RSVP")) {
      return "Meeting Attendance Confirmed";
    }
    if (t.includes("CHECKIN")) {
      return "Meeting Check-in";
    }
    return "Meeting Update";
  }

  // Event Notifications
  if (t.includes("EVENT") || kind === "event") {
    if (t.includes("REGISTRATION") || t.includes("REGISTERED")) {
      return "Event Registration Confirmed";
    }
    if (t.includes("REMINDER")) {
      return "Upcoming Event Reminder";
    }
    if (t.includes("INVITATION")) {
      return "Event Invitation";
    }
    if (t.includes("CANCELLED") || t.includes("CANCELED")) {
      return "Event Cancelled";
    }
    if (t.includes("UPDATED")) {
      return "Event Details Updated";
    }
    if (t.includes("ATTENDANCE")) {
      return "Event Attendance Confirmed";
    }
    return "Event Update";
  }

  // Testimonial Notifications
  if (t.includes("TESTIMONIAL") || kind === "testimonial") {
    if (t.includes("GIVEN")) {
      return "You've Shared a Testimonial";
    }
    if (t.includes("RECEIVED")) {
      return "You've Received a New Testimonial";
    }
    if (t.includes("APPROVED")) {
      return "Your Testimonial Has Been Approved";
    }
    if (t.includes("REJECTED") || t.includes("DECLINED")) {
      return "Testimonial Not Published";
    }
    return "Testimonial Update";
  }

  // System Notifications
  if (t.includes("SYSTEM") || kind === "system") {
    return "System Notification";
  }

  // Module Upgrade Notifications
  if (t.includes("UPGRADE") || t.includes("MODULE") || t.includes("ACCESS")) {
    if (t.includes("REQUEST")) {
      return "Module Upgrade Request";
    }
    if (t.includes("APPROVED")) {
      return "Module Access Approved";
    }
    if (t.includes("REJECTED")) {
      return "Module Access Denied";
    }
    return "Module Access Update";
  }

  // Fallback to original title or generate from body if title is not descriptive
  if (title && !title.match(/^[A-Z_]+$/) && title.trim() !== "") {
    // If title is not all caps and not empty, use it
    return title;
  }

  // Try to generate a title from the first few words of the body
  if (body) {
    const words = body.split(/\s+/);
    if (words.length > 0) {
      // Capitalize first letter of first word
      const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1);
      return firstWord + (words.length > 1 ? ' ' + words.slice(1, 4).join(' ') : '') + (words.length > 4 ? '...' : '');
    }
  }

  // Default fallback
  return "New Notification";
};
