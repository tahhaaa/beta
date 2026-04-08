import Link from "next/link";
import { MessageCircleMore } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { getWhatsappLink } from "@/lib/utils";

export function CtaStrip({ directWhatsapp }: { directWhatsapp: string }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
      <Reveal className="rounded-[2rem] border border-cyan-300/20 bg-gradient-to-r from-cyan-400/20 via-white/10 to-transparent p-10 backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">Réservation ouverte</p>
            <h2 className="mt-4 font-heading text-3xl font-semibold text-white">
              Réservez maintenant votre place en groupe 2ème bac et commencez une préparation plus sérieuse.
            </h2>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
            <Link
              href="/reservation"
              className="inline-flex w-full items-center justify-center rounded-full bg-cyan-400 px-6 py-4 text-base font-semibold text-brand-950 transition hover:-translate-y-0.5 hover:bg-cyan-300 lg:w-auto"
            >
              Réserver votre groupe maintenant
            </Link>
            <a
              href={getWhatsappLink(directWhatsapp, "Bonjour, je souhaite reserver ou obtenir plus d'informations sur la preparation 2eme bac.")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-6 py-4 text-base font-semibold text-emerald-100 transition hover:bg-emerald-400/15 lg:w-auto"
            >
              <MessageCircleMore className="h-5 w-5" />
              WhatsApp direct
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
