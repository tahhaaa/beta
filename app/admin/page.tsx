import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getDashboardStats, getReservations, getSiteSettings, getStudentSessions, getStudentTasks } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard admin",
  description: "Gestion sécurisée des réservations et des bénéfices.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  await requireAdminSession();
  const [initialReservations, initialStats, initialSettings, initialStudentSessions, initialStudentTasks] = await Promise.all([
    getReservations(),
    getDashboardStats(),
    getSiteSettings(),
    getStudentSessions(),
    getStudentTasks(),
  ]);

  return (
    <main className="min-h-screen px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminDashboard
          initialReservations={initialReservations}
          initialStats={initialStats}
          initialSettings={initialSettings}
          initialStudentSessions={initialStudentSessions}
          initialStudentTasks={initialStudentTasks}
        />
      </div>
    </main>
  );
}
