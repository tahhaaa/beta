"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BarChart3, BellRing, Check, Download, KeyRound, LoaderCircle, LogOut, Pencil, Search, Settings2, ShieldCheck, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { SCHOOL_LEVELS } from "@/lib/constants";
import type { DashboardStats, Reservation, SiteSettings } from "@/lib/types";
import { formatCurrency, formatDate, getCoursePriceLabel, normalizeMoroccanPhone } from "@/lib/utils";

type AdminDashboardProps = {
  initialReservations: Reservation[];
  initialStats: DashboardStats;
  initialSettings: SiteSettings;
};

type EditableReservation = Omit<Reservation, "id" | "createdAt" | "updatedAt" | "confirmedAt">;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function AdminDashboard({
  initialReservations,
  initialStats,
  initialSettings,
}: AdminDashboardProps) {
  const [reservations, setReservations] = useState(initialReservations);
  const [stats, setStats] = useState(initialStats);
  const [settings, setSettings] = useState(initialSettings);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditableReservation | null>(null);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | Reservation["level"]>("all");
  const [isSavingReservation, startSavingReservation] = useTransition();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushReady, setPushReady] = useState(false);
  const [pushPublicKey, setPushPublicKey] = useState("");
  const [isConfiguringPush, setIsConfiguringPush] = useState(false);
  const [isSendingPushTest, setIsSendingPushTest] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const didMountSettings = useRef(false);
  const lastSavedSettingsRef = useRef(JSON.stringify(initialSettings));

  const latestId = useMemo(() => reservations[0]?.id ?? 0, [reservations]);
  const enabledFormats = useMemo(() => settings.courseFormats.filter((format) => format.enabled), [settings.courseFormats]);
  const monthlyMax = useMemo(() => Math.max(...stats.monthlyReservations.map((item) => item.count), 1), [stats.monthlyReservations]);
  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      const q = search.toLowerCase();
      const matchesSearch =
        reservation.studentName.toLowerCase().includes(q) ||
        reservation.school.toLowerCase().includes(q) ||
        reservation.city.toLowerCase().includes(q) ||
        reservation.whatsapp.toLowerCase().includes(q) ||
        reservation.courseFormat.toLowerCase().includes(q);
      const matchesGroup = groupFilter === "all" || reservation.level === groupFilter;
      return matchesSearch && matchesGroup;
    });
  }, [groupFilter, reservations, search]);

  async function refreshDashboard() {
    try {
      const [statsResponse, reservationsResponse, settingsResponse] = await Promise.all([
        fetch("/api/admin/stats", { cache: "no-store" }),
        fetch("/api/admin/reservations", { cache: "no-store" }),
        fetch("/api/admin/settings", { cache: "no-store" }),
      ]);

      if (!statsResponse.ok || !reservationsResponse.ok || !settingsResponse.ok) {
        throw new Error("refresh");
      }

      const nextStats = (await statsResponse.json()) as DashboardStats;
      const nextReservations = (await reservationsResponse.json()) as Reservation[];
      const nextSettings = (await settingsResponse.json()) as SiteSettings;
      lastSavedSettingsRef.current = JSON.stringify(nextSettings);
      setStats(nextStats);
      setReservations(nextReservations);
      setSettings(nextSettings);
    } catch {
      toast.error("Actualisation impossible pour le moment.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPushStatus() {
      try {
        const response = await fetch("/api/admin/push", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { enabled: boolean; publicKey: string };
        if (cancelled) {
          return;
        }

        setPushReady(payload.enabled);
        setPushPublicKey(payload.publicKey);

        if (!payload.enabled || !("serviceWorker" in navigator)) {
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) {
          setPushEnabled(Boolean(subscription));
        }
      } catch {
        if (!cancelled) {
          setPushReady(false);
        }
      }
    }

    loadPushStatus().catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/admin/reservations/latest?knownId=${latestId}`, { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { reservation: Reservation | null; isNew: boolean };
      if (payload.isNew && payload.reservation) {
        toast.success(`Nouvelle réservation reçue pour ${payload.reservation.studentName}.`);

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Nouvelle réservation", {
            body: `${payload.reservation.studentName} - ${payload.reservation.level}`,
          });
        }

        refreshDashboard();
      }
    }, 12000);

    return () => window.clearInterval(interval);
  }, [latestId]);

  async function handleDelete(id: number) {
    try {
      const response = await fetch(`/api/admin/reservations/${id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        toast.error(payload.message ?? "Suppression impossible.");
        return;
      }

      toast.success("Réservation supprimée.");
      await refreshDashboard();
    } catch {
      toast.error("Suppression impossible.");
    }
  }

  async function handleConfirm(reservation: Reservation) {
    try {
      const response = await fetch(`/api/admin/reservations/${reservation.id}/confirm`, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        toast.error(payload.message ?? "Confirmation impossible.");
        return;
      }

      toast.success("Réservation confirmée.");
      await refreshDashboard();
    } catch {
      toast.error("Confirmation impossible.");
    }
  }

  async function handleSaveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSettings("manual");
  }

  async function saveSettings(mode: "manual" | "auto" = "manual") {
    const serializedSettings = JSON.stringify(settings);

    try {
      if (mode === "auto") {
        setAutoSaveStatus("saving");
      }
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setAutoSaveStatus("error");
        if (mode === "manual") {
          toast.error(payload.message ?? "Mise à jour des paramètres impossible.");
        }
        return;
      }

      lastSavedSettingsRef.current = serializedSettings;
      setAutoSaveStatus("saved");
      if (mode === "manual") {
        toast.success("Paramètres du professeur enregistrés.");
      }
      await refreshDashboard();
    } catch {
      setAutoSaveStatus("error");
      if (mode === "manual") {
        toast.error("Mise à jour des paramètres impossible.");
      }
    }
  }

  useEffect(() => {
    if (!didMountSettings.current) {
      didMountSettings.current = true;
      return;
    }

    if (JSON.stringify(settings) === lastSavedSettingsRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      saveSettings("auto").catch(() => null);
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [settings]);

  async function handleLogout() {
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (response.ok) {
        window.location.href = "/admin/login";
        return;
      }
      toast.error("Déconnexion impossible.");
    } catch {
      toast.error("Déconnexion impossible.");
    }
  }

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPassword(true);

    try {
      const response = await fetch("/api/admin/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        toast.error(payload.message ?? "Changement de mot de passe impossible.");
        return;
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Mot de passe admin mis à jour.");
    } catch {
      toast.error("Changement de mot de passe impossible.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleSaveReservation() {
    if (!editForm || editingId === null) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/reservations/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        toast.error(payload.message ?? "Mise à jour impossible.");
        return;
      }

      toast.success("Réservation mise à jour.");
      setEditingId(null);
      setEditForm(null);
      await refreshDashboard();
    } catch {
      toast.error("Mise à jour impossible.");
    }
  }

  function openWhatsapp(reservation: Reservation) {
    const phone = normalizeMoroccanPhone(reservation.whatsapp);
    if (!phone) {
      toast.error("Numéro WhatsApp invalide.");
      return;
    }

    const totalPrice = settings.formatPricing[reservation.courseFormat] ?? 0;
    const priceLabel = getCoursePriceLabel(reservation.courseFormat, totalPrice);

    const message = encodeURIComponent(
      `Bonjour ${reservation.studentName} 👋✨\n\nVous êtes toujours intéressé(e) par notre offre spéciale 2ème bac ? 🚀\nUne place est disponible en ${reservation.courseFormat} dans le groupe ${reservation.level} 📚⚡\nTarif propose: ${priceLabel} 💸\n\nSi cela vous intéresse toujours, répondez-nous ici et on vous guide pour finaliser l'inscription ✅`,
    );

    window.open(`https://api.whatsapp.com/send/?phone=${phone}&text=${message}&type=phone_number&app_absent=0`, "_blank", "noopener,noreferrer");
  }

  async function handlePushToggle() {
    if (!pushReady) {
      toast.error("Ajoutez d'abord les clés VAPID pour activer les notifications push.");
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Les notifications push ne sont pas supportées sur ce navigateur.");
      return;
    }

    setIsConfiguringPush(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Autorisez les notifications pour activer les alertes push.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        await fetch("/api/admin/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existingSubscription.endpoint }),
        });
        await existingSubscription.unsubscribe();
        setPushEnabled(false);
        toast.success("Notifications push désactivées.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushPublicKey),
      });

      const response = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        await subscription.unsubscribe();
        toast.error(payload.message ?? "Activation push impossible.");
        return;
      }

      setPushEnabled(true);
      toast.success("Notifications push activées.");
    } catch {
      toast.error("Activation push impossible.");
    } finally {
      setIsConfiguringPush(false);
    }
  }

  async function handlePushTest() {
    setIsSendingPushTest(true);

    try {
      const response = await fetch("/api/admin/push/test", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        toast.error(payload.message ?? "Test push impossible.");
        return;
      }

      toast.success("Test push envoye. Verifiez vos notifications navigateur.");
    } catch {
      toast.error("Test push impossible.");
    } finally {
      setIsSendingPushTest(false);
    }
  }

  function downloadExport(format: "csv" | "json" | "xls") {
    window.open(`/api/admin/export?format=${format}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Panneau d’administration</p>
          <h1 className="mt-2 font-heading text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">Pilotage complet du professeur</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Rapports, réservations, bénéfices, formats de cours et paramètres du professeur dans un seul espace plus lisible.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-wrap lg:justify-end">
          <button
            onClick={handlePushToggle}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 sm:px-5"
          >
            <BellRing className="h-4 w-4 text-cyan-300" />
            {isConfiguringPush ? "Configuration..." : pushEnabled ? "Push activées" : "Activer push"}
          </button>
          <button
            onClick={handlePushTest}
            disabled={!pushEnabled || isSendingPushTest}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
          >
            {isSendingPushTest ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Tester push
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 sm:px-5"
          >
            <LogOut className="h-4 w-4 text-cyan-300" />
            Déconnexion
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard label="Total réservations" value={String(stats.totalReservations)} />
        <StatCard label="Réservations aujourd’hui" value={String(stats.todayReservations)} />
        <StatCard label="Confirmées" value={String(stats.confirmedReservations)} />
        <StatCard label="Bénéfices estimés" value={formatCurrency(stats.estimatedRevenue)} />
      </div>

      <nav className="rounded-[1.5rem] border border-white/10 bg-brand-950/85 p-2.5 backdrop-blur lg:sticky lg:top-4 lg:z-30 lg:p-3">
        <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
            <a
              href="#benefices"
              className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
            Bénéfices
            </a>
            <a
              href="#statistiques"
              className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
            Statistiques
            </a>
            <a
              href="#parametres"
              className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
            Paramètres
            </a>
            <a
              href="#rapports"
              className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
            Rapports
            </a>
            <a
              href="#reservations"
              className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
            Réservations
            </a>
          </div>
        </div>
      </nav>

      <div className="grid gap-5 xl:gap-6 2xl:grid-cols-[0.9fr_0.9fr_1.2fr]">
        <section id="benefices" className="scroll-mt-24 rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-6 lg:p-7">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-cyan-300" />
            <div>
              <h2 className="text-2xl font-semibold text-white">Gestion bénéfices</h2>
              <p className="text-sm text-slate-300">Tarifs entièrement modifiables. Calcul basé uniquement sur les réservations confirmées.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-4">
              <p className="text-sm text-emerald-200">Revenu confirmé</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(stats.estimatedRevenue)}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/10 p-4">
              <p className="text-sm text-amber-100">Potentiel en attente</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(stats.pendingRevenue)}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-brand-950/40 p-4">
            <h3 className="text-lg font-semibold text-white">Tarifs des cours</h3>
            <p className="mt-2 text-sm text-slate-300">
              Un seul prix par type de cours. Le meme tarif s'applique au bon et au mauvais niveau.
            </p>
            <div className="mt-4 space-y-4">
              {settings.courseFormats.map((format) => (
                <label key={format.id} className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">{format.label}</span>
                  <input
                    type="number"
                    min="0"
                    value={settings.formatPricing[format.id]}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        formatPricing: {
                          ...current.formatPricing,
                          [format.id]: Number(event.target.value),
                        },
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-brand-950/60 px-4 py-3 text-white outline-none"
                  />
                  <span className="mt-2 block text-xs text-slate-400">
                    {getCoursePriceLabel(format.id, settings.formatPricing[format.id])}
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                saveSettings().catch(() => null);
              }}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-cyan-400 px-5 py-4 font-semibold text-brand-950 transition hover:bg-cyan-300"
            >
              Enregistrer les tarifs
            </button>
          </div>
        </section>

        <section id="statistiques" className="scroll-mt-24 rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-6 lg:p-7">
          <h2 className="text-2xl font-semibold text-white">Répartition des groupes</h2>
          <div className="mt-6 grid gap-4">
            {stats.levelBreakdown.map((item) => (
              <div key={item.level} className="rounded-2xl border border-white/10 bg-brand-950/50 p-5">
                <p className="text-sm text-slate-400">{item.level}</p>
                <p className="mt-2 font-heading text-3xl font-semibold text-white">{item.count}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-brand-950/40 p-4">
            <h3 className="text-lg font-semibold text-white">Revenus par format</h3>
            <div className="mt-4 space-y-3">
              {stats.revenueByFormat.map((item) => (
                <div key={item.format} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-200">{item.format}</span>
                    <span className="text-sm text-slate-400">{item.count} confirmé(s)</span>
                  </div>
                  <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(item.revenue)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="parametres" className="scroll-mt-24 rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-6 lg:p-7">
          <div className="flex items-center gap-3">
            <Settings2 className="h-6 w-6 text-cyan-300" />
            <div>
              <h2 className="font-heading text-2xl font-semibold text-white">Paramètres du professeur</h2>
              <p className="text-sm text-slate-300">Le site se sauvegarde automatiquement quand vous modifiez les réglages.</p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="mt-6 space-y-4">
            <Field label="Nom affiché" value={settings.centerName} onChange={(value) => setSettings({ ...settings, centerName: value })} />
            <Field
              label="WhatsApp direct"
              value={settings.directWhatsapp}
              onChange={(value) => setSettings({ ...settings, directWhatsapp: value })}
            />
            <TextareaField
              label="Note d'organisation"
              value={settings.professorNote}
              onChange={(value) => setSettings({ ...settings, professorNote: value })}
            />
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-brand-950/40 p-4">
              <div>
                <span className="block text-sm font-medium text-white">Mode maintenance</span>
                <span className="mt-1 block text-sm text-slate-400">Prépare la communication si vous souhaitez suspendre temporairement le site.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(event) => setSettings({ ...settings, maintenanceMode: event.target.checked })}
                className="h-5 w-5 rounded border-white/10 bg-brand-950/60"
              />
            </label>

            <div className="rounded-2xl border border-white/10 bg-brand-950/40 p-4">
              <div className="mb-3 flex items-center gap-2 text-white">Formats de cours</div>
              <div className="space-y-3">
                {settings.courseFormats.map((format, index) => (
                  <div key={format.id} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      value={format.label}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          courseFormats: current.courseFormats.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, label: event.target.value } : item,
                          ),
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-brand-950/60 px-4 py-3 text-white outline-none"
                    />
                    <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={format.enabled}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            courseFormats: current.courseFormats.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, enabled: event.target.checked } : item,
                            ),
                          }))
                        }
                      />
                      Actif
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 py-4 font-semibold text-brand-950 transition hover:bg-cyan-300 sm:w-auto">
                Enregistrer maintenant
              </button>
              <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-300">
                {autoSaveStatus === "saving" && "Sauvegarde automatique..."}
                {autoSaveStatus === "saved" && "Dernières modifications sauvegardées"}
                {autoSaveStatus === "error" && "Erreur de sauvegarde"}
                {autoSaveStatus === "idle" && "Auto-save actif"}
              </div>
            </div>
          </form>
        </section>
      </div>

      <section id="rapports" className="scroll-mt-24 rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-6 lg:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[1.8rem] border border-white/10 bg-brand-950/45 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Rapports</p>
                <h2 className="mt-2 font-heading text-2xl font-semibold text-white">Graphique mensuel des réservations</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Suivi des demandes reçues et des confirmations sur les 6 derniers mois pour piloter le rythme du professeur.
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-3 text-cyan-100">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-6 gap-3 sm:gap-4">
              {stats.monthlyReservations.map((item) => (
                <div key={item.month} className="flex min-h-[220px] flex-col justify-end gap-3">
                  <div className="flex h-40 items-end justify-center gap-2">
                    <div
                      className="w-5 rounded-t-full bg-white/15 transition-all duration-500 sm:w-6"
                      style={{ height: `${Math.max((item.count / monthlyMax) * 100, item.count ? 18 : 6)}%` }}
                      title={`Demandes: ${item.count}`}
                    />
                    <div
                      className="w-5 rounded-t-full bg-cyan-400 transition-all duration-500 sm:w-6"
                      style={{ height: `${Math.max((item.confirmed / monthlyMax) * 100, item.confirmed ? 18 : 6)}%` }}
                      title={`Confirmées: ${item.confirmed}`}
                    />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">{item.month}</p>
                    <p className="text-sm text-white">{item.count} demandes</p>
                    <p className="text-xs text-cyan-200">{item.confirmed} confirmées</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <span className="h-3 w-3 rounded-full bg-white/20" />
                Demandes reçues
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2">
                <span className="h-3 w-3 rounded-full bg-cyan-400" />
                Inscriptions confirmées
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[1.8rem] border border-white/10 bg-brand-950/45 p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Exports & backup</p>
              <h3 className="mt-2 font-heading text-xl font-semibold text-white">Sauvegardes automatiques</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Chaque modification importante déclenche une sauvegarde. Vous pouvez aussi exporter les données immédiatement.
              </p>
              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={() => downloadExport("csv")}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  <Download className="h-4 w-4 text-cyan-300" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => downloadExport("xls")}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  <Download className="h-4 w-4" />
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={() => downloadExport("json")}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-5 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/20"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Télécharger le backup JSON
                </button>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/10 bg-brand-950/45 p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Sécurité admin</p>
              <h3 className="mt-2 font-heading text-xl font-semibold text-white">Changer le mot de passe</h3>
              <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
                <Field
                  label="Mot de passe actuel"
                  value={passwordForm.currentPassword}
                  type="password"
                  onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))}
                />
                <Field
                  label="Nouveau mot de passe"
                  value={passwordForm.newPassword}
                  type="password"
                  onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
                />
                <Field
                  label="Confirmer le nouveau mot de passe"
                  value={passwordForm.confirmPassword}
                  type="password"
                  onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))}
                />
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-semibold text-brand-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingPassword ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Enregistrer le nouveau mot de passe
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section id="reservations" className="scroll-mt-24 rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-white">Gestion réservations</h2>
            <p className="mt-1 text-sm text-slate-300">Le panneau s’adapte mieux au mobile avec une vue cartes et des actions regroupées.</p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher..."
                className="w-full rounded-full border border-white/10 bg-brand-950/60 py-3 pl-10 pr-4 text-sm text-white outline-none sm:w-full lg:w-72"
              />
            </label>
            <select
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value as "all" | Reservation["level"])}
              className="w-full rounded-full border border-white/10 bg-brand-950/60 px-4 py-3 text-sm text-white outline-none lg:w-auto"
            >
              <option value="all">Tous les groupes</option>
              {SCHOOL_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <button
              onClick={() => refreshDashboard().catch(() => null)}
              className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10 lg:w-auto"
            >
              Actualiser
            </button>
          </div>
        </div>

        <div className="mt-6 hidden overflow-x-auto xl:block">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-sm text-slate-400">
                <th className="px-4">Élève</th>
                <th className="px-4">Groupe</th>
                <th className="px-4">Format</th>
                <th className="px-4">WhatsApp</th>
                <th className="px-4">Statut</th>
                <th className="px-4">Date</th>
                <th className="px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map((reservation) => (
                <tr key={reservation.id} className="bg-brand-950/60 text-sm text-slate-200">
                  <td className="rounded-l-2xl px-4 py-4">
                    <div className="font-semibold text-white">{reservation.studentName}</div>
                    <div className="text-slate-400">{reservation.school}</div>
                    <div className="text-slate-400">{reservation.city}</div>
                  </td>
                  <td className="px-4 py-4">{reservation.level}</td>
                  <td className="px-4 py-4">{reservation.courseFormat}</td>
                  <td className="px-4 py-4">{reservation.whatsapp}</td>
                  <td className="px-4 py-4">{statusBadge(reservation.status)}</td>
                  <td className="px-4 py-4">{formatDate(reservation.createdAt)}</td>
                  <td className="rounded-r-2xl px-4 py-4">
                    <ActionButtons
                      onEdit={() => {
                        setEditForm({
                          studentName: reservation.studentName,
                          school: reservation.school,
                          level: reservation.level,
                          courseFormat: reservation.courseFormat,
                          whatsapp: reservation.whatsapp,
                          city: reservation.city,
                          status: reservation.status,
                        });
                        setEditingId(reservation.id);
                      }}
                      onConfirm={() => handleConfirm(reservation)}
                      onWhatsapp={() => openWhatsapp(reservation)}
                      onDelete={() => handleDelete(reservation.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 xl:hidden">
          {filteredReservations.map((reservation) => (
            <div key={reservation.id} className="rounded-[1.6rem] border border-white/10 bg-brand-950/60 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{reservation.studentName}</p>
                  <p className="text-sm text-slate-400">{reservation.school}</p>
                  <p className="text-sm text-slate-400">{reservation.city}</p>
                </div>
                {statusBadge(reservation.status)}
              </div>

              <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 sm:grid-cols-2">
                <div>Groupe: {reservation.level}</div>
                <div>Format: {reservation.courseFormat}</div>
                <div>WhatsApp: {reservation.whatsapp}</div>
                <div>Date: {formatDate(reservation.createdAt)}</div>
              </div>

              <div className="mt-4">
                <ActionButtons
                  stacked
                  onEdit={() => {
                    setEditingId(reservation.id);
                    setEditForm({
                      studentName: reservation.studentName,
                      school: reservation.school,
                      level: reservation.level,
                      courseFormat: reservation.courseFormat,
                      whatsapp: reservation.whatsapp,
                      city: reservation.city,
                      status: reservation.status,
                    });
                  }}
                  onConfirm={() => handleConfirm(reservation)}
                  onWhatsapp={() => openWhatsapp(reservation)}
                  onDelete={() => handleDelete(reservation.id)}
                />
              </div>
            </div>
          ))}
        </div>

        {!filteredReservations.length ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center text-slate-400">
            Aucune réservation trouvée avec ce filtre.
          </div>
        ) : null}
      </section>

      {editingId !== null && editForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/80 p-4 backdrop-blur">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#071724] p-5 shadow-2xl sm:p-7">
            <h3 className="text-2xl font-semibold text-white">Modifier la réservation</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Nom élève" value={editForm.studentName} onChange={(value) => setEditForm({ ...editForm, studentName: value })} />
              <Field label="École" value={editForm.school} onChange={(value) => setEditForm({ ...editForm, school: value })} />
              <Select
                label="Groupe"
                value={editForm.level}
                items={SCHOOL_LEVELS.map((level) => ({ value: level, label: level }))}
                onChange={(value) => setEditForm({ ...editForm, level: value as Reservation["level"] })}
              />
              <Select
                label="Type de cours"
                value={editForm.courseFormat}
                items={enabledFormats.map((format) => ({ value: format.id, label: format.label }))}
                onChange={(value) => setEditForm({ ...editForm, courseFormat: value as Reservation["courseFormat"] })}
              />
              <Field label="WhatsApp" value={editForm.whatsapp} onChange={(value) => setEditForm({ ...editForm, whatsapp: value })} />
              <Field label="Ville" value={editForm.city} onChange={(value) => setEditForm({ ...editForm, city: value })} />
              <label className="block">
                <span className="mb-2 block text-sm text-slate-200">Statut</span>
                <select
                  value={editForm.status}
                  onChange={(event) => setEditForm({ ...editForm, status: event.target.value as Reservation["status"] })}
                  className="w-full rounded-2xl border border-white/10 bg-brand-950/60 px-4 py-3 text-white outline-none"
                >
                  <option value="pending">En attente</option>
                  <option value="confirmed">Confirmée</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditForm(null);
                }}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 font-medium text-white transition hover:bg-white/10"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  startSavingReservation(() => {
                    handleSaveReservation().catch(() => null);
                  });
                }}
                disabled={isSavingReservation}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-semibold text-brand-950 transition hover:bg-cyan-300"
              >
                {isSavingReservation ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 font-heading text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-200">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-brand-950/60 px-4 py-3 text-white outline-none"
      />
    </label>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-200">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-brand-950/60 px-4 py-3 text-white outline-none"
      />
    </label>
  );
}

function Select({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-brand-950/60 px-4 py-3 text-white outline-none"
      >
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function statusBadge(status: Reservation["status"]) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        status === "confirmed" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"
      }`}
    >
      {status === "confirmed" ? "Confirmée" : "En attente"}
    </span>
  );
}

function ActionButtons({
  stacked = false,
  onEdit,
  onConfirm,
  onWhatsapp,
  onDelete,
}: {
  stacked?: boolean;
  onEdit: () => void;
  onConfirm: () => void;
  onWhatsapp: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`flex ${stacked ? "flex-col sm:flex-row" : "flex-wrap"} gap-2`}>
      <button type="button" onClick={onEdit} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10">
        <Pencil className="h-4 w-4" />
        Modifier
      </button>
      <button type="button" onClick={onConfirm} className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-200 transition hover:bg-emerald-400/15">
        <Check className="h-4 w-4" />
        Confirmer l'eleve
      </button>
      <button type="button" onClick={onWhatsapp} className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-cyan-100 transition hover:bg-cyan-400/15">
        WhatsApp
      </button>
      <button type="button" onClick={onDelete} className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-rose-200 transition hover:bg-rose-400/15">
        <Trash2 className="h-4 w-4" />
        Supprimer
      </button>
    </div>
  );
}
