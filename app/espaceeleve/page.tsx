import type { Metadata } from "next";
import { StudentPortalAccess } from "@/components/student-portal-access";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteSettings } from "@/lib/db";

export const metadata: Metadata = {
  title: "Espace élève",
  description: "Accès élève avec identifiant unique pour consulter séances, tâches et fichiers.",
};

export const dynamic = "force-dynamic";

export default async function EspaceElevePage() {
  const settings = await getSiteSettings();

  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <StudentPortalAccess />
      </section>
      <SiteFooter directWhatsapp={settings.directWhatsapp} />
    </main>
  );
}
