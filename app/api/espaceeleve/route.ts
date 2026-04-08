import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import {
  getReservationById,
  getStudentPortalSessions,
  getStudentPortalTasks,
  getStudentSpaceByCode,
} from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") ?? "").trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ message: "Code élève requis." }, { status: 400 });
  }

  try {
    const studentSpace = await getStudentSpaceByCode(code);
    if (!studentSpace || !studentSpace.portalActive) {
      return NextResponse.json({ message: "Aucun espace élève actif trouvé avec ce code." }, { status: 404 });
    }

    const [reservation, sessions, tasks] = await Promise.all([
      getReservationById(studentSpace.reservationId),
      getStudentPortalSessions(studentSpace.id),
      getStudentPortalTasks(studentSpace.id),
    ]);

    return NextResponse.json({
      studentSpace,
      reservation,
      sessions,
      tasks,
    });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de charger cet espace élève.") }, { status: 500 });
  }
}
