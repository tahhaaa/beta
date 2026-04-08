import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { getSiteSettings, updateSiteSettings, writeAutomaticBackupSnapshot } from "@/lib/db";
import { siteSettingsSchema } from "@/lib/validation";

export async function GET() {
  await requireAdminSession();
  try {
    return NextResponse.json(await getSiteSettings());
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de charger les paramètres.") }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  await requireAdminSession();
  const body = await request.json();
  const parsed = siteSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Paramètres invalides." }, { status: 400 });
  }

  try {
    const settings = await updateSiteSettings(parsed.data);
    await writeAutomaticBackupSnapshot();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de mettre à jour les paramètres.") }, { status: 500 });
  }
}
