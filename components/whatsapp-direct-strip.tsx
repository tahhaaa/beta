import { MessageCircleMore } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { getWhatsappLink } from "@/lib/utils";

export function WhatsappDirectStrip({ phone }: { phone: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Reveal className="rounded-[2rem] border border-emerald-300/20 bg-[linear-gradient(120deg,rgba(16,185,129,0.18),rgba(8,35,53,0.7))] p-6 backdrop-blur sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200">WhatsApp direct</p>
            <h2 className="mt-3 font-heading text-2xl font-semibold text-white sm:text-3xl">
              Une question rapide ? Contactez directement le professeur.
            </h2>
            <p className="mt-3 text-slate-100/90">
              Pour une demande urgente, une précision sur les groupes ou un échange rapide, WhatsApp reste le canal le plus direct.
            </p>
          </div>
          <a
            href={getWhatsappLink(phone, "Bonjour, je souhaite avoir plus d'informations sur la preparation 2eme bac.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-4 font-semibold text-brand-950 transition hover:-translate-y-0.5 hover:bg-emerald-300"
          >
            <MessageCircleMore className="h-5 w-5" />
            Ouvrir WhatsApp
          </a>
        </div>
      </Reveal>
    </section>
  );
}
