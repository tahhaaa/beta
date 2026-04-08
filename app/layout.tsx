import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "@/components/toaster-provider";
import { PwaRegister } from "@/components/pwa-register";
import { NotificationProvider } from "@/components/notification-provider";
import { BRAND_FULL_NAME, SITE_URL } from "@/lib/constants";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_FULL_NAME} | Programme spécial 2ème bac`,
    template: `%s | ${BRAND_FULL_NAME}`,
  },
  description:
    "βeta Physique est un centre premium dédié aux élèves de 2ème bac: réservation de groupes, admin sécurisé et univers visuel scientifique.",
  keywords: ["beta physique", "βeta", "2ème bac", "cours physique bac", "réservation élèves", "physique maroc"],
  applicationName: BRAND_FULL_NAME,
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND_FULL_NAME,
  },
  openGraph: {
    title: BRAND_FULL_NAME,
    description: "Programme spécial 2ème bac avec identité scientifique premium, animations et réservation rapide.",
    url: SITE_URL,
    siteName: BRAND_FULL_NAME,
    locale: "fr_FR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#082335",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body className="font-[var(--font-manrope)] antialiased">
        <PwaRegister />
        <NotificationProvider />
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
