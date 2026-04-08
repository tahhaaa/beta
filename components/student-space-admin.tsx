"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ExternalLink, LoaderCircle, NotebookPen, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { Reservation, StudentPortalSession, StudentPortalTask, StudentSpace } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type StudentSpaceWithReservation = StudentSpace & {
  reservation: Reservation | null;
};

type StudentSpaceAdminProps = {
  initialSpaces: StudentSpaceWithReservation[];
};

export function StudentSpaceAdmin({ initialSpaces }: StudentSpaceAdminProps) {
  const [spaces, setSpaces] = useState(initialSpaces);
  const [selectedId, setSelectedId] = useState<number | null>(initialSpaces[0]?.id ?? null);
  const [sessions, setSessions] = useState<StudentPortalSession[]>([]);
  const [tasks, setTasks] = useState<StudentPortalTask[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [sessionForm, setSessionForm] = useState({ title: "", scheduledAt: "", instructions: "", fileUrl: "", status: "scheduled" as const });
  const [taskForm, setTaskForm] = useState({ title: "", dueAt: "", details: "", fileUrl: "", status: "todo" as const });
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);

  const selectedSpace = useMemo(() => spaces.find((space) => space.id === selectedId) ?? null, [selectedId, spaces]);

  async function loadContent(spaceId: number) {
    setIsLoadingContent(true);

    try {
      const [sessionsResponse, tasksResponse] = await Promise.all([
        fetch(`/api/admin/student-spaces/${spaceId}/sessions`, { cache: "no-store" }),
        fetch(`/api/admin/student-spaces/${spaceId}/tasks`, { cache: "no-store" }),
      ]);

      if (!sessionsResponse.ok || !tasksResponse.ok) {
        throw new Error("load");
      }

      setSessions((await sessionsResponse.json()) as StudentPortalSession[]);
      setTasks((await tasksResponse.json()) as StudentPortalTask[]);
    } catch {
      toast.error("Impossible de charger le contenu de cet espace élève.");
    } finally {
      setIsLoadingContent(false);
    }
  }

  async function handleSelect(spaceId: number) {
    setSelectedId(spaceId);
    await loadContent(spaceId);
  }

  async function handleSpaceUpdate(spaceId: number, payload: { portalActive: boolean; individualSessionsPerWeek: 1 | 2 }) {
    try {
      const response = await fetch(`/api/admin/student-spaces/${spaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        toast.error(result.message ?? "Impossible de mettre à jour cet espace élève.");
        return;
      }

      setSpaces((current) => current.map((space) => (space.id === spaceId ? { ...space, ...payload } : space)));
      toast.success("Configuration élève enregistrée.");
    } catch {
      toast.error("Impossible de mettre à jour cet espace élève.");
    }
  }

  async function handleCreateSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSpace) {
      return;
    }

    setIsSavingSession(true);
    try {
      const response = await fetch(`/api/admin/student-spaces/${selectedSpace.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sessionForm,
          scheduledAt: new Date(sessionForm.scheduledAt).toISOString(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        toast.error(payload.message ?? "Impossible de créer la séance.");
        return;
      }

      setSessionForm({ title: "", scheduledAt: "", instructions: "", fileUrl: "", status: "scheduled" });
      await loadContent(selectedSpace.id);
      toast.success("Séance ajoutée.");
    } catch {
      toast.error("Impossible de créer la séance.");
    } finally {
      setIsSavingSession(false);
    }
  }

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSpace) {
      return;
    }

    setIsSavingTask(true);
    try {
      const response = await fetch(`/api/admin/student-spaces/${selectedSpace.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskForm,
          dueAt: new Date(taskForm.dueAt).toISOString(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        toast.error(payload.message ?? "Impossible de créer la tâche.");
        return;
      }

      setTaskForm({ title: "", dueAt: "", details: "", fileUrl: "", status: "todo" });
      await loadContent(selectedSpace.id);
      toast.success("Tâche ajoutée.");
    } catch {
      toast.error("Impossible de créer la tâche.");
    } finally {
      setIsSavingTask(false);
    }
  }

  async function updateSessionStatus(id: number, status: StudentPortalSession["status"]) {
    try {
      await fetch(`/api/admin/student-portal-sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (selectedSpace) {
        await loadContent(selectedSpace.id);
      }
    } catch {
      toast.error("Impossible de mettre à jour la séance.");
    }
  }

  async function deleteSession(id: number) {
    try {
      await fetch(`/api/admin/student-portal-sessions/${id}`, { method: "DELETE" });
      if (selectedSpace) {
        await loadContent(selectedSpace.id);
      }
    } catch {
      toast.error("Impossible de supprimer la séance.");
    }
  }

  async function updateTaskStatus(id: number, status: StudentPortalTask["status"]) {
    try {
      await fetch(`/api/admin/student-portal-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (selectedSpace) {
        await loadContent(selectedSpace.id);
      }
    } catch {
      toast.error("Impossible de mettre à jour la tâche.");
    }
  }

  async function deleteTask(id: number) {
    try {
      await fetch(`/api/admin/student-portal-tasks/${id}`, { method: "DELETE" });
      if (selectedSpace) {
        await loadContent(selectedSpace.id);
      }
    } catch {
      toast.error("Impossible de supprimer la tâche.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Élèves confirmés</p>
        <h2 className="mt-2 font-heading text-2xl font-semibold text-white">Codes d’accès et rythme individuel</h2>
        <div className="mt-6 space-y-4">
          {spaces.length ? (
            spaces.map((space) => (
              <button
                key={space.id}
                type="button"
                onClick={() => handleSelect(space.id)}
                className={`w-full rounded-[1.6rem] border p-5 text-left transition ${
                  selectedSpace?.id === space.id
                    ? "border-cyan-300/40 bg-cyan-400/10"
                    : "border-white/10 bg-brand-950/45 hover:bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-lg font-semibold text-white">{space.reservation?.studentName ?? `Élève #${space.reservationId}`}</p>
                    <p className="mt-1 text-sm text-slate-300">{space.reservation?.courseFormat ?? "Format non défini"}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-cyan-300">{space.accessCode}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${space.portalActive ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>
                    {space.portalActive ? "Actif" : "Suspendu"}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center text-slate-400">
              Confirmez d’abord un élève depuis `/admin` pour générer son code d’accès.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
        {selectedSpace ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Admin espace élève</p>
                <h2 className="mt-2 font-heading text-2xl font-semibold text-white">{selectedSpace.reservation?.studentName ?? "Élève confirmé"}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Code: <span className="font-semibold text-cyan-200">{selectedSpace.accessCode}</span>
                </p>
              </div>
              <a href="/espaceeleve" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10">
                <ExternalLink className="h-4 w-4 text-cyan-300" />
                Voir la page élève
              </a>
            </div>

            <div className="grid gap-4 rounded-[1.6rem] border border-white/10 bg-brand-950/45 p-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm text-slate-200">Portail actif</span>
                <select
                  value={selectedSpace.portalActive ? "true" : "false"}
                  onChange={(event) =>
                    handleSpaceUpdate(selectedSpace.id, {
                      portalActive: event.target.value === "true",
                      individualSessionsPerWeek: selectedSpace.individualSessionsPerWeek,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-brand-950/60 px-4 py-3 text-white outline-none"
                >
                  <option value="true">Actif</option>
                  <option value="false">Suspendu</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-slate-200">Cours individuel: séances / semaine</span>
                <select
                  value={String(selectedSpace.individualSessionsPerWeek)}
                  onChange={(event) =>
                    handleSpaceUpdate(selectedSpace.id, {
                      portalActive: selectedSpace.portalActive,
                      individualSessionsPerWeek: Number(event.target.value) === 2 ? 2 : 1,
                    })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-brand-950/60 px-4 py-3 text-white outline-none"
                >
                  <option value="1">1 séance / semaine</option>
                  <option value="2">2 séances / semaine</option>
                </select>
              </label>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <form onSubmit={handleCreateSession} className="rounded-[1.6rem] border border-white/10 bg-brand-950/45 p-5">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-cyan-300" />
                  <h3 className="font-heading text-xl font-semibold text-white">Ajouter une séance</h3>
                </div>
                <div className="mt-4 space-y-4">
                  <Field label="Titre" value={sessionForm.title} onChange={(value) => setSessionForm((current) => ({ ...current, title: value }))} />
                  <DateTimeField label="Date et heure" value={sessionForm.scheduledAt} onChange={(value) => setSessionForm((current) => ({ ...current, scheduledAt: value }))} />
                  <TextareaField label="Consignes" value={sessionForm.instructions} onChange={(value) => setSessionForm((current) => ({ ...current, instructions: value }))} />
                  <Field label="Lien fichier / PDF / Drive" value={sessionForm.fileUrl} onChange={(value) => setSessionForm((current) => ({ ...current, fileUrl: value }))} />
                  <button type="submit" disabled={isSavingSession} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-semibold text-brand-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70">
                    {isSavingSession ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    Publier la séance
                  </button>
                </div>
              </form>

              <form onSubmit={handleCreateTask} className="rounded-[1.6rem] border border-white/10 bg-brand-950/45 p-5">
                <div className="flex items-center gap-3">
                  <NotebookPen className="h-5 w-5 text-cyan-300" />
                  <h3 className="font-heading text-xl font-semibold text-white">Ajouter une tâche</h3>
                </div>
                <div className="mt-4 space-y-4">
                  <Field label="Titre" value={taskForm.title} onChange={(value) => setTaskForm((current) => ({ ...current, title: value }))} />
                  <DateTimeField label="Date limite" value={taskForm.dueAt} onChange={(value) => setTaskForm((current) => ({ ...current, dueAt: value }))} />
                  <TextareaField label="Détails / exercices" value={taskForm.details} onChange={(value) => setTaskForm((current) => ({ ...current, details: value }))} />
                  <Field label="Lien fichier / PDF / Drive" value={taskForm.fileUrl} onChange={(value) => setTaskForm((current) => ({ ...current, fileUrl: value }))} />
                  <button type="submit" disabled={isSavingTask} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-semibold text-brand-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70">
                    {isSavingTask ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    Publier la tâche
                  </button>
                </div>
              </form>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-[1.6rem] border border-white/10 bg-brand-950/45 p-5">
                <h3 className="font-heading text-xl font-semibold text-white">Séances publiées</h3>
                {isLoadingContent ? <p className="mt-4 text-sm text-slate-400">Chargement...</p> : null}
                <div className="mt-4 space-y-4">
                  {sessions.length ? sessions.map((session) => (
                    <div key={session.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="font-semibold text-white">{session.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{formatDate(session.scheduledAt)}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{session.instructions}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => updateSessionStatus(session.id, "scheduled")} className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">Prévue</button>
                        <button type="button" onClick={() => updateSessionStatus(session.id, "done")} className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">Terminée</button>
                        <button type="button" onClick={() => updateSessionStatus(session.id, "cancelled")} className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">Reportée</button>
                        <button type="button" onClick={() => deleteSession(session.id)} className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">Supprimer</button>
                      </div>
                    </div>
                  )) : <EmptyBlock text="Aucune séance publiée pour cet élève." />}
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-white/10 bg-brand-950/45 p-5">
                <h3 className="font-heading text-xl font-semibold text-white">Tâches publiées</h3>
                {isLoadingContent ? <p className="mt-4 text-sm text-slate-400">Chargement...</p> : null}
                <div className="mt-4 space-y-4">
                  {tasks.length ? tasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="font-semibold text-white">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{formatDate(task.dueAt)}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{task.details}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => updateTaskStatus(task.id, "todo")} className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">À faire</button>
                        <button type="button" onClick={() => updateTaskStatus(task.id, "done")} className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">Fait</button>
                        <button type="button" onClick={() => deleteTask(task.id)} className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">Supprimer</button>
                      </div>
                    </div>
                  )) : <EmptyBlock text="Aucune tâche publiée pour cet élève." />}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.6rem] border border-dashed border-white/10 px-5 py-16 text-center text-slate-400">
            Sélectionnez un élève confirmé pour gérer son espace.
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-200">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-brand-950/60 px-4 py-3 text-white outline-none" />
    </label>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-200">{label}</span>
      <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-brand-950/60 px-4 py-3 text-white outline-none" />
    </label>
  );
}

function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-200">{label}</span>
      <input type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-brand-950/60 px-4 py-3 text-white outline-none" />
    </label>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center text-slate-400">{text}</div>;
}
