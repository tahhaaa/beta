import type { CourseFormat, FormatPricing, Pricing, SiteSettings, StudentProfile } from "@/lib/types";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const BRAND_NAME = "βeta";
export const BRAND_FULL_NAME = "βeta Physique";
export const BRAND_TAGLINE = "Le professeur de physique premium pour réussir la 2ème bac";

export const SCHOOL_LEVELS: StudentProfile[] = ["Bon niveau", "Niveau à renforcer"];

export const DEFAULT_PRICING: Pricing = {
  "Bon niveau": 0,
  "Niveau à renforcer": 0,
};

export const DEFAULT_FORMAT_PRICING: FormatPricing = {
  "Cours collectif mini groupe": 400,
  "Cours individuel": 300,
  "Cours en ligne 100%": 100,
};

export const FIXED_PROGRAM_LABEL = "Programme spécial 2ème bac";

export const COURSE_FORMATS: CourseFormat[] = [
  "Cours collectif mini groupe",
  "Cours individuel",
  "Cours en ligne 100%",
];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  centerName: BRAND_FULL_NAME,
  directWhatsapp: "212622222430",
  professorNote: "Le professeur se déplace selon l'organisation du groupe et le format choisi.",
  maintenanceMode: false,
  formatPricing: DEFAULT_FORMAT_PRICING,
  courseFormats: COURSE_FORMATS.map((format) => ({
    id: format,
    label: format,
    enabled: true,
  })),
};

export const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Physique2026!";
export const SESSION_COOKIE_NAME = "physique_admin_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 12;
