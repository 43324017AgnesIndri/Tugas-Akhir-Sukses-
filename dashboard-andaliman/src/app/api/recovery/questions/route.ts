import { NextResponse } from "next/server";
import { QUESTIONS } from "@/lib/recovery-shared";

// Publik (tanpa login): pertanyaannya tetap dan sama untuk semua orang,
// jadi tidak membocorkan username mana yang terdaftar.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { username?: unknown };
  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (!username || username.length > 120) {
    return NextResponse.json({ error: "Username wajib diisi." }, { status: 400 });
  }
  return NextResponse.json({ questions: QUESTIONS });
}