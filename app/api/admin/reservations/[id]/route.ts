import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { deleteReservation, updateReservation, writeAutomaticBackupSnapshot } from "@/lib/db";
import { reservationUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await context.params;
  const body = await request.json();
  const parsed = reservationUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Réservation invalide." }, { status: 400 });
  }

  try {
    const reservation = await updateReservation(Number(id), parsed.data);
    await writeAutomaticBackupSnapshot();
    return NextResponse.json(reservation);
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Mise à jour impossible.") }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await context.params;
  try {
    await deleteReservation(Number(id));
    await writeAutomaticBackupSnapshot();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Suppression impossible.") }, { status: 500 });
  }
}
