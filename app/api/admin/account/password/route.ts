import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { getServerSession, requireAdminSession, verifyPassword } from "@/lib/auth";
import { getAdminByUsername, updateAdminPassword, writeAutomaticBackupSnapshot } from "@/lib/db";
import { adminPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  await requireAdminSession();
  const session = await getServerSession();
  const body = await request.json();
  const parsed = adminPasswordSchema.safeParse(body);

  if (!parsed.success || !session) {
    return NextResponse.json({ message: "Demande invalide." }, { status: 400 });
  }

  try {
    const admin = await getAdminByUsername(session.username);
    if (!admin || !verifyPassword(parsed.data.currentPassword, admin.password_hash)) {
      return NextResponse.json({ message: "Le mot de passe actuel est incorrect." }, { status: 400 });
    }

    await updateAdminPassword(session.username, parsed.data.newPassword);
    await writeAutomaticBackupSnapshot();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Changement de mot de passe impossible.") }, { status: 500 });
  }
}
