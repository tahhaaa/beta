import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { confirmReservation, ensureStudentSpaceForReservation, writeAutomaticBackupSnapshot } from "@/lib/db";
import { SITE_URL } from "@/lib/constants";
import { getWhatsappLink } from "@/lib/utils";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await context.params;
  try {
    const reservation = await confirmReservation(Number(id));
    if (!reservation) {
      return NextResponse.json({ message: "Réservation introuvable." }, { status: 404 });
    }

    const studentSpace = await ensureStudentSpaceForReservation(reservation);
    if (!studentSpace) {
      return NextResponse.json({ message: "Impossible de créer l'accès élève." }, { status: 500 });
    }

    const portalUrl = "https://betaaa.vercel.app/espaceeleve";
    const whatsappLink = getWhatsappLink(
      reservation.whatsapp,
      `Bonjour ${reservation.studentName} 👋\n\nVotre inscription est confirmée chez βeta Physique ✅\n\nVotre identifiant unique est: ${studentSpace.accessCode}\nAccès élève: ${portalUrl}\n\nEntrez ce code dans l'espace élève pour consulter vos séances, exercices et tâches 📚⚡`,
    );
    await writeAutomaticBackupSnapshot();
    return NextResponse.json({ reservation, studentSpace, whatsappLink });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Confirmation impossible.") }, { status: 500 });
  }
}
