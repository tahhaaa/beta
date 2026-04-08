import Link from "next/link";
import { Compass, Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center backdrop-blur sm:p-12">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-400/10 text-cyan-300">
          <SearchX className="h-9 w-9" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">Erreur 404</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold text-white sm:text-5xl">Cette page n’existe pas.</h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          Le lien demandé n’est plus disponible ou l’adresse a été mal saisie. Vous pouvez revenir à l’accueil ou accéder directement à la réservation.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-4 font-semibold text-brand-950 transition hover:bg-cyan-300"
          >
            <Home className="h-5 w-5" />
            Retour à l’accueil
          </Link>
          <Link
            href="/reservation"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-4 font-semibold text-white transition hover:bg-white/10"
          >
            <Compass className="h-5 w-5" />
            Aller à la réservation
          </Link>
        </div>
      </div>
    </main>
  );
}
