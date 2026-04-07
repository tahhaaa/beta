import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { deletePushSubscriptionByEndpoint, upsertPushSubscription } from "@/lib/db";
import { canUsePushNotifications, getPublicVapidKey, type StoredPushSubscription } from "@/lib/push";

function isValidSubscription(value: unknown): value is StoredPushSubscription {
  if (!value || typeof value !== "object") {
    return false;
  }

  const subscription = value as StoredPushSubscription;
  return Boolean(subscription.endpoint && subscription.keys?.auth && subscription.keys?.p256dh);
}

export async function GET() {
  await requireAdminSession();
  return NextResponse.json({
    enabled: canUsePushNotifications(),
    publicKey: getPublicVapidKey(),
  });
}

export async function POST(request: Request) {
  await requireAdminSession();

  try {
    const body = (await request.json()) as unknown;
    if (!isValidSubscription(body)) {
      return NextResponse.json({ message: "Abonnement push invalide." }, { status: 400 });
    }

    await upsertPushSubscription(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Activation push impossible.") }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await requireAdminSession();

  try {
    const body = (await request.json()) as { endpoint?: string };
    if (!body?.endpoint) {
      return NextResponse.json({ message: "Endpoint manquant." }, { status: 400 });
    }

    await deletePushSubscriptionByEndpoint(body.endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Désactivation push impossible.") }, { status: 500 });
  }
}
