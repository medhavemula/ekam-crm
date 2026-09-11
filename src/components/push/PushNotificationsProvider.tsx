import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { useAppDispatch } from "../../app/store";
import GradientContainer from "../common/GradientContainer";
import { useToast } from "../toast/ToastProvider";
import { getFirebaseMessagingClient, hasFirebaseWebPushConfig } from "../../lib/firebase";
import {
  clearStoredPushRegistration,
  getOrCreatePushDeviceId,
  getStoredPushToken,
  isPushPaused,
  setPushPaused,
  setStoredPushToken,
} from "../../lib/pushStorage";
import {
  useRegisterPushDeviceMutation,
  useUnregisterPushDeviceMutation,
} from "../../services/pushApi";
import { notificationsApi, type NotificationItem } from "../../services/notificationsApi";
import { getNotificationNavigationPath, type PushNavigationData } from "../../utils/notificationUtils";

type PushManagerState = {
  supported: boolean;
  configured: boolean;
  permission: NotificationPermission;
  token: string | null;
  registered: boolean;
  loading: boolean;
  paused: boolean;
  lastError: string | null;
  requestPermissionFromGesture: () => Promise<NotificationPermission>;
  enablePush: () => Promise<boolean>;
  disablePush: () => Promise<void>;
  cleanupPushSession: () => Promise<void>;
  syncPushRegistration: () => Promise<void>;
  clearPushError: () => void;
};

const PushNotificationsContext = createContext<PushManagerState | undefined>(undefined);
const AUTO_PUSH_PROMPT_SESSION_KEY = "ekam.webPush.autoPrompted";
const PUSH_PROMPT_DISMISSED_SESSION_KEY = "ekam.webPush.promptDismissed";

function getAppVersion() {
  return import.meta.env.VITE_APP_VERSION || "web";
}

function getBrowserDeviceName() {
  if (typeof navigator === "undefined") return "Web Browser";
  return navigator.userAgent;
}

function asNotificationItem(data: PushNavigationData): NotificationItem {
  return {
    id: String(data.notificationId || data.entityId || "push"),
    type: String(data.notificationType || data.kind || "SYSTEM"),
    title: String(data.title || "Notification"),
    body: String(data.body || ""),
    data,
    readAt: null,
    createdAt: new Date().toISOString(),
  };
}

function getNotificationPayloadData(payload: MessagePayload): PushNavigationData {
  const data = (payload.data || {}) as PushNavigationData;
  if (payload.notification?.title && !data.title) data.title = payload.notification.title;
  if (payload.notification?.body && !data.body) data.body = payload.notification.body;
  return data;
}

function updatePermissionState(setter: (value: NotificationPermission) => void) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    setter("denied");
    return;
  }
  setter(Notification.permission);
}

function markAutoPromptedThisSession() {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") return;
  window.sessionStorage.setItem(AUTO_PUSH_PROMPT_SESSION_KEY, "true");
}

function clearAutoPromptedThisSession() {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") return;
  window.sessionStorage.removeItem(AUTO_PUSH_PROMPT_SESSION_KEY);
}

function hasDismissedPromptThisSession() {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") return false;
  return window.sessionStorage.getItem(PUSH_PROMPT_DISMISSED_SESSION_KEY) === "true";
}

function dismissPromptThisSession() {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") return;
  window.sessionStorage.setItem(PUSH_PROMPT_DISMISSED_SESSION_KEY, "true");
}

function clearDismissedPromptThisSession() {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") return;
  window.sessionStorage.removeItem(PUSH_PROMPT_DISMISSED_SESSION_KEY);
}

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [registerPushDevice] = useRegisterPushDeviceMutation();
  const [unregisterPushDevice] = useUnregisterPushDeviceMutation();
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied",
  );
  const [supported, setSupported] = useState(false);
  const [token, setToken] = useState<string | null>(() => getStoredPushToken());
  const [registered, setRegistered] = useState(Boolean(getStoredPushToken()));
  const [loading, setLoading] = useState(false);
  const [paused, setPausedState] = useState(isPushPaused());
  const [lastError, setLastError] = useState<string | null>(null);
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const messagingUnsubscribeRef = useRef<(() => void) | null>(null);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const syncingRef = useRef(false);

  const configured = hasFirebaseWebPushConfig();
  const isAuthed =
    typeof window !== "undefined" && Boolean(window.localStorage.getItem("accessToken"));

  const refreshNotifications = useCallback(() => {
    dispatch(
      notificationsApi.util.invalidateTags([
        { type: "Notifications", id: "LIST" },
        { type: "Counters", id: "COUNTERS" },
      ]),
    );
  }, [dispatch]);

  const handlePushNavigation = useCallback(
    (data: PushNavigationData) => {
      navigate(getNotificationNavigationPath(asNotificationItem(data)), { replace: true });
    },
    [navigate],
  );

  const registerServiceWorker = useCallback(async () => {
    if (swRegistrationRef.current) return swRegistrationRef.current;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

    const registration = await navigator.serviceWorker.register("/push-sw.js");
    swRegistrationRef.current = registration;
    return registration;
  }, []);

  const syncPushRegistration = useCallback(async () => {
    if (!isAuthed || paused || !configured || syncingRef.current) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") {
      updatePermissionState(setPermission);
      return;
    }

    syncingRef.current = true;
    setLoading(true);
    setLastError(null);

    try {
      const registration = await registerServiceWorker();
      const messaging = await getFirebaseMessagingClient();

      if (!registration || !messaging) {
        throw new Error("This browser does not support Firebase web messaging");
      }

      const nextToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (!nextToken) {
        throw new Error("Firebase did not return a web push token");
      }

      await registerPushDevice({
        token: nextToken,
        platform: "web",
        deviceId: getOrCreatePushDeviceId(),
        deviceName: getBrowserDeviceName(),
        appVersion: getAppVersion(),
        locale: typeof navigator !== "undefined" ? navigator.language : undefined,
        timezone:
          typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : undefined,
      }).unwrap();

      setStoredPushToken(nextToken);
      setToken(nextToken);
      setRegistered(true);
      refreshNotifications();
    } catch (error: any) {
      const message =
        error?.message ||
        error?.data?.message ||
        "Unable to enable push notifications in this browser";
      setLastError(message);
      setRegistered(false);
    } finally {
      syncingRef.current = false;
      setLoading(false);
    }
  }, [configured, isAuthed, paused, refreshNotifications, registerPushDevice, registerServiceWorker]);

  const disablePush = useCallback(async () => {
    const currentToken = getStoredPushToken();
    const currentDeviceId = getOrCreatePushDeviceId();

    setLoading(true);
    setLastError(null);

    try {
      if (isAuthed && (currentToken || currentDeviceId)) {
        await unregisterPushDevice({
          token: currentToken || undefined,
          deviceId: currentToken ? undefined : currentDeviceId,
        }).unwrap();
      }
    } catch (error: any) {
      const message =
        error?.message || error?.data?.message || "Failed to unregister this browser for push";
      setLastError(message);
    } finally {
      setPushPaused(true);
      setPausedState(true);
      clearAutoPromptedThisSession();
      clearDismissedPromptThisSession();
      clearStoredPushRegistration();
      setToken(null);
      setRegistered(false);
      setLoading(false);
      refreshNotifications();
    }
  }, [isAuthed, refreshNotifications, unregisterPushDevice]);

  const requestPermissionFromGesture = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setLastError("This browser does not support notifications");
      return "denied";
    }

    if (Notification.permission !== "default") {
      setPermission(Notification.permission);
      return Notification.permission;
    }

    setLastError(null);
    markAutoPromptedThisSession();

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setLastError("Notification permission was not granted");
      }
      return result;
    } catch (error: any) {
      const message =
        error?.message || error?.data?.message || "Unable to request notification permission";
      setLastError(message);
      return "denied";
    }
  }, []);

  const cleanupPushSession = useCallback(async () => {
    const currentToken = getStoredPushToken();
    const currentDeviceId = getOrCreatePushDeviceId();

    setLoading(true);
    setLastError(null);

    try {
      if (isAuthed && (currentToken || currentDeviceId)) {
        await unregisterPushDevice({
          token: currentToken || undefined,
          deviceId: currentToken ? undefined : currentDeviceId,
        }).unwrap();
      }
    } catch (error: any) {
      const message =
        error?.message || error?.data?.message || "Failed to unregister this browser for push";
      setLastError(message);
    } finally {
      setPushPaused(false);
      setPausedState(false);
      clearAutoPromptedThisSession();
      clearDismissedPromptThisSession();
      clearStoredPushRegistration();
      setToken(null);
      setRegistered(false);
      setLoading(false);
      refreshNotifications();
    }
  }, [isAuthed, refreshNotifications, unregisterPushDevice]);

  const enablePush = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setLastError("This browser does not support notifications");
      return false;
    }

    setLoading(true);
    setLastError(null);

    try {
      const result = await requestPermissionFromGesture();
      setPermission(result);

      if (result !== "granted") {
        setLastError("Notification permission was not granted");
        return false;
      }

      setPushPaused(false);
      setPausedState(false);
      await syncPushRegistration();
      return true;
    } catch (error: any) {
      const message =
        error?.message || error?.data?.message || "Unable to request notification permission";
      setLastError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [requestPermissionFromGesture, syncPushRegistration]);

  const clearPushError = useCallback(() => {
    setLastError(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!configured || typeof window === "undefined") {
        if (mounted) setSupported(false);
        return;
      }

      const messaging = await getFirebaseMessagingClient();
      if (!mounted) return;
      setSupported(Boolean(messaging && "serviceWorker" in navigator && "Notification" in window));
    })();

    return () => {
      mounted = false;
    };
  }, [configured]);

  useEffect(() => {
    updatePermissionState(setPermission);
  }, []);

  useEffect(() => {
    if (!supported || !configured) return;

    let cancelled = false;

    (async () => {
      const messaging = await getFirebaseMessagingClient();
      if (!messaging || cancelled) return;

      messagingUnsubscribeRef.current?.();
      messagingUnsubscribeRef.current = onMessage(messaging, (payload) => {
        const data = getNotificationPayloadData(payload);
        refreshNotifications();

        if (typeof document !== "undefined" && document.hidden && Notification.permission === "granted") {
          const browserNotification = new Notification(
            payload.notification?.title || "EKAM Notification",
            {
              body: payload.notification?.body || "",
              icon: "/ekam-favicon.png",
            },
          );

          browserNotification.onclick = () => {
            window.focus();
            handlePushNavigation(data);
            browserNotification.close();
          };
          return;
        }

        showToast({
          title: payload.notification?.title || "New notification",
          description: payload.notification?.body || "Open notifications to view details.",
          kind: "info",
          durationMs: 5000,
        });
      });
    })();

    return () => {
      cancelled = true;
      messagingUnsubscribeRef.current?.();
      messagingUnsubscribeRef.current = null;
    };
  }, [configured, handlePushNavigation, refreshNotifications, showToast, supported]);

  useEffect(() => {
    if (!supported || !configured || !isAuthed || paused) return;
    void syncPushRegistration();
  }, [configured, isAuthed, paused, supported, syncPushRegistration]);

  useEffect(() => {
    const dismissedThisSession = hasDismissedPromptThisSession();
    const shouldShow =
      supported &&
      configured &&
      isAuthed &&
      !paused &&
      !registered &&
      permission === "default" &&
      location.pathname !== "/login" &&
      location.pathname !== "/" &&
      !dismissedThisSession;

    setIsPromptVisible(shouldShow);
  }, [
    configured,
    isAuthed,
    location.pathname,
    paused,
    permission,
    registered,
    supported,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== "push-notification-click" || !event.data?.payload) return;
      refreshNotifications();
      handlePushNavigation(event.data.payload as PushNavigationData);
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [handlePushNavigation, refreshNotifications]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("push");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as PushNavigationData;
      refreshNotifications();
      handlePushNavigation(parsed);
    } catch {
      navigate(location.pathname, { replace: true });
    }
  }, [handlePushNavigation, location.pathname, location.search, navigate, refreshNotifications]);

  const value = useMemo<PushManagerState>(
    () => ({
      supported,
      configured,
      permission,
      token,
      registered,
      loading,
      paused,
      lastError,
      requestPermissionFromGesture,
      enablePush,
      disablePush,
      cleanupPushSession,
      syncPushRegistration,
      clearPushError,
    }),
    [
      clearPushError,
      configured,
      disablePush,
      cleanupPushSession,
      enablePush,
      lastError,
      requestPermissionFromGesture,
      loading,
      paused,
      permission,
      registered,
      supported,
      syncPushRegistration,
      token,
    ],
  );

  return (
    <PushNotificationsContext.Provider value={value}>
      {children}
      {isPromptVisible ? (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/50 p-4">
          <GradientContainer className="w-full max-w-md shadow-2xl" innerClassName="rounded-[14px] p-6 text-white">
            <h2 className="text-xl font-semibold">Enable Notifications</h2>
            <p className="mt-2 text-sm leading-6 text-white/75">
              You are signed in. Enable browser notifications now so EKAM can alert you about chat,
              meetings, approvals, and system updates.
            </p>

            {lastError ? (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {lastError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  dismissPromptThisSession();
                  setIsPromptVisible(false);
                }}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white"
              >
                Later
              </button>
              <button
                type="button"
                onClick={async () => {
                  const result = await requestPermissionFromGesture();
                  if (result === "granted") {
                    await syncPushRegistration();
                    clearDismissedPromptThisSession();
                    setIsPromptVisible(false);
                  }
                }}
                className="rounded-lg bg-[#D85D27] px-4 py-2 text-sm font-medium text-white"
              >
                Enable Now
              </button>
            </div>
          </GradientContainer>
        </div>
      ) : null}
    </PushNotificationsContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationsContext);
  if (!context) {
    throw new Error("usePushNotifications must be used within PushNotificationsProvider");
  }
  return context;
}
