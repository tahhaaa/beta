import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { confirmReservation, writeAutomaticBackupSnapshot } from "@/lib/db";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await context.params;
  try {
    const reservation = await confirmReservation(Number(id));
    await writeAutomaticBackupSnapshot();
    return NextResponse.json(reservation);
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Confirmation impossible.") }, { status: 500 });
  }
}
