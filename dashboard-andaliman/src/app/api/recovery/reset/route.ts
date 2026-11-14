import { NextResponse } from "next/server";
import { adminClient, findUserIdByEmail, verifyAnswer } from "@/lib/recovery-server";
import { PASSWORD_MIN, QUESTION_COUNT, toEmail } from "@/lib/recovery-shared";

// Setiap 5 jawaban salah beruntun, akun dikunci. Kuncinya makin lama:
// 15 menit, 30 menit, 1 jam, 2 jam, lalu maksimal 4 jam.
const FAILS_PER_ROUND = 5;
const BASE_LOCK_MINUTES = 15;
const MAX_LOCK_MINUTES = 240;

const fail = () =>
  NextResponse.json(
    { error: "Verifikasi gagal. Periksa username dan jawaban Anda." },
    { status: 400 }
  );

// Publik (tanpa login): memeriksa jawaban lalu mengganti password.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    username?: unknown;
    answers?: unknown;
    newPassword?: unknown;
  };

  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const answers =
    Array.isArray(body.answers) &&
    body.answers.length === QUESTION_COUNT &&
    body.answers.every((a) => typeof a === "string")
      ? (body.answers as string[])
      : null;
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!username || !answers || answers.some((a) => !a.trim())) {
    return NextResponse.json({ error: "Semua isian wajib diisi." }, { status: 400 });
  }
  if (newPassword.length < PASSWORD_MIN || newPassword.length > 72) {
    return NextResponse.json(
      { error: `Password baru minimal ${PASSWORD_MIN} karakter.` },
      { status: 400 }
    );
  }

  const admin = adminClient();
  const userId = await findUserIdByEmail(admin, toEmail(username));
  if (!userId) return fail();

  // Cek penguncian
  const { data: att } = await admin
    .from("recovery_attempts")
    .select("failed_count, locked_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (att?.locked_until && new Date(att.locked_until).getTime() > Date.now()) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429 }
    );
  }

  const { data: rows } = await admin
    .from("recovery_questions")
    .select("slot, answer_hash")
    .eq("user_id", userId)
    .order("slot");
  if (!rows || rows.length !== QUESTION_COUNT) return fail();

  // Periksa semua jawaban tanpa berhenti di yang pertama salah
  const results = rows.map((r) =>
    verifyAnswer(answers[(r.slot as number) - 1], r.answer_hash as string)
  );
  const allCorrect = results.every(Boolean);

  if (!allCorrect) {
    const failed = (att?.failed_count ?? 0) + 1;
    let lockedUntil: string | null = null;
    if (failed % FAILS_PER_ROUND === 0) {
      const round = failed / FAILS_PER_ROUND;
      const minutes = Math.min(BASE_LOCK_MINUTES * 2 ** (round - 1), MAX_LOCK_MINUTES);
      lockedUntil = new Date(Date.now() + minutes * 60_000).toISOString();
    }
    await admin.from("recovery_attempts").upsert({
      user_id: userId,
      failed_count: failed,
      locked_until: lockedUntil,
    });
    return fail();
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) {
    return NextResponse.json({ error: "Gagal mengganti password. Coba lagi." }, { status: 500 });
  }

  await admin.from("recovery_attempts").delete().eq("user_id", userId);
  return NextResponse.json({ ok: true });
}