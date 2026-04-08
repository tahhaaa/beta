import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { getPricing, updatePricing, writeAutomaticBackupSnapshot } from "@/lib/db";
import { pricingSchema } from "@/lib/validation";

export async function GET() {
  await requireAdminSession();
  try {
    return NextResponse.json(await getPricing());
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de charger les tarifs.") }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  await requireAdminSession();
  const body = await request.json();
  const parsed = pricingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Tarifs invalides." }, { status: 400 });
  }

  try {
    const pricing = await updatePricing(parsed.data);
    await writeAutomaticBackupSnapshot();
    return NextResponse.json(pricing);
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de mettre à jour les tarifs.") }, { status: 500 });
  }
}
