/**
 * Client-side Firebase (web) bootstrap for Web Push (FCM).
 *
 * Configuration comes from NEXT_PUBLIC_FIREBASE_* env vars (set in Vercel +
 * .env.local). The firebase web SDK is loaded via dynamic import so it is
 * code-split out of the main bundle — it is only fetched when a user
 * actually enables push notifications.
 *
 * Server counterpart: src/lib/push.ts + POST /api/v1/push/subscribe.
 * Background delivery: public/firebase-messaging-sw.js.
 */

import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Messaging } from "firebase/messaging";

export function firebaseWebConfig(): Record<string, string> | null {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };
  return config.apiKey && config.projectId && config.appId ? config : null;
}

/** Web-push is only usable on HTTPS + supported browsers (not iOS Safari PWA-less). */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window
  );
}

let appPromise: Promise<FirebaseApp> | null = null;

async function getFirebaseApp(): Promise<FirebaseApp> {
  const config = firebaseWebConfig();
  if (!config) throw new Error("Firebase web config missing.");
  if (!appPromise) {
    appPromise = (async () => {
      const { initializeApp, getApps, getApp } = await import("firebase/app");
      return getApps().length ? getApp() : initializeApp(config);
    })();
  }
  return appPromise;
}

async function getMessaging(): Promise<Messaging> {
  const app = await getFirebaseApp();
  const { getMessaging: init } = await import("firebase/messaging");
  return init(app);
}

/**
 * Firebase Auth client for the Google sign-in popup flow. Reuses the same
 * FirebaseApp as push messaging — one app, one config. The Google provider
 * must be enabled in the Firebase console (Authentication → Sign-in method)
 * and the deployment domain must be in the authorized-domains list.
 */
async function getFirebaseAuth(): Promise<Auth> {
  const app = await getFirebaseApp();
  const { getAuth } = await import("firebase/auth");
  return getAuth(app);
}

/**
 * Real Google sign-in: Firebase Auth popup → ID token → server verifies it
 * with firebase-admin (see src/lib/google.ts) and mints the app session.
 * Returns the ID token, or null with a human-readable `reason` when the
 * flow cannot complete (popup dismissed, provider not enabled, domain not
 * authorized, no config).
 */
export async function googlePopupSignIn(): Promise<{
  idToken: string | null;
  reason: string;
}> {
  const config = firebaseWebConfig();
  if (!config) {
    return {
      idToken: null,
      reason: "Google sign-in is not configured yet — use email or phone for now.",
    };
  }
  try {
    const auth = await getFirebaseAuth();
    const { GoogleAuthProvider, signInWithPopup } = await import(
      "firebase/auth"
    );
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    const idToken = await credential.user.getIdToken();
    return { idToken, reason: "" };
  } catch (err) {
    const code = (err as { code?: string } | null)?.code ?? "firebase/unknown";
    if (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request" ||
      code === "auth/user-cancelled"
    ) {
      return { idToken: null, reason: "cancelled" };
    }
    if (code === "auth/configuration-not-found") {
      return {
        idToken: null,
        reason:
          "Google sign-in is not enabled yet — the platform admin must turn on Google in the Firebase console (Authentication → Sign-in method).",
      };
    }
    if (
      code === "auth/unauthorized-domain" ||
      code === "auth/operation-not-allowed"
    ) {
      return {
        idToken: null,
        reason:
          "This domain is not authorized for Google sign-in yet — the platform admin must add it in the Firebase console (Authentication → Settings → Authorized domains).",
      };
    }
    return {
      idToken: null,
      reason: "Google sign-in could not be completed. Please try again or use email.",
    };
  }
}

export interface SubscribeResult {
  ok: boolean;
  reason?:
    | "unsupported"
    | "no-config"
    | "permission-denied"
    | "no-token"
    | "registration-failed";
}

/**
 * Ask the user for notification permission, obtain an FCM token and
 * register it with the server. Idempotent: safe to call when already
 * granted (refreshes the token registration).
 */
export async function subscribeToPush(): Promise<SubscribeResult> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  const config = firebaseWebConfig();
  if (!config) return { ok: false, reason: "no-config" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "permission-denied" };

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_PUSH_VAPID_KEY;
  const messaging = await getMessaging();
  const { getToken } = await import("firebase/messaging");

  let token: string;
  try {
    token = await getToken(messaging, vapidKey ? { vapidKey } : undefined);
  } catch {
    return { ok: false, reason: "no-token" };
  }
  if (!token) return { ok: false, reason: "no-token" };

  // NOTE(firebase v13): onTokenRefresh was removed from the messaging API —
  // the service worker (public/firebase-messaging-sw.js) and the idempotent
  // server registration keep the token fresh instead.

  const registered = await registerToken(token);
  return registered
    ? { ok: true }
    : { ok: false, reason: "registration-failed" };
}

async function registerToken(token?: string): Promise<boolean> {
  try {
    let value = token;
    if (!value) {
      const messaging = await getMessaging();
      const { getToken } = await import("firebase/messaging");
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_PUSH_VAPID_KEY;
      value = await getToken(messaging, vapidKey ? { vapidKey } : undefined);
    }
    if (!value) return false;
    const res = await fetch("/api/v1/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: value, platform: "web" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Foreground message display. When the tab is open, FCM does NOT show the
 * notification automatically — surface it through the service worker's
 * showNotification (same look as background notifications).
 */
export async function listenForForegroundPush(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== "granted") return;
  try {
    const messaging = await getMessaging();
    const { onMessage } = await import("firebase/messaging");
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? "Find Medi Doctor";
      const body = payload.notification?.body ?? "";
      const url = payload.data?.url;
      void navigator.serviceWorker.ready.then((registration) => {
        void registration.showNotification(title, {
          body,
          icon: "/logo.svg",
          badge: "/logo.svg",
          data: url ? { url } : undefined,
        });
      });
    });
  } catch {
    // Non-fatal: background push still works via the service worker.
  }
}
