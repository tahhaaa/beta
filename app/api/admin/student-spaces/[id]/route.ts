import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth";
import { updateStudentSpace, writeAutomaticBackupSnapshot } from "@/lib/db";
import { studentSpaceUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const body = await request.json();
  const parsed = studentSpaceUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Configuration élève invalide." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    await updateStudentSpace(Number(id), parsed.data);
    await writeAutomaticBackupSnapshot();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error, "Impossible de mettre à jour cet espace élève.") }, { status: 500 });
  }
}
