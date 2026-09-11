import { useNavigate } from "react-router-dom";
import { useRef, useEffect } from "react";
import { 
  useNotificationsListQuery, 
  useNotificationsMarkAllReadMutation, 
  useNotificationsMarkReadMutation,
  useLazyNotificationsListQuery
} from "../../services/notificationsApi";
import type { NotificationItem } from "../../services/notificationsApi";
import { 
  getNotificationIcon, 
  getNotificationNavigationPath,
  formatNotificationTitle
} from "../../utils/notificationUtils";

const Divider = () => <div className="my-3 h-px bg-[var(--ov-fill-subtle)]" />;

export default function NotificationPopover({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [triggerNotificationsList] = useLazyNotificationsListQuery();

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  const { data: listRes, refetch } = useNotificationsListQuery(
    { page: 1, limit: 10, onlyUnread: true }, 
    { refetchOnMountOrArgChange: true }
  );
  const [markAllRead, { isLoading: marking }] = useNotificationsMarkAllReadMutation();
  const [markRead] = useNotificationsMarkReadMutation();
  
  // Get unread notifications
  const notifications = listRes?.data ?? [];

  const handleNotificationClick = async (n: NotificationItem) => {
    try {
      // First mark as read if unread
      if (!n.readAt) {
        await markRead({ id: n.id }).unwrap();
      }
      
      // Immediately refetch latest 10 unread notifications
      await triggerNotificationsList({ page: 1, limit: 10, onlyUnread: true }).unwrap();
      refetch();
      
      // Then navigate
      const path = getNotificationNavigationPath(n);
      navigate(path);
      onClose();
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  const handlePopoverOpen = async () => {
    try {
      // Refetch latest 10 unread notifications when popover opens
      await triggerNotificationsList({ page: 1, limit: 10, onlyUnread: true }).unwrap();
      refetch();
    } catch (error) {
      console.error("Error refetching notifications:", error);
    }
  };

  // Refresh notifications when popover opens
  useEffect(() => {
    if (isOpen) {
      handlePopoverOpen();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  
  // Use notifications directly since we're already fetching only unread
  const items = notifications;

  return (
    <div 
  ref={popoverRef}
  onClick={(e) => e.stopPropagation()}
  className="fixed inset-x-4 top-16 sm:absolute sm:right-0 sm:top-auto sm:inset-x-auto sm:mt-2 w-[calc(100vw-2rem)] sm:w-[380px] lg:w-[420px] max-h-[60vh] sm:max-h-[70vh] lg:max-h-[520px] bg-[var(--ov-panel)] text-[var(--ov-ink)] rounded-2xl shadow-[var(--ov-shadow-pop)] border border-[color:var(--ov-line)] overflow-hidden z-[3000]"
>
      <div className="px-4 py-3 border-b border-[color:var(--ov-line)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Notifications</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate("/notifications#notification-settings");
            }}
            aria-label="Notification settings"
            title="Notification settings"
            className="p-1.5 rounded-full text-[var(--ov-ink)]/70 hover:text-[var(--ov-ink)] hover:bg-[var(--ov-fill-hover)]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--ov-ember)] hover:text-[var(--ov-ember-fill-hover)] px-2"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4 overflow-y-auto max-h-[40vh] sm:max-h-[45vh] lg:max-h-[380px]">
        {items.length === 0 ? (
          <div className="text-sm text-[var(--ov-ink-4)] py-10 text-center">No unread notifications</div>
        ) : (
          items.map((n: NotificationItem) => (
            <div 
              key={n.id} 
              className="flex items-start gap-3 p-3 hover:bg-[var(--ov-fill-subtle)] rounded-lg transition-colors cursor-pointer" 
              onClick={() => handleNotificationClick(n)}
            >
              {getNotificationIcon(n)}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--ov-ink)] truncate">{formatNotificationTitle(n)}</div>
                <div className="text-xs text-[var(--ov-ink)]/60 mt-1 line-clamp-2">{n.body}</div>
                <div className="text-xs text-[var(--ov-ink)]/40 mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
              {!n.readAt && <div className="w-2 h-2 rounded-full bg-[var(--ov-ember-fill)] mt-1.5" />}
            </div>
          ))
        )}
        {items.length > 0 && <Divider />}
      </div>

      <div className="px-4 py-3 flex items-center justify-between gap-3 border-t border-[color:var(--ov-line)]">
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-lg bg-[var(--ov-fill-subtle)] hover:bg-[var(--ov-fill-hover)] text-[var(--ov-ink)] text-sm disabled:opacity-50"
            onClick={() => markAllRead().unwrap().catch(() => {})}
            disabled={marking || notifications.length === 0}
          >
            Mark all as read
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-[var(--ov-fill-subtle)] hover:bg-[var(--ov-fill-hover)] text-[var(--ov-ink)] text-sm"
            onClick={() => {
              onClose();
              navigate("/notifications#notification-settings");
            }}
          >
            Settings
          </button>
        </div>
        <button
          className="px-4 py-2 rounded-lg border border-[color:var(--ov-ember-edge)] text-[var(--ov-ember)] hover:bg-[var(--ov-ember-wash)] text-sm"
          onClick={() => { onClose(); navigate("/notifications"); }}
        >
          View All
        </button>
      </div>
    </div>
  );
}
