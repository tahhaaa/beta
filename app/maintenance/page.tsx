import Link from "next/link";
import { Clock3, Home, RefreshCcw } from "lucide-react";

export const dynamic = "force-dynamic";

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center backdrop-blur sm:p-12">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-400/10 text-amber-200">
          <Clock3 className="h-9 w-9" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">Maintenance</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold text-white sm:text-5xl">Le site revient très vite.</h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          Le professeur met actuellement à jour l’organisation et les réservations. L’espace public est temporairement mis en pause.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-4 font-semibold text-white transition hover:bg-white/10"
          >
            <Home className="h-5 w-5" />
            Retourner à l’accueil
          </Link>
          <Link
            href="/maintenance"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-4 font-semibold text-brand-950 transition hover:bg-cyan-300"
          >
            <RefreshCcw className="h-5 w-5" />
            Réessayer
          </Link>
        </div>
      </div>
    </main>
  );
}
