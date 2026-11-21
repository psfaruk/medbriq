/**
 * MedBricBD — Firebase Cloud Messaging service worker.
 *
 * Delivers web-push notifications while the site is in the background and
 * focuses/opens the target URL on click. Uses the firebase *compat* builds
 * via importScripts (the standard FCM pattern) so no bundler step is
 * needed for this static file.
 *
 * NOTE: the config below is the PUBLIC web-app config of the Firebase
 * project "medifindbd" (apiKey etc. are public identifiers — this is safe
 * by design, exactly like the NEXT_PUBLIC_ env vars).
 */

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCdyODx5j8_2FeTvxw8mKDW6DqCT7gvjCg",
  authDomain: "medifindbd.firebaseapp.com",
  projectId: "medifindbd",
  storageBucket: "medifindbd.firebasestorage.app",
  messagingSenderId: "292597368564",
  appId: "1:292597368564:web:714702c514157111bdc0a1",
});

const messaging = firebase.messaging();

// Background message → OS/browser notification.
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "MedBricBD";
  const body = (payload.notification && payload.notification.body) || "";
  const url = payload.data && payload.data.url;
  self.registration.showNotification(title, {
    body,
    icon: "/logo.svg",
    badge: "/logo.svg",
    data: url ? { url } : undefined,
  });
});

// Click → focus an existing tab (or open one) at the notification's URL.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if (url !== "/" && "navigate" in client) {
            client.navigate(url);
          }
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
