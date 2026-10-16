import { createServerSupabase } from "./supabase-server";
import type { Role } from "./types";

// Dipakai di API route: mengembalikan null jika belum login.
export async function getServerAuth() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role: Role = data?.role === "admin" ? "admin" : "viewer";

  return { supabase, user, role };
}
