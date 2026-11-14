import { NextResponse } from "next/server";
import { adminClient, getSessionUser } from "@/lib/recovery-server";
import { QUESTION_COUNT } from "@/lib/recovery-shared";

// Wajib login: apakah pengguna ini sudah mengatur pertanyaan pemulihan?
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { count } = await adminClient()
    .from("recovery_questions")
    .select("slot", { count: "exact", head: true })
    .eq("user_id", user.id);

  return NextResponse.json({ configured: count === QUESTION_COUNT });
}