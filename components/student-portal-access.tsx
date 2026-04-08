"use client";

import { useState } from "react";
import { CalendarDays, KeyRound, LoaderCircle, Link2, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import type { Reservation, StudentPortalSession, StudentPortalTask, StudentSpace } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type PortalPayload = {
  studentSpace: StudentSpace;
  reservation: Reservation | null;
  sessions: StudentPortalSession[];
  tasks: StudentPortalTask[];
};

export function StudentPortalAccess() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [portal, setPortal] = useState<PortalPayload | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/espaceeleve?code=${encodeURIComponent(code.trim().toUpperCase())}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as PortalPayload & { message?: string };

      if (!response.ok) {
        toast.error(payload.message ?? "Code élève introuvable.");
        setPortal(null);
        return;
      }

      setPortal(payload);
      toast.success("Espace élève chargé.");
    } catch {
      toast.error("Impossible de charger l’espace élève.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Accès élève</p>
        <h2 className="mt-3 font-heading text-3xl font-semibold text-white">Entrez votre identifiant unique.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Après confirmation, le professeur vous envoie votre code personnel par WhatsApp. Entrez-le ici pour voir vos séances, tâches et fichiers.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="mb-2 block text-sm text-slate-200">Identifiant élève</span>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-brand-950/60 px-4 py-3">
              <KeyRound className="h-4 w-4 text-cyan-300" />
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Ex: BETA-TAHA-0007"
                className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-4 font-semibold text-brand-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70 sm:mt-0 sm:self-end"
          >
            {isLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
            Ouvrir mon espace
          </button>
        </div>
      </form>

      {portal ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-6 w-6 text-cyan-300" />
              <div>
                <h3 className="font-heading text-2xl font-semibold text-white">Séances planifiées</h3>
                <p className="text-sm text-slate-300">
                  {portal.reservation ? `${portal.reservation.studentName} • ${portal.reservation.courseFormat}` : "Planning personnel"}
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {portal.sessions.length ? (
                portal.sessions.map((session) => (
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
                    <p className="mt-4 text-sm leading-6 text-slate-200">{session.instructions}</p>
                    {session.fileUrl ? (
                      <a href={session.fileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300 transition hover:text-cyan-200">
                        <Link2 className="h-4 w-4" />
                        Ouvrir le fichier
                      </a>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyPortalState title="Aucune séance publiée" description="Votre professeur ajoutera ici les prochaines dates et les consignes." />
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
            <div className="flex items-center gap-3">
              <NotebookPen className="h-6 w-6 text-cyan-300" />
              <div>
                <h3 className="font-heading text-2xl font-semibold text-white">Exercices et tâches</h3>
                <p className="text-sm text-slate-300">Tout ce qu’il faut préparer avant les séances.</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {portal.tasks.length ? (
                portal.tasks.map((task) => (
                  <div key={task.id} className="rounded-[1.6rem] border border-white/10 bg-brand-950/45 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-heading text-lg font-semibold text-white">{task.title}</p>
                        <p className="mt-1 text-sm text-slate-300">À faire avant: {formatDate(task.dueAt)}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${task.status === "done" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>
                        {task.status === "done" ? "Fait" : "À faire"}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-200">{task.details}</p>
                    {task.fileUrl ? (
                      <a href={task.fileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300 transition hover:text-cyan-200">
                        <Link2 className="h-4 w-4" />
                        Ouvrir la ressource
                      </a>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyPortalState title="Aucune tâche publiée" description="Vos exercices et fichiers apparaîtront ici." />
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function EmptyPortalState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-brand-950/35 p-8 text-center">
      <p className="font-heading text-xl font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}
