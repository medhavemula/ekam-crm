self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function buildNotificationData(payload) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : {};
  return {
    ...data,
    title: payload?.notification?.title || payload?.title || data.title || "EKAM Notification",
    body: payload?.notification?.body || payload?.body || data.body || "",
  };
}

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};

  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: "EKAM Notification", body: event.data.text() } };
  }

  const notification = payload.notification || {};
  const data = buildNotificationData(payload);

  event.waitUntil(
    self.registration.showNotification(notification.title || data.title || "EKAM Notification", {
      body: notification.body || data.body || "",
      icon: notification.icon || data.icon || "/ekam-favicon.png",
      badge: notification.badge || "/ekam-favicon.png",
      data,
      tag: data.notificationId || data.entityId || undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const payload = event.notification.data || {};
  const targetUrl = new URL(
    `/notifications?push=${encodeURIComponent(JSON.stringify(payload))}`,
    self.location.origin,
  ).toString();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: "push-notification-click", payload });
        if ("focus" in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
