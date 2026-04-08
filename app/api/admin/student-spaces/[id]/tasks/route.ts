import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { createStudentPortalTask, getStudentPortalTasks, writeAutomaticBackupSnapshot } from "@/lib/db";
import { studentPortalTaskSchema } from "@/lib/validation";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  try {
    const { id } = await context.params;
    return NextResponse.json(await getStudentPortalTasks(Number(id)));
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de charger les tâches.") }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const body = await request.json();
  const parsed = studentPortalTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Tâche invalide." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const task = await createStudentPortalTask(Number(id), parsed.data);
    await writeAutomaticBackupSnapshot();
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de créer la tâche.") }, { status: 500 });
  }
}
