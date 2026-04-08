import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CtaStrip } from "@/components/cta-strip";
import { FaqSection } from "@/components/faq-section";
import { HeroSection } from "@/components/hero-section";
import { LevelsSection } from "@/components/levels-section";
import { MobileStickyCta } from "@/components/mobile-sticky-cta";
import { PresentationSection } from "@/components/presentation-section";
import { ProgramHighlights } from "@/components/program-highlights";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsappDirectStrip } from "@/components/whatsapp-direct-strip";
import { getSiteSettings } from "@/lib/db";

export const metadata: Metadata = {
  title: "Accueil",
  description: "βeta Physique, centre premium de physique pour la 2ème bac avec réservation de groupes spécialisés.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSiteSettings();
  if (settings.maintenanceMode) {
    redirect("/maintenance");
  }

  return (
    <main>
      <SiteHeader />
      <HeroSection directWhatsapp={settings.directWhatsapp} />
      <PresentationSection />
      <LevelsSection />
      <ProgramHighlights />
      <WhatsappDirectStrip phone={settings.directWhatsapp} />
      <FaqSection />
      <CtaStrip directWhatsapp={settings.directWhatsapp} />
      <SiteFooter directWhatsapp={settings.directWhatsapp} />
      <MobileStickyCta directWhatsapp={settings.directWhatsapp} />
    </main>
  );
}
