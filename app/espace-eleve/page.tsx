import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, NotebookPen } from "lucide-react";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteSettings, getStudentSessions, getStudentTasks } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Espace élève",
  description: "Planning des séances, tâches à faire et consignes du professeur pour les élèves de βeta Physique.",
};

export const dynamic = "force-dynamic";

export default async function EspaceElevePage() {
  const [settings, sessions, tasks] = await Promise.all([getSiteSettings(), getStudentSessions(), getStudentTasks()]);

  if (settings.maintenanceMode) {
    redirect("/maintenance");
  }

  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">Espace élève</p>
          <h1 className="mt-3 font-heading text-4xl font-semibold text-white sm:text-5xl">Planning, tâches et consignes.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            Cet espace permet aux élèves de retrouver les prochaines séances, la date, l’heure et tout ce qu’il faut préparer avant chaque cours.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/reservation"
              className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-4 font-semibold text-brand-950 transition hover:bg-cyan-300"
            >
              Réserver une place
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-4 font-semibold text-white transition hover:bg-white/10"
            >
              Retour à l’accueil
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-6 w-6 text-cyan-300" />
              <div>
                <h2 className="font-heading text-2xl font-semibold text-white">Séances planifiées</h2>
                <p className="text-sm text-slate-300">Date, heure, groupe et consignes à suivre.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {sessions.length ? (
                sessions.map((session) => (
                  <div key={session.id} className="rounded-[1.6rem] border border-white/10 bg-brand-950/45 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-heading text-xl font-semibold text-white">{session.title}</p>
                        <p className="mt-1 text-sm text-slate-300">{formatDate(session.scheduledAt)}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${session.status === "done" ? "bg-emerald-400/15 text-emerald-300" : session.status === "cancelled" ? "bg-rose-400/15 text-rose-200" : "bg-cyan-400/15 text-cyan-200"}`}>
                        {session.status === "done" ? "Terminée" : session.status === "cancelled" ? "Reportée" : "Prévue"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Groupe: {session.level}</div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Format: {session.courseFormat}</div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-4 text-sm leading-6 text-cyan-50">
                      {session.instructions}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<Clock3 className="h-8 w-8 text-cyan-300" />}
                  title="Aucune séance publiée pour le moment"
                  description="Le planning apparaîtra ici dès que le professeur ajoutera les prochaines dates."
                />
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
              <div className="flex items-center gap-3">
                <NotebookPen className="h-6 w-6 text-cyan-300" />
                <div>
                  <h2 className="font-heading text-2xl font-semibold text-white">À faire</h2>
                  <p className="text-sm text-slate-300">Les tâches publiées par le professeur.</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {tasks.length ? (
                  tasks.map((task) => (
                    <div key={task.id} className="rounded-[1.6rem] border border-white/10 bg-brand-950/45 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-heading text-lg font-semibold text-white">{task.title}</p>
                          <p className="mt-1 text-sm text-slate-300">À faire avant: {formatDate(task.dueDate)}</p>
                        </div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${task.status === "done" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>
                          {task.status === "done" ? "Fait" : "À préparer"}
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-200">{task.details}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={<CheckCircle2 className="h-8 w-8 text-cyan-300" />}
                    title="Aucune tâche publiée"
                    description="Les exercices, leçons et devoirs à préparer apparaîtront ici."
                  />
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
              <h3 className="font-heading text-xl font-semibold text-white">Conseil du professeur</h3>
              <p className="mt-3 leading-7 text-slate-300">{settings.professorNote}</p>
            </div>
          </section>
        </div>
      </section>
      <SiteFooter directWhatsapp={settings.directWhatsapp} />
    </main>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-brand-950/35 p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-400/10">{icon}</div>
      <p className="mt-4 font-heading text-xl font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}
