import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { createStudentSession, getStudentSessions, writeAutomaticBackupSnapshot } from "@/lib/db";
import { studentSessionSchema } from "@/lib/validation";

export async function GET() {
  await requireAdminSession();
  try {
    return NextResponse.json(await getStudentSessions());
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de charger les séances.") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await requireAdminSession();
  const body = await request.json();
  const parsed = studentSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Séance invalide." }, { status: 400 });
  }

  try {
    const session = await createStudentSession(parsed.data);
    await writeAutomaticBackupSnapshot();
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de créer la séance.") }, { status: 500 });
  }
}
