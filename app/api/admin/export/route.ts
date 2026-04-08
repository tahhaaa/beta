import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getBackupSnapshot, getReservations, writeAutomaticBackupSnapshot } from "@/lib/db";

function escapeCsv(value: string | number | null | undefined) {
  const input = String(value ?? "");
  if (input.includes(",") || input.includes('"') || input.includes("\n")) {
    return `"${input.replace(/"/g, '""')}"`;
  }

  return input;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(request: Request) {
  await requireAdminSession();

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "csv";

  if (format === "json") {
    const snapshot = await getBackupSnapshot();
    await writeAutomaticBackupSnapshot();
    return new NextResponse(JSON.stringify(snapshot, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="beta-backup.json"',
      },
    });
  }

  const reservations = await getReservations();
  const header = ["ID", "Eleve", "Ecole", "Ville", "Groupe", "Format", "WhatsApp", "Statut", "Creation"];
  const rows = reservations.map((reservation) => [
    reservation.id,
    reservation.studentName,
    reservation.school,
    reservation.city,
    reservation.level,
    reservation.courseFormat,
    reservation.whatsapp,
    reservation.status,
    reservation.createdAt,
  ]);

  if (format === "xls") {
    const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Export reservations</title>
  </head>
  <body>
    <table border="1">
      <thead>
        <tr>${header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  </body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": 'attachment; filename="beta-reservations.xls"',
      },
    });
  }

  const csv = [header, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="beta-reservations.csv"',
    },
  });
}
