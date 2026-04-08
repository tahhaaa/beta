import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StudentSpaceAdmin } from "@/components/student-space-admin";
import { requireAdminSession } from "@/lib/auth";
import { getReservations, getStudentSpaces } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin espace élève",
  description: "Gestion des codes d'accès, séances, tâches et ressources des élèves confirmés.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminEspaceElevePage() {
  await requireAdminSession();
  const [reservations, studentSpaces] = await Promise.all([getReservations(), getStudentSpaces()]);

  const initialSpaces = studentSpaces.map((space) => ({
    ...space,
    reservation: reservations.find((reservation) => reservation.id === space.reservationId) ?? null,
  }));

  return (
    <main className="min-h-screen px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition hover:text-cyan-200">
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard admin
        </Link>
        <StudentSpaceAdmin initialSpaces={initialSpaces} />
      </div>
    </main>
  );
}
