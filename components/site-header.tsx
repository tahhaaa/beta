import Image from "next/image";
import Link from "next/link";
import { BRAND_FULL_NAME } from "@/lib/constants";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-white">
          <Image src="/logo.png" alt="Logo Beta Physique" width={44} height={44} className="h-11 w-11 rounded-2xl object-contain" priority />
          <span>
            <span className="block font-heading text-lg font-semibold">{BRAND_FULL_NAME}</span>
            <span className="block text-xs text-slate-300">Programme spécial 2ème bac</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate-200 md:flex">
          <a href="#presentation" className="transition hover:text-cyan-300">
            Présentation
          </a>
          <a href="#niveaux" className="transition hover:text-cyan-300">
            Niveaux
          </a>
          <Link href="/espace-eleve" className="transition hover:text-cyan-300">
            Espace élève
          </Link>
          <Link
            href="/reservation"
            className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-brand-950 transition hover:scale-[1.02] hover:bg-cyan-300"
          >
            Réserver maintenant
          </Link>
        </nav>
      </div>
    </header>
  );
}
