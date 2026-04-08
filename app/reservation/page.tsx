import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { ReservationForm } from "@/components/reservation-form";
import { getSiteSettings } from "@/lib/db";

export const metadata: Metadata = {
  title: "Réservation",
  description: "Réservez votre place dans le programme spécial 2ème bac.",
};

export const dynamic = "force-dynamic";

export default async function ReservationPage() {
  const settings = await getSiteSettings();
  if (settings.maintenanceMode) {
    redirect("/maintenance");
  }
  const enabledFormats = settings.courseFormats.filter((format) => format.enabled);

  return (
    <main className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition hover:text-cyan-200">
          <ArrowLeft className="h-4 w-4" />
          Retour à l’accueil
        </Link>

        <div className="mt-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">Réservation</p>
            <h1 className="font-heading text-3xl font-semibold text-white sm:text-4xl">Programme spécial 2ème bac</h1>
            <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              Remplissez le formulaire pour intégrer un groupe adapté au niveau réel de l’élève: bon niveau ou niveau à renforcer.
            </p>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-7 backdrop-blur">
              <h2 className="text-xl font-semibold text-white">Ce qui se passe après votre envoi</h2>
              <ul className="mt-4 space-y-3 text-slate-300">
                <li>Votre demande est enregistrée automatiquement dans la base de données.</li>
                <li>L’administrateur la classe dans le bon groupe 2ème bac.</li>
                <li>Le suivi et la relance peuvent se faire directement via WhatsApp.</li>
              </ul>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-7 backdrop-blur">
              <h2 className="text-xl font-semibold text-white">Formats de cours disponibles</h2>
              <ul className="mt-4 space-y-3 text-slate-300">
                {enabledFormats.map((format) => (
                  <li key={format.id}>{format.label}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-7 backdrop-blur">
              <h2 className="text-xl font-semibold text-white">Organisation avec le professeur</h2>
              <p className="mt-4 leading-7 text-slate-300">{settings.professorNote}</p>
            </div>
          </section>

          <ReservationForm courseFormats={enabledFormats} directWhatsapp={settings.directWhatsapp} />
        </div>
      </div>
    </main>
  );
}
