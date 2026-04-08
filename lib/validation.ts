import { z } from "zod";

const schoolLevelSchema = z.enum(["Bon niveau", "Niveau à renforcer"]);
const courseFormatSchema = z.enum(["Cours collectif mini groupe", "Cours individuel", "Cours en ligne 100%"]);
const studentSessionStatusSchema = z.enum(["scheduled", "done", "cancelled"]);
const studentTaskStatusSchema = z.enum(["todo", "done"]);

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
  directWhatsapp: z.string().min(8, "Numéro WhatsApp direct requis."),
  professorNote: z.string().min(8, "Note de fonctionnement requise."),
  maintenanceMode: z.boolean(),
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

export const adminPasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "Mot de passe actuel requis."),
    newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères."),
    confirmPassword: z.string().min(8, "Confirmation requise."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "La confirmation du mot de passe ne correspond pas.",
    path: ["confirmPassword"],
  });

export const studentSessionSchema = z.object({
  title: z.string().min(3, "Le titre de la séance est requis."),
  scheduledAt: z.string().min(10, "La date et l'heure sont requises."),
  level: schoolLevelSchema,
  courseFormat: courseFormatSchema,
  instructions: z.string().min(6, "Les consignes sont requises."),
  status: studentSessionStatusSchema.default("scheduled"),
});

export const studentTaskSchema = z.object({
  title: z.string().min(3, "Le titre de la tâche est requis."),
  dueDate: z.string().min(10, "La date limite est requise."),
  details: z.string().min(6, "Le détail de la tâche est requis."),
  status: studentTaskStatusSchema.default("todo"),
});
