import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { getStore } from "@/lib/data";
import { parseServiceAccountEnv } from "@/lib/data/firestore-store";

/**
 * Server-side web-push dispatch (Firebase Cloud Messaging).
 *
 * The client registers FCM tokens via POST /api/v1/push/subscribe (see
 * src/lib/firebase.ts + public/firebase-messaging-sw.js on the client side);
 * `notifyUser` in src/app/api/v1/_lib/booking.ts calls `sendPushToUser`
 * after persisting the in-app notification so every in-app notification
 * also reaches subscribed browsers, even in the background.
 *
 * Configuration: FIREBASE_SERVICE_ACCOUNT (same JSON the Firestore store
 * uses). When it is absent (local dev) push is a logged no-op.
 */

const globalForPush = globalThis as unknown as {
  __medbriqFcmMessaging: Messaging | null | undefined;
  __medbriqPushProjectMismatchWarned: boolean | undefined;
};

function getMessagingFromEnv(): Messaging | null {
  if (globalForPush.__medbriqFcmMessaging !== undefined) {
    return globalForPush.__medbriqFcmMessaging;
  }
  const serviceAccount = parseServiceAccountEnv() as
    | { project_id?: string }
    | null;
  if (!serviceAccount) {
    console.warn(
      "[medbriq-push] FIREBASE_SERVICE_ACCOUNT not set — web push disabled."
    );
    globalForPush.__medbriqFcmMessaging = null;
    return null;
  }
  const app: App = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount as Parameters<typeof cert>[0]),
      });
  globalForPush.__medbriqFcmMessaging = getMessaging(app);

  // FCM tokens are project-scoped: they can only be delivered by the SAME
  // Firebase project the client app used to register them. Detect the
  // misconfiguration loudly (it is the #1 "push silently fails" cause).
  const clientProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const serverProject = serviceAccount.project_id;
  if (
    clientProject &&
    serverProject &&
    clientProject !== serverProject &&
    !globalForPush.__medbriqPushProjectMismatchWarned
  ) {
    globalForPush.__medbriqPushProjectMismatchWarned = true;
    console.error(
      `[medbriq-push] CONFIG MISMATCH: client tokens belong to Firebase project ` +
        `"${clientProject}" (NEXT_PUBLIC_FIREBASE_PROJECT_ID) but the server ` +
        `sends via "${serverProject}" (FIREBASE_SERVICE_ACCOUNT). FCM will ` +
        `reject every send with SENDER_ID_MISMATCH. Align both sides on ONE ` +
        `project (service account JSON + web app config + VAPID key).`
    );
  }
  return globalForPush.__medbriqFcmMessaging;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Deep link opened on click (client route path, e.g. "/"). */
  url?: string;
}

/**
 * Fire-and-forget push to every registered device of a user. Failures are
 * logged and never thrown — push is a best-effort side channel, the in-app
 * notification in the bell remains the source of truth.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  try {
    const messaging = getMessagingFromEnv();
    if (!messaging) return;

    const tokens = await getStore().listPushTokens(userId);
    if (tokens.length === 0) return;

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.url ? { url: payload.url } : undefined,
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: "/logo.svg",
          badge: "/logo.svg",
        },
        fcmOptions: { link: payload.url },
      },
    });

    // Prune tokens FCM considers dead (uninstalled, expired, invalid).
    const deadTokens: string[] = [];
    response.responses.forEach((result, index) => {
      if (!result.success && result.error) {
        const code = (result.error as { code?: string }).code ?? "";
        if (
          code.includes("UNREGISTERED") ||
          code.includes("INVALID_ARGUMENT") ||
          code.includes("SENDER_ID_MISMATCH")
        ) {
          deadTokens.push(tokens[index]);
        }
        if (code.includes("SENDER_ID_MISMATCH")) {
          console.error(
            "[medbriq-push] SENDER_ID_MISMATCH — client tokens and the " +
              "server service account belong to different Firebase projects " +
            "(see the CONFIG MISMATCH log above)."
          );
        }
      }
    });
    if (deadTokens.length > 0) {
      await Promise.all(deadTokens.map((token) => getStore().removePushToken(token)));
    }
  } catch (err) {
    console.error("[medbriq-push] dispatch failed:", err);
  }
}
