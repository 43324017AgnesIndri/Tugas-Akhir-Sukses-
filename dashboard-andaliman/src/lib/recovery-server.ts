// HANYA untuk kode server (route API). Jangan diimpor dari komponen "use client".
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { QUESTIONS } from "./recovery-shared";

/** Koneksi Supabase dengan kunci rahasia (melewati RLS). Hanya di server. */
export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Pengguna yang sedang login (dari cookie sesi), atau null. */
export async function getSessionUser() {
  const store = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => store.getAll(), setAll: () => {} } }
  );
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/** Huruf kecil, tanpa aksen, tanpa tanda baca, spasi dirapikan. */
export function normalizeAnswer(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Hash jawaban dengan scrypt + salt acak. Format: salt:hash (hex). */
export function hashAnswer(answer: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(normalizeAnswer(answer), salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyAnswer(answer: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(normalizeAnswer(answer), Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** Cari id pengguna dari email (daftar pengguna kecil, cukup beberapa halaman). */
export async function findUserIdByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) break;
  }
  return null;
}

/**
 * Pertanyaan palsu yang selalu sama untuk username tertentu.
 * Dipakai bila username tidak ada / belum mengatur pemulihan,
 * supaya orang luar tidak bisa mengetahui username mana yang terdaftar.
 */
export function fakeQuestions(username: string): string[] {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "x";
  const h = createHmac("sha256", secret).update(username).digest();
  const picked: number[] = [];
  for (let i = 0; i < h.length && picked.length < 3; i++) {
    const idx = h[i] % QUESTIONS.length;
    if (!picked.includes(idx)) picked.push(idx);
  }
  return picked.map((i) => QUESTIONS[i]);
}