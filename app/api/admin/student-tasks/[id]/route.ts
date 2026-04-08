import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { deleteStudentTask, updateStudentTaskStatus, writeAutomaticBackupSnapshot } from "@/lib/db";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["todo", "done"]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const body = await request.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Statut de tâche invalide." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    await updateStudentTaskStatus(Number(id), parsed.data.status);
    await writeAutomaticBackupSnapshot();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de mettre à jour la tâche.") }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();

  try {
    const { id } = await context.params;
    await deleteStudentTask(Number(id));
    await writeAutomaticBackupSnapshot();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de supprimer la tâche.") }, { status: 500 });
  }
}
