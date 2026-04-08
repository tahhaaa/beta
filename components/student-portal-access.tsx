"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  CalendarPlus2,
  CheckCircle2,
  Clock3,
  Download,
  History,
  KeyRound,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  LogOut,
  NotebookPen,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import type { Reservation, StudentPortalSession, StudentPortalTask, StudentSpace } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type PortalPayload = {
  studentSpace: StudentSpace;
  reservation: Reservation | null;
  sessions: StudentPortalSession[];
  tasks: StudentPortalTask[];
};

type PortalTab = "dashboard" | "calendar" | "tasks" | "history" | "downloads";

const ACCESS_CODE_STORAGE_KEY = "beta-student-access-code";
const PORTAL_TABS: Array<{ id: PortalTab; label: string; icon: React.ReactNode }> = [
  { id: "dashboard", label: "Tableau de bord", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "calendar", label: "Calendrier", icon: <CalendarDays className="h-4 w-4" /> },
  { id: "tasks", label: "A rendre", icon: <NotebookPen className="h-4 w-4" /> },
  { id: "history", label: "Historique", icon: <History className="h-4 w-4" /> },
  { id: "downloads", label: "Telechargements", icon: <Download className="h-4 w-4" /> },
];

export function StudentPortalAccess() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [portal, setPortal] = useState<PortalPayload | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTab>("dashboard");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedCode = window.localStorage.getItem(ACCESS_CODE_STORAGE_KEY);
    if (!savedCode) {
      return;
    }

    setCode(savedCode);
    void loadPortal(savedCode, { silentSuccess: true, keepTab: true });
  }, []);

  const now = useMemo(() => new Date(), []);

  const nextSession = useMemo(() => {
    if (!portal) {
      return null;
    }

    return (
      [...portal.sessions]
        .filter((session) => session.status === "scheduled" && new Date(session.scheduledAt) >= now)
        .sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime())[0] ?? null
    );
  }, [now, portal]);

  const upcomingSessions = useMemo(() => {
    if (!portal) {
      return [];
    }

    return [...portal.sessions]
      .filter((session) => session.status === "scheduled" && new Date(session.scheduledAt) >= now)
      .sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());
  }, [now, portal]);

  const historySessions = useMemo(() => {
    if (!portal) {
      return [];
    }

    return [...portal.sessions]
      .filter((session) => session.status !== "scheduled" || new Date(session.scheduledAt) < now)
      .sort((left, right) => new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime());
  }, [now, portal]);

  const pendingTasks = useMemo(() => {
    if (!portal) {
      return [];
    }

    return [...portal.tasks]
      .filter((task) => task.status === "todo")
      .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
  }, [portal]);

  const completedTasks = useMemo(() => portal?.tasks.filter((task) => task.status === "done") ?? [], [portal]);

  const resources = useMemo(() => {
    if (!portal) {
      return [];
    }

    const items = [
      ...portal.sessions
        .filter((session) => session.fileUrl)
        .map((session) => ({
          id: `session-${session.id}`,
          title: session.title,
          url: session.fileUrl,
          subtitle: `Seance • ${formatDate(session.scheduledAt)}`,
        })),
      ...portal.tasks
        .filter((task) => task.fileUrl)
        .map((task) => ({
          id: `task-${task.id}`,
          title: task.title,
          url: task.fileUrl,
          subtitle: `Ressource • a rendre avant ${formatDate(task.dueAt)}`,
        })),
    ];

    return items;
  }, [portal]);

  const progress = useMemo(() => {
    if (!portal) {
      return { tasksPercent: 0, sessionsPercent: 0, globalPercent: 0 };
    }

    const doneSessionsCount = portal.sessions.filter((session) => session.status === "done").length;
    const tasksPercent = portal.tasks.length ? Math.round((completedTasks.length / portal.tasks.length) * 100) : 0;
    const targetSessions = Math.max(portal.studentSpace.targetSessionCount, 1);
    const sessionsPercent = Math.min(100, Math.round((doneSessionsCount / targetSessions) * 100));
    const globalPercent = Math.round((tasksPercent + sessionsPercent) / 2);

    return {
      tasksPercent,
      sessionsPercent,
      globalPercent,
    };
  }, [completedTasks.length, portal]);

  const urgentReminder = useMemo(() => {
    const firstTask = pendingTasks[0];
    if (firstTask) {
      return `A rendre bientot: ${firstTask.title} avant le ${formatDayOnly(firstTask.dueAt)}.`;
    }

    if (nextSession) {
      return `Prochaine seance: ${nextSession.title} le ${formatDate(nextSession.scheduledAt)}.`;
    }

    return "Aucun rappel urgent pour le moment.";
  }, [nextSession, pendingTasks]);

  useEffect(() => {
    if (!portal || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (Notification.permission !== "granted") {
      return;
    }

    const urgentTask = pendingTasks.find((task) => new Date(task.dueAt).getTime() - Date.now() <= 1000 * 60 * 60 * 24 * 2);
    const upcomingSession = upcomingSessions.find(
      (session) => new Date(session.scheduledAt).getTime() - Date.now() <= 1000 * 60 * 60 * 24,
    );

    if (!urgentTask && !upcomingSession) {
      return;
    }

    const marker = urgentTask ? `task-${urgentTask.id}` : `session-${upcomingSession?.id}`;
    const lastMarker = window.sessionStorage.getItem("beta-student-notification-marker");
    if (lastMarker === marker) {
      return;
    }

    const body = urgentTask
      ? `N'oubliez pas: ${urgentTask.title} avant le ${formatDayOnly(urgentTask.dueAt)}.`
      : `Seance demain: ${upcomingSession?.title} a ${formatTimeOnly(upcomingSession?.scheduledAt ?? "")}.`;

    new Notification("βeta Physique • Rappel eleve", { body });
    window.sessionStorage.setItem("beta-student-notification-marker", marker);
  }, [pendingTasks, portal, upcomingSessions]);

  async function loadPortal(rawCode: string, options?: { silentSuccess?: boolean; keepTab?: boolean }) {
    const normalizedCode = rawCode.trim().toUpperCase();

    if (!normalizedCode) {
      toast.error("Entrez votre identifiant eleve.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/espaceeleve?code=${encodeURIComponent(normalizedCode)}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as PortalPayload & { message?: string };

      if (!response.ok) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
        }
        setPortal(null);
        toast.error(payload.message ?? "Code eleve introuvable.");
        return;
      }

      setPortal(payload);
      setCode(normalizedCode);
      if (!options?.keepTab) {
        setActiveTab("dashboard");
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACCESS_CODE_STORAGE_KEY, normalizedCode);
      }
      if (!options?.silentSuccess) {
        toast.success("Espace eleve charge.");
      }
    } catch {
      toast.error("Impossible de charger l’espace eleve.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadPortal(code);
  }

  async function handleNotificationPreview() {
    if (!portal) {
      return;
    }

    if (!("Notification" in window)) {
      toast.error("Les notifications ne sont pas supportees sur ce navigateur.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      toast.error("Autorisez les notifications pour recevoir les rappels.");
      return;
    }

    new Notification("βeta Physique • Espace eleve", {
      body: urgentReminder,
    });
    toast.success("Notifications eleve activees sur cet appareil.");
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
      window.sessionStorage.removeItem("beta-student-notification-marker");
    }
    setCode("");
    setPortal(null);
    setActiveTab("dashboard");
    toast.success("Espace eleve deconnecte.");
  }

  function handleRefresh() {
    if (!code) {
      return;
    }

    void loadPortal(code, { silentSuccess: true, keepTab: true });
  }

  function handleAppleCalendar(session: StudentPortalSession) {
    const fileContent = buildIcsFile({
      title: session.title,
      description: session.instructions,
      startDate: session.scheduledAt,
      endDate: new Date(new Date(session.scheduledAt).getTime() + 1000 * 60 * 90).toISOString(),
    });

    const blob = new Blob([fileContent], { type: "text/calendar;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${slugify(session.title)}.ics`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Acces eleve</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold text-white">Entrez votre identifiant unique.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Apres confirmation, le professeur vous envoie votre code personnel par WhatsApp. Une fois connecte, votre acces reste memorise sur cet appareil.
            </p>
          </div>
          {portal ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4 text-cyan-300" />
                Actualiser
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 text-cyan-300" />
                Changer de code
              </button>
            </div>
          ) : null}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="mb-2 block text-sm text-slate-200">Identifiant eleve</span>
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
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-cyan-300/15 bg-gradient-to-br from-cyan-400/12 via-white/5 to-transparent p-6 backdrop-blur sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Espace personnel</p>
                <h3 className="mt-2 font-heading text-3xl font-semibold text-white">
                  {portal.reservation?.studentName ?? "Eleve confirme"}
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
                  {portal.reservation
                    ? `${portal.reservation.courseFormat} • ${portal.reservation.level} • code ${portal.studentSpace.accessCode}`
                    : `Code d'acces ${portal.studentSpace.accessCode}`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleNotificationPreview}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15"
              >
                <BellRing className="h-4 w-4" />
                Activer mes notifications
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InfoCard
                icon={<Clock3 className="h-5 w-5 text-cyan-300" />}
                title="Prochaine seance"
                value={nextSession ? formatDate(nextSession.scheduledAt) : "Aucune date"}
                description={nextSession?.title ?? "Le professeur publiera bientot la prochaine seance."}
              />
              <InfoCard
                icon={<Target className="h-5 w-5 text-cyan-300" />}
                title="Progression globale"
                value={`${progress.globalPercent}%`}
                description={`${completedTasks.length} tache(s) faites • ${historySessions.filter((session) => session.status === "done").length}/${portal.studentSpace.targetSessionCount} seance(s) terminees.`}
              />
              <InfoCard
                icon={<NotebookPen className="h-5 w-5 text-cyan-300" />}
                title="A rendre"
                value={`${pendingTasks.length}`}
                description={pendingTasks.length ? "Taches encore en attente de rendu." : "Aucune tache urgente."}
              />
              <InfoCard
                icon={<BookOpenCheck className="h-5 w-5 text-cyan-300" />}
                title="Ressources"
                value={`${resources.length}`}
                description={resources.length ? "Fichiers et supports disponibles." : "Aucune ressource telechargeable pour le moment."}
              />
            </div>
          </section>

          <nav className="sticky top-3 z-20 -mx-4 overflow-x-auto px-4 sm:-mx-0 sm:px-0">
            <div className="inline-flex min-w-full gap-2 rounded-full border border-white/10 bg-brand-950/75 p-2 backdrop-blur sm:min-w-0">
              {PORTAL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition ${
                    activeTab === tab.id ? "bg-cyan-400 text-brand-950" : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          {activeTab === "dashboard" ? (
            <div className="space-y-6">
              <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-cyan-300" />
                    <div>
                      <h3 className="font-heading text-2xl font-semibold text-white">Tableau de bord personnel</h3>
                      <p className="text-sm text-slate-300">Ce qui vous attend cette semaine et ce qu’il faut preparer.</p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <HighlightCard
                      eyebrow="Cette semaine"
                      title={nextSession?.title ?? "Planning en attente"}
                      description={nextSession ? `Prochaine seance le ${formatDate(nextSession.scheduledAt)}.` : "Aucune seance a venir n’a encore ete publiee."}
                    />
                    <HighlightCard
                      eyebrow="Rappel urgent"
                      title={pendingTasks[0]?.title ?? "Tout est a jour"}
                      description={pendingTasks[0] ? `A rendre avant le ${formatDayOnly(pendingTasks[0].dueAt)}.` : "Aucune tache urgente en attente pour le moment."}
                    />
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <ProgressCard label="Progression des taches" value={progress.tasksPercent} description={`${completedTasks.length}/${portal.tasks.length || 0} terminees`} />
                    <ProgressCard
                      label="Progression des seances"
                      value={progress.sessionsPercent}
                      description={`${historySessions.filter((session) => session.status === "done").length}/${portal.studentSpace.targetSessionCount} seances objectif`}
                    />
                  </div>
                </div>

                <section className="rounded-[2rem] border border-amber-300/15 bg-amber-400/10 p-6 backdrop-blur sm:p-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-amber-100" />
                    <div>
                      <h3 className="font-heading text-2xl font-semibold text-white">To do liste</h3>
                      <p className="text-sm text-amber-50/85">Les prochaines choses a rendre ou a preparer.</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-4">
                    {pendingTasks.length ? (
                      pendingTasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="rounded-[1.4rem] border border-white/10 bg-brand-950/35 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white">{task.title}</p>
                              <p className="mt-1 text-sm text-amber-50/85">Date limite: {formatDate(task.dueAt)}</p>
                            </div>
                            <span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-semibold text-amber-100">A faire</span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-100">{task.details}</p>
                        </div>
                      ))
                    ) : (
                      <EmptyPortalState title="Rien a rendre" description="Votre liste est vide pour le moment, continuez comme ca." />
                    )}
                  </div>
                </section>
              </section>
            </div>
          ) : null}

          {activeTab === "calendar" ? (
            <div className="space-y-6">
              <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-6 w-6 text-cyan-300" />
                    <div>
                      <h3 className="font-heading text-2xl font-semibold text-white">Calendrier visuel</h3>
                      <p className="text-sm text-slate-300">Toutes les seances a venir, avec ajout direct sur Google Calendar ou Apple Calendar.</p>
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                    {upcomingSessions.length} seance(s) planifiee(s)
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {upcomingSessions.length ? (
                    upcomingSessions.map((session) => (
                      <article key={session.id} className="rounded-[1.6rem] border border-white/10 bg-brand-950/45 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">{formatMonthLabel(session.scheduledAt)}</p>
                            <p className="mt-2 font-heading text-xl font-semibold text-white">{formatDayNumber(session.scheduledAt)}</p>
                          </div>
                          <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                            {formatTimeOnly(session.scheduledAt)}
                          </span>
                        </div>
                        <p className="mt-4 font-semibold text-white">{session.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{session.instructions}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <a
                            href={buildGoogleCalendarLink(session)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10"
                          >
                            <CalendarPlus2 className="h-4 w-4 text-cyan-300" />
                            Google Calendar
                          </a>
                          <button
                            type="button"
                            onClick={() => handleAppleCalendar(session)}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10"
                          >
                            <CalendarClock className="h-4 w-4 text-cyan-300" />
                            Apple Calendar
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="md:col-span-2 xl:col-span-3">
                      <EmptyPortalState title="Aucune seance planifiee" description="Le calendrier se remplira des que le professeur publiera les prochaines dates." />
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "tasks" ? (
            <div className="space-y-6">
              <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
                <div className="flex items-center gap-3">
                  <NotebookPen className="h-6 w-6 text-cyan-300" />
                  <div>
                    <h3 className="font-heading text-2xl font-semibold text-white">Travaux a rendre</h3>
                    <p className="text-sm text-slate-300">Taches, devoirs, exercices et consignes a preparer avant les seances.</p>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {portal.tasks.length ? (
                    portal.tasks.map((task) => (
                      <div key={task.id} className="rounded-[1.6rem] border border-white/10 bg-brand-950/45 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-heading text-lg font-semibold text-white">{task.title}</p>
                            <p className="mt-1 text-sm text-slate-300">A faire avant: {formatDate(task.dueAt)}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-cyan-300">To do liste</p>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              task.status === "done" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"
                            }`}
                          >
                            {task.status === "done" ? "Fait" : "A faire"}
                          </span>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-200">{task.details}</p>
                        {task.fileUrl ? (
                          <a
                            href={task.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300 transition hover:text-cyan-200"
                          >
                            <Link2 className="h-4 w-4" />
                            Ouvrir la ressource
                          </a>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <EmptyPortalState title="Aucune tache publiee" description="Vos exercices et fichiers apparaitront ici." />
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "history" ? (
            <div className="space-y-6">
              <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
                <div className="flex items-center gap-3">
                  <History className="h-6 w-6 text-cyan-300" />
                  <div>
                    <h3 className="font-heading text-2xl font-semibold text-white">Historique des seances</h3>
                    <p className="text-sm text-slate-300">Ce qui a deja ete traite, termine ou reporte.</p>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {historySessions.length ? (
                    historySessions.map((session) => (
                      <div key={session.id} className="rounded-[1.6rem] border border-white/10 bg-brand-950/45 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-heading text-xl font-semibold text-white">{session.title}</p>
                            <p className="mt-1 text-sm text-slate-300">{formatDate(session.scheduledAt)}</p>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              session.status === "done"
                                ? "bg-emerald-400/15 text-emerald-300"
                                : session.status === "cancelled"
                                  ? "bg-rose-400/15 text-rose-200"
                                  : "bg-slate-400/15 text-slate-200"
                            }`}
                          >
                            {session.status === "done" ? "Terminee" : session.status === "cancelled" ? "Reportee" : "Passee"}
                          </span>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-200">{session.instructions}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyPortalState title="Pas encore d’historique" description="L’historique apparaitra apres vos premieres seances." />
                  )}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "downloads" ? (
            <div className="space-y-6">
              <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
                <div className="flex items-center gap-3">
                  <Download className="h-6 w-6 text-cyan-300" />
                  <div>
                    <h3 className="font-heading text-2xl font-semibold text-white">Telechargements</h3>
                    <p className="text-sm text-slate-300">Tous les fichiers, liens et supports envoyes par le professeur.</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {resources.length ? (
                    resources.map((resource) => (
                      <a
                        key={resource.id}
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-[1.6rem] border border-white/10 bg-brand-950/45 p-5 transition hover:bg-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-cyan-400/10 p-3">
                            <Download className="h-5 w-5 text-cyan-300" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{resource.title}</p>
                            <p className="text-sm text-slate-300">{resource.subtitle}</p>
                          </div>
                        </div>
                        <p className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300">
                          <Link2 className="h-4 w-4" />
                          Ouvrir la ressource
                        </p>
                      </a>
                    ))
                  ) : (
                    <div className="lg:col-span-2">
                      <EmptyPortalState title="Aucun telechargement disponible" description="Les ressources partagees apparaitront ici des qu’elles seront ajoutees." />
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-cyan-400/10 p-3">{icon}</div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">{title}</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-white">{value}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}

function HighlightCard({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-brand-950/40 p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</p>
      <p className="mt-3 font-heading text-xl font-semibold text-white">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}

function ProgressCard({ label, value, description }: { label: string; value: number; description: string }) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-brand-950/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">{label}</p>
        <span className="font-heading text-2xl font-semibold text-white">{value}%</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-200" style={{ width: `${Math.max(value, 6)}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-300">{description}</p>
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

function formatDayOnly(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(date));
}

function formatTimeOnly(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeStyle: "short",
  }).format(new Date(date));
}

function formatMonthLabel(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function formatDayNumber(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    weekday: "short",
  }).format(new Date(date));
}

function buildGoogleCalendarLink(session: StudentPortalSession) {
  const start = toGoogleCalendarDate(session.scheduledAt);
  const end = toGoogleCalendarDate(new Date(new Date(session.scheduledAt).getTime() + 1000 * 60 * 90).toISOString());

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: session.title,
    dates: `${start}/${end}`,
    details: session.instructions,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function toGoogleCalendarDate(date: string) {
  return new Date(date).toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function buildIcsFile({
  title,
  description,
  startDate,
  endDate,
}: {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Beta Physique//Student Portal//FR",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}`,
    `DTSTAMP:${toGoogleCalendarDate(new Date().toISOString())}`,
    `DTSTART:${toGoogleCalendarDate(startDate)}`,
    `DTEND:${toGoogleCalendarDate(endDate)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function escapeIcsText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(";", "\\;").replaceAll("\n", "\\n");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
