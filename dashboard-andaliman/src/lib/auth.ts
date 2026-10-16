import { createClient } from "./supabase";
import type { Profile, Role } from "./types";

// Mengambil akun yang sedang login beserta role-nya dari tabel profiles.
// Jika role tidak ditemukan, dianggap "viewer" (paling aman).
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("nama, role").eq("id", user.id).single();
  const role: Role = data?.role === "admin" ? "admin" : "viewer";

  return { id: user.id, email: user.email ?? "", nama: data?.nama ?? null, role };
}

export async function signOut(): Promise<void> {
  await createClient().auth.signOut();
}
