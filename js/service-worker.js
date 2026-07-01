const CACHE_NAME = "nexus-v1-pwa-logo-1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  return;
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Nexus",
    body: "Você recebeu uma nova notificação.",
    url: "./pages/app-staff.html?v=nexus-v1-admin-pages-1"
  };

  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (error) {
    payload.body = event.data ? event.data.text() : payload.body;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Nexus", {
      body: payload.body || "",
      icon: "./assets/logo-192.png?v=nexus-v1-admin-pages-1",
      badge: "./assets/logo-192.png?v=nexus-v1-admin-pages-1",
      data: { url: payload.url || "./pages/app-staff.html?v=nexus-v1-admin-pages-1" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "./pages/app-staff.html?v=nexus-v1-admin-pages-1";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
