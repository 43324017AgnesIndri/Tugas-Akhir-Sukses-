import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Koneksi Supabase untuk API route. Memakai sesi login pengguna,
// sehingga aturan RLS di database tetap berlaku.
export async function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi di .env.local");
  }
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Diabaikan: pembaruan cookie ditangani oleh proxy.ts
        }
      },
    },
  });
}
