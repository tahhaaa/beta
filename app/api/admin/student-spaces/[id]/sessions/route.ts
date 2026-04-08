import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { createStudentPortalSession, getStudentPortalSessions, writeAutomaticBackupSnapshot } from "@/lib/db";
import { studentPortalSessionSchema } from "@/lib/validation";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  try {
    const { id } = await context.params;
    return NextResponse.json(await getStudentPortalSessions(Number(id)));
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de charger les séances.") }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const body = await request.json();
  const parsed = studentPortalSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Séance invalide." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const session = await createStudentPortalSession(Number(id), parsed.data);
    await writeAutomaticBackupSnapshot();
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de créer la séance.") }, { status: 500 });
  }
}
