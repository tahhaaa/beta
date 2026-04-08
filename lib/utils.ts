import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function normalizeMoroccanPhone(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");

  if (digits.startsWith("212")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `212${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `212${digits}`;
  }

  return digits;
}

export function getCoursePriceLabel(courseFormat: string, amount: number) {
  if (courseFormat === "Cours collectif mini groupe") {
    return `${formatCurrency(amount)} / mois`;
  }

  if (courseFormat === "Cours individuel") {
    return `${formatCurrency(amount)} / seance`;
  }

  return `${formatCurrency(amount)}`;
}

export function getWhatsappLink(phone: string, message?: string) {
  const normalized = normalizeMoroccanPhone(phone);
  const text = message ? `&text=${encodeURIComponent(message)}` : "";
  return `https://api.whatsapp.com/send/?phone=${normalized}${text}&type=phone_number&app_absent=0`;
}
