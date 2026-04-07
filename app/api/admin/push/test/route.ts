import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { sendPushTestNotification } from "@/lib/push";

export async function POST() {
  await requireAdminSession();

  try {
    await sendPushTestNotification();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Envoi du test push impossible.") }, { status: 500 });
  }
}
