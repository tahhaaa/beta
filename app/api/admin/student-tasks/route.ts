import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { createStudentTask, getStudentTasks, writeAutomaticBackupSnapshot } from "@/lib/db";
import { studentTaskSchema } from "@/lib/validation";

export async function GET() {
  await requireAdminSession();
  try {
    return NextResponse.json(await getStudentTasks());
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de charger les tâches.") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await requireAdminSession();
  const body = await request.json();
  const parsed = studentTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Tâche invalide." }, { status: 400 });
  }

  try {
    const task = await createStudentTask(parsed.data);
    await writeAutomaticBackupSnapshot();
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de créer la tâche.") }, { status: 500 });
  }
}
