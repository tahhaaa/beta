import { z } from "zod";

const schoolLevelSchema = z.enum(["Bon niveau", "Niveau à renforcer"]);
const courseFormatSchema = z.enum(["Cours collectif mini groupe", "Cours individuel", "Cours en ligne 100%"]);

export const reservationSchema = z.object({
  studentName: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  school: z.string().min(2, "L'école est obligatoire."),
  level: schoolLevelSchema,
  courseFormat: courseFormatSchema,
  whatsapp: z
    .string()
    .min(8, "Le numéro WhatsApp est trop court.")
    .max(20, "Le numéro WhatsApp est trop long."),
  city: z.string().min(2, "La ville est obligatoire."),
});

export const loginSchema = z.object({
  username: z.string().min(3, "Nom d'utilisateur requis."),
  password: z.string().min(8, "Mot de passe requis."),
});

export const pricingSchema = z.object({
  "Bon niveau": z.coerce.number().min(0),
  "Niveau à renforcer": z.coerce.number().min(0),
});

export const reservationUpdateSchema = reservationSchema.extend({
  status: z.enum(["pending", "confirmed"]),
});

export const siteSettingsSchema = z.object({
  centerName: z.string().min(2, "Nom du centre requis."),
  centerAddress: z.string().min(2, "Adresse du centre requise."),
  mapsUrl: z.string().url("Lien Google Maps invalide."),
  formatPricing: z.object({
    "Cours collectif mini groupe": z.coerce.number().min(0),
    "Cours individuel": z.coerce.number().min(0),
    "Cours en ligne 100%": z.coerce.number().min(0),
  }),
  courseFormats: z
    .array(
      z.object({
        id: courseFormatSchema,
        label: z.string().min(2, "Libellé requis."),
        enabled: z.boolean(),
      }),
    )
    .min(1),
});
