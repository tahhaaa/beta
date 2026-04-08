import Link from "next/link";
import { MessageCircleMore } from "lucide-react";
import { getWhatsappLink } from "@/lib/utils";

export function MobileStickyCta({ directWhatsapp }: { directWhatsapp: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-brand-950/90 p-3 backdrop-blur md:hidden">
      <div className="grid grid-cols-[1.2fr_0.8fr] gap-2">
        <Link
          href="/reservation"
          className="inline-flex w-full items-center justify-center rounded-full bg-cyan-400 px-5 py-4 text-sm font-semibold text-brand-950 transition hover:bg-cyan-300"
        >
          Réserver 2ème bac
        </Link>
        <a
          href={getWhatsappLink(directWhatsapp, "Bonjour, je souhaite obtenir des informations sur la preparation 2eme bac.")}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15"
        >
          <MessageCircleMore className="h-4 w-4" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
