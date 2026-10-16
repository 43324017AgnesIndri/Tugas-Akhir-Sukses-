import { createBrowserClient } from "@supabase/ssr";

// Koneksi Supabase untuk kode yang berjalan di browser.
// Hanya memakai kunci PUBLIK (anon/publishable), bukan service_role.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi di .env.local");
  }
  return createBrowserClient(url, key);
}
