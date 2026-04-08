import Image from "next/image";
import Link from "next/link";
import { MessageCircleMore } from "lucide-react";
import { BRAND_FULL_NAME } from "@/lib/constants";
import { getWhatsappLink } from "@/lib/utils";

export function SiteFooter({ directWhatsapp }: { directWhatsapp: string }) {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-400 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Logo Beta Physique" width={36} height={36} className="h-9 w-9 rounded-xl object-contain" />
          <p>{BRAND_FULL_NAME}, identité scientifique premium pour la 2ème bac.</p>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <a
            href={getWhatsappLink(directWhatsapp, "Bonjour, je souhaite avoir plus d'informations sur Beta Physique.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition hover:text-emerald-300"
          >
            <MessageCircleMore className="h-4 w-4" />
            WhatsApp
          </a>
          <Link href="/reservation" className="transition hover:text-cyan-300">
            Réservation
          </Link>
          <Link href="/espaceeleve" className="transition hover:text-cyan-300">
            Espace élève
          </Link>
          <Link href="/admin" className="transition hover:text-cyan-300">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
