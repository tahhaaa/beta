import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageCircleMore } from "lucide-react";
import { PhysicsScene } from "@/components/physics-scene";
import { Reveal } from "@/components/reveal";
import { BRAND_FULL_NAME, BRAND_NAME, BRAND_TAGLINE, FIXED_PROGRAM_LABEL } from "@/lib/constants";
import { getWhatsappLink } from "@/lib/utils";

export function HeroSection({ directWhatsapp }: { directWhatsapp: string }) {
  return (
    <section className="relative overflow-hidden">
      <PhysicsScene />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_26%),radial-gradient(circle_at_10%_30%,rgba(255,255,255,0.12),transparent_18%)]" />
      <div className="absolute inset-0 bg-grid bg-[length:32px_32px] opacity-[0.08]" />
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-8 lg:py-24">
        <Reveal className="relative z-10 space-y-8">
          <div className="inline-flex items-center rounded-full border border-cyan-300/20 bg-white/5 px-4 py-2 text-sm text-cyan-100 backdrop-blur">
            {BRAND_NAME} • {FIXED_PROGRAM_LABEL}
          </div>

          <div className="space-y-5">
            <p className="font-heading text-xl text-cyan-300 sm:text-2xl">{BRAND_FULL_NAME}</p>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
              Cours de physique spécialement conçus pour les élèves de 2ème bac.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-200 sm:text-lg sm:leading-8">
              {BRAND_TAGLINE}. Une identité plus scientifique, une méthode plus claire et une ambiance inspirée par
              l’univers de la physique.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/reservation"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-4 text-base font-semibold text-brand-950 shadow-glow transition hover:-translate-y-0.5 hover:bg-cyan-300"
            >
              Réserver votre groupe maintenant
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href={getWhatsappLink(directWhatsapp, "Bonjour, je souhaite obtenir des informations sur la preparation 2eme bac.")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-6 py-4 text-base font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-400/15"
            >
              <MessageCircleMore className="h-5 w-5" />
              WhatsApp direct
            </a>
            <a
              href="#presentation"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-4 text-base font-semibold text-white transition hover:border-cyan-300/60 hover:bg-white/10"
            >
              Découvrir la méthode
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "Identité scientifique premium",
              "2 groupes selon le niveau",
              "Animations inspirées de la physique",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-cyan-300" />
                <span className="text-sm text-slate-100">{item}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={150} className="relative order-first lg:order-none">
          <div className="absolute inset-x-6 top-8 h-48 rounded-full bg-cyan-400/20 blur-3xl sm:inset-x-10 sm:h-64" />
          <div className="relative mx-auto max-w-sm overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur sm:max-w-lg">
            <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-900">
              <Image
                src="/professeur-hero.svg"
                alt="Portrait du professeur de physique"
                width={900}
                height={1100}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
