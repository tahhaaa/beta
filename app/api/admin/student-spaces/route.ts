import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { getReservations, getStudentSpaces } from "@/lib/db";

export async function GET() {
  await requireAdminSession();

  try {
    const [reservations, studentSpaces] = await Promise.all([getReservations(), getStudentSpaces()]);
    const payload = studentSpaces.map((space) => ({
      ...space,
      reservation: reservations.find((reservation) => reservation.id === space.reservationId) ?? null,
    }));

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de charger les espaces élèves.") }, { status: 500 });
  }
}
