import { NextResponse } from "next/server";
import { adminClient, getSessionUser, hashAnswer, normalizeAnswer } from "@/lib/recovery-server";
import { QUESTIONS, QUESTION_COUNT } from "@/lib/recovery-shared";

// Wajib login: menyimpan jawaban pemulihan milik pengguna yang sedang login.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { items?: unknown };
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length !== QUESTION_COUNT) {
    return NextResponse.json({ error: `Isi ${QUESTION_COUNT} jawaban.` }, { status: 400 });
  }

  const rows: { user_id: string; slot: number; question: string; answer_hash: string }[] = [];
  for (let i = 0; i < QUESTION_COUNT; i++) {
    const a = (items[i] as { answer?: unknown })?.answer;
    if (typeof a !== "string" || normalizeAnswer(a).length < 3) {
      return NextResponse.json({ error: "Setiap jawaban minimal 3 karakter." }, { status: 400 });
    }
    rows.push({
      user_id: user.id,
      slot: i + 1,
      question: QUESTIONS[i],
      answer_hash: hashAnswer(a),
    });
  }

  const admin = adminClient();
  // Hapus isian lama dulu (mis. dari versi 3 pertanyaan), lalu simpan yang baru
  const del = await admin.from("recovery_questions").delete().eq("user_id", user.id);
  if (del.error) return NextResponse.json({ error: "Gagal menyimpan." }, { status: 500 });

  const ins = await admin.from("recovery_questions").insert(rows);
  if (ins.error) return NextResponse.json({ error: "Gagal menyimpan." }, { status: 500 });

  return NextResponse.json({ ok: true });
}