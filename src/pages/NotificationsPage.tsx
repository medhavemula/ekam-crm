import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ADMIN_THEME } from "../theme/themeScope";
import Navbar from "../components/navigation/Navbar";
import {
  useNotificationsListQuery,
  useNotificationsMarkAllReadMutation,
  useNotificationsMarkReadMutation,
} from "../services/notificationsApi";
import type { NotificationItem } from "../services/notificationsApi";
import {
  useGetPushPreferencesQuery,
  useUpdatePushPreferencesMutation,
  type PushPreferences,
} from "../services/pushApi";
import { 
  getNotificationIcon, 
  getNotificationNavigationPath,
  formatNotificationTitle
} from "../utils/notificationUtils";
import { usePushNotifications } from "../components/push/PushNotificationsProvider";

function SettingToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-[color:var(--ov-line)] bg-[var(--ov-fill-subtle)] px-4 py-3">
      <span className="text-sm text-[var(--ov-ink)]">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition ${
          checked ? "bg-[var(--ov-ember-fill)]" : "bg-[var(--ov-fill-hover)]"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </label>
  );
}

function Tabs({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const tabs: Array<{ id: "all" | "read" | "unread"; label: string }> = [
    { id: "all", label: "All" },
    { id: "read", label: "Read" },
    { id: "unread", label: "Unread" },
  ];
  return (
    <div className="pt-2">
      <div className="flex items-start text-[var(--ov-ink-2)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`relative py-3 px-2 sm:px-4 text-base sm:text-lg md:text-xl ${value === t.id ? "text-[var(--ov-ink)]" : "hover:text-[var(--ov-ink-2)]"}`}
            onClick={() => onChange(t.id)}
          >
            {t.label}
            {value === t.id && (
              <span className="absolute -bottom-[1px] left-2 right-2 sm:left-4 sm:right-4 h-[3px] bg-[var(--ov-ember-fill)] rounded-t" />
            )}
          </button>
        ))}
      </div>
      <div className="h-px w-full bg-[var(--ov-fill-subtle)]" />
    </div>
  );
}

// TypeIcon component has been moved to notificationUtils

function Row({ n, onClick }: { n: NotificationItem; onClick: () => void }) {
  return (
    <button
      className="w-full text-left flex items-center gap-3 bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-xl px-4 py-3 hover:bg-[var(--ov-fill-subtle)] shadow-[var(--ov-shadow-panel)]"
      onClick={onClick}
    >
      {getNotificationIcon(n)}
      <div className={`flex-1 text-sm leading-6 ${n.readAt ? "text-[var(--ov-ink-2)]" : "text-[var(--ov-ink)]"}`}>
        <span className="font-medium">{formatNotificationTitle(n)}</span>
        {n.body && (
          <>
            {": "}
            <span className="text-[var(--ov-ink-2)]">{n.body}</span>
          </>
        )}
      </div>
    </button>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const settingsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (location.hash !== "#notification-settings") return;
    const el = settingsRef.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [location.hash]);
  const {
    supported,
    configured,
    permission,
    registered,
    loading: pushLoading,
    paused,
    lastError,
    enablePush,
    disablePush,
    syncPushRegistration,
  } = usePushNotifications();
  const [tab, setTab] = useState<"all" | "read" | "unread">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const { data: listRes, isFetching } = useNotificationsListQuery(
    { 
      page: currentPage, 
      limit, 
      // The server narrows either way. Sending onlyUnread:false meant "no filter",
      // so the Read tab listed everything, read and unread alike (WEB-BUS-28).
      onlyUnread: tab === "unread" ? true : undefined,
      onlyRead: tab === "read" ? true : undefined,
    }, 
    { refetchOnMountOrArgChange: true }
  );
  const [markAllRead] = useNotificationsMarkAllReadMutation();
  const [markRead] = useNotificationsMarkReadMutation();
  const { data: pushPrefsRes } = useGetPushPreferencesQuery(undefined, {
    skip: !configured,
  });
  const [updatePushPreferences, { isLoading: updatingPreferences }] =
    useUpdatePushPreferencesMutation();

  const notifications = listRes?.data ?? [];
  const items = notifications;
  const totalPages = listRes?.total ? Math.ceil(listRes.total / limit) : 1;
  const pushPreferences = pushPrefsRes?.data;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleTabChange = (newTab: string) => {
    setTab(newTab as any);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  const updatePreference = async <K extends keyof PushPreferences>(
    key: K,
    value: PushPreferences[K],
  ) => {
    await updatePushPreferences({ [key]: value }).unwrap();
  };

  return (
    <div className={`${ADMIN_THEME} min-h-screen text-[var(--ov-ink)]`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-8">
        <section
          id="notification-settings"
          ref={settingsRef}
          className="mb-6 scroll-mt-24 rounded-2xl border border-[color:var(--ov-line)] bg-[var(--ov-panel)] p-5 shadow-[var(--ov-shadow-panel)]"
        >
          {(() => {
            const isOn = supported && configured && registered && !paused && permission === "granted";
            const isBlocked = supported && configured && permission === "denied";
            const isUnavailable = !supported || !configured;

            let statusLabel = "Off";
            let statusTone = "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-3)]";
            let statusDot = "bg-[var(--ov-ink-5)]";

            if (isUnavailable) {
              statusLabel = "Not available on this device";
              statusTone = "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-4)]";
              statusDot = "bg-[var(--ov-ink-5)]";
            } else if (isBlocked) {
              statusLabel = "Blocked in browser settings";
              statusTone = "bg-[var(--ov-danger-wash)] text-[var(--ov-danger)]";
              statusDot = "bg-[var(--ov-danger)]";
            } else if (isOn) {
              statusLabel = "On";
              statusTone = "bg-[var(--ov-success-wash)] text-[var(--ov-success)]";
              statusDot = "bg-[var(--ov-success)]";
            } else {
              statusLabel = "Off";
              statusTone = "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-3)]";
              statusDot = "bg-[var(--ov-ink-5)]";
            }

            const showTurnOn = !isUnavailable && !isBlocked && !isOn;
            const showTurnOff = isOn;
            const showRefresh = isOn;

            return (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-xl font-semibold text-[var(--ov-ink)]">
                        Notifications on this device
                      </h1>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusTone}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${statusDot}`} />
                        {statusLabel}
                      </span>
                    </div>
                    <p className="max-w-2xl text-sm text-[var(--ov-ink-3)]">
                      Get alerts about messages, meetings, approvals and more — even when this tab
                      isn't open.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {showTurnOn ? (
                      <button
                        type="button"
                        onClick={() => void enablePush()}
                        disabled={pushLoading}
                        className="rounded-lg bg-[var(--ov-ember-fill)] px-4 py-2 text-sm font-medium text-[var(--ov-on-ember)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pushLoading ? "Turning on..." : "Turn on notifications"}
                      </button>
                    ) : null}
                    {showTurnOff ? (
                      <button
                        type="button"
                        onClick={() => void disablePush()}
                        disabled={pushLoading}
                        className="rounded-lg bg-[var(--ov-ember-fill)] px-4 py-2 text-sm font-medium text-[var(--ov-on-ember)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pushLoading ? "Turning off..." : "Turn off"}
                      </button>
                    ) : null}
                    {showRefresh ? (
                      <button
                        type="button"
                        onClick={() => void syncPushRegistration()}
                        disabled={pushLoading}
                        className="rounded-lg border border-[color:var(--ov-line-strong)] px-4 py-2 text-sm font-medium text-[var(--ov-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                        title="Re-check this browser and refresh the connection"
                      >
                        Refresh
                      </button>
                    ) : null}
                  </div>
                </div>

                {isBlocked ? (
                  <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    Notifications are blocked in your browser. To turn them on, click the lock icon
                    in the address bar, allow notifications, then reload this page.
                  </div>
                ) : null}

                {isUnavailable && !lastError ? (
                  <div className="mt-4 rounded-xl border border-[color:var(--ov-line)] bg-[var(--ov-fill-subtle)] px-4 py-3 text-sm text-[var(--ov-ink-3)]">
                    Push notifications aren't available on this device or browser. You'll still see
                    them inside EKAM whenever you're signed in.
                  </div>
                ) : null}
              </>
            );
          })()}

          {lastError ? (
            <div className="mt-4 rounded-xl border border-[color:var(--ov-danger-wash)] bg-[var(--ov-danger-wash)] px-4 py-3 text-sm text-[var(--ov-danger)]">
              {lastError}
            </div>
          ) : null}

          {pushPreferences ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SettingToggle
                label="All notifications"
                checked={pushPreferences.pushEnabled}
                disabled={updatingPreferences}
                onChange={(checked) => void updatePreference("pushEnabled", checked)}
              />
              <SettingToggle
                label="Chat"
                checked={pushPreferences.chat}
                disabled={updatingPreferences || !pushPreferences.pushEnabled}
                onChange={(checked) => void updatePreference("chat", checked)}
              />
              <SettingToggle
                label="Events"
                checked={pushPreferences.events}
                disabled={updatingPreferences || !pushPreferences.pushEnabled}
                onChange={(checked) => void updatePreference("events", checked)}
              />
              <SettingToggle
                label="Groups"
                checked={pushPreferences.groups}
                disabled={updatingPreferences || !pushPreferences.pushEnabled}
                onChange={(checked) => void updatePreference("groups", checked)}
              />
              <SettingToggle
                label="Feed"
                checked={pushPreferences.feed}
                disabled={updatingPreferences || !pushPreferences.pushEnabled}
                onChange={(checked) => void updatePreference("feed", checked)}
              />
              <SettingToggle
                label="Meetings"
                checked={pushPreferences.meetings}
                disabled={updatingPreferences || !pushPreferences.pushEnabled}
                onChange={(checked) => void updatePreference("meetings", checked)}
              />
              <SettingToggle
                label="Approvals"
                checked={pushPreferences.approvals}
                disabled={updatingPreferences || !pushPreferences.pushEnabled}
                onChange={(checked) => void updatePreference("approvals", checked)}
              />
              <SettingToggle
                label="System"
                checked={pushPreferences.system}
                disabled={updatingPreferences || !pushPreferences.pushEnabled}
                onChange={(checked) => void updatePreference("system", checked)}
              />
            </div>
          ) : null}

          {pushPreferences ? (
            <div className="mt-5 rounded-xl border border-[color:var(--ov-line)] bg-[var(--ov-fill-subtle)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--ov-ink)]">Quiet hours</h2>
                  <p className="mt-1 text-xs text-[var(--ov-ink-4)]">
                    Mute push notifications during a daily window. In-app notifications still arrive.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={updatingPreferences || !pushPreferences.pushEnabled}
                  onClick={() =>
                    void updatePreference("quietHoursEnabled", !pushPreferences.quietHoursEnabled)
                  }
                  className={`relative h-7 w-12 rounded-full transition ${
                    pushPreferences.quietHoursEnabled ? "bg-[var(--ov-ember-fill)]" : "bg-[var(--ov-fill-hover)]"
                  } ${
                    updatingPreferences || !pushPreferences.pushEnabled
                      ? "cursor-not-allowed opacity-50"
                      : ""
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      pushPreferences.quietHoursEnabled ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs text-[var(--ov-ink-3)]">
                  <span>Start</span>
                  <input
                    type="time"
                    value={pushPreferences.quietHoursStart}
                    disabled={
                      updatingPreferences ||
                      !pushPreferences.pushEnabled ||
                      !pushPreferences.quietHoursEnabled
                    }
                    onChange={(e) => void updatePreference("quietHoursStart", e.target.value)}
                    className="rounded-md border border-[color:var(--ov-line-strong)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-ink)] outline-none focus:border-[color:var(--field-border-focus)] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[var(--ov-ink-3)]">
                  <span>End</span>
                  <input
                    type="time"
                    value={pushPreferences.quietHoursEnd}
                    disabled={
                      updatingPreferences ||
                      !pushPreferences.pushEnabled ||
                      !pushPreferences.quietHoursEnabled
                    }
                    onChange={(e) => void updatePreference("quietHoursEnd", e.target.value)}
                    className="rounded-md border border-[color:var(--ov-line-strong)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-ink)] outline-none focus:border-[color:var(--field-border-focus)] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[var(--ov-ink-3)]">
                  <span>Timezone</span>
                  <input
                    type="text"
                    value={pushPreferences.quietHoursTimezone}
                    placeholder="e.g. Asia/Kolkata"
                    disabled={
                      updatingPreferences ||
                      !pushPreferences.pushEnabled ||
                      !pushPreferences.quietHoursEnabled
                    }
                    onChange={(e) => void updatePreference("quietHoursTimezone", e.target.value)}
                    className="rounded-md border border-[color:var(--ov-line-strong)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--field-ink)] outline-none focus:border-[color:var(--field-border-focus)] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>
              </div>
            </div>
          ) : null}
        </section>

        <div className="flex items-center justify-between mb-6">
          <Tabs value={tab} onChange={handleTabChange} />
          <button 
            className="px-4 py-2 rounded-lg bg-[var(--ov-fill-subtle)] text-[var(--ov-ink)] hover:bg-[var(--ov-fill-hover)] disabled:opacity-50" 
            onClick={() => markAllRead()}
            disabled={notifications.length === 0}
          >
            Mark all as read
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {isFetching ? (
            <div className="text-sm text-[var(--ov-ink-4)]">Loading notifications...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-[var(--ov-ink-4)]">No notifications</div>
          ) : (
            <>
              {items.map((n: NotificationItem) => (
                <Row
                  key={n.id}
                  n={n}
                  onClick={async () => {
                    try { 
                      await markRead({ id: n.id }).unwrap(); 
                      const path = getNotificationNavigationPath(n);
                      navigate(path);
                    } catch (error) {
                      console.error("Error handling notification click:", error);
                    }
                  }}
                />
              ))}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg bg-[var(--ov-fill-subtle)] text-[var(--ov-ink)] hover:bg-[var(--ov-fill-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 rounded-lg ${
                          currentPage === page
                            ? "bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)]"
                            : "bg-[var(--ov-fill-subtle)] text-[var(--ov-ink)] hover:bg-[var(--ov-fill-hover)]"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg bg-[var(--ov-fill-subtle)] text-[var(--ov-ink)] hover:bg-[var(--ov-fill-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
