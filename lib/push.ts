import webpush from "web-push";
import { deletePushSubscriptionByEndpoint, getPushSubscriptions } from "@/lib/db";
import type { Reservation } from "@/lib/types";

type StoredPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@beta-physique.local";

function isPushConfigured() {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

function configureWebPush() {
  if (!isPushConfigured()) {
    throw new Error("Les clés VAPID ne sont pas configurées.");
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export function getPublicVapidKey() {
  return VAPID_PUBLIC_KEY;
}

export function canUsePushNotifications() {
  return isPushConfigured();
}

export async function sendReservationPushNotification(reservation: Reservation) {
  if (!isPushConfigured()) {
    return;
  }

  configureWebPush();
  const subscriptions = await getPushSubscriptions();
  const payload = JSON.stringify({
    title: "Nouvelle réservation",
    body: `${reservation.studentName} - ${reservation.level} - ${reservation.courseFormat}`,
    url: "/admin#reservations",
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscriptionByEndpoint(subscription.endpoint);
        }
      }
    }),
  );
}

export async function sendPushTestNotification() {
  if (!isPushConfigured()) {
    return;
  }

  configureWebPush();
  const subscriptions = await getPushSubscriptions();

  const payload = JSON.stringify({
    title: "Test notification push",
    body: "Le systeme push βeta Physique fonctionne correctement.",
    url: "/admin",
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscriptionByEndpoint(subscription.endpoint);
        }
      }
    }),
  );
}

export type { StoredPushSubscription };
