import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { Role, UserInfo } from "@/lib/types";

const isRole = (v: unknown): v is Role => v === "admin" || v === "viewer";

// Semua fungsi di sini hanya untuk admin. Setelah dicek, baru memakai service_role.
async function requireAdmin() {
  const auth = await getServerAuth();
  if (!auth) return { error: NextResponse.json({ error: "Belum login" }, { status: 401 }) };
  if (auth.role !== "admin") {
    return { error: NextResponse.json({ error: "Hanya admin yang boleh mengelola pengguna." }, { status: 403 }) };
  }
  return { auth };
}

export async function GET() {
  const check = await requireAdmin();
  if (check.error) return check.error;

  try {
    const admin = createAdminClient();
    const [list, profs] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from("profiles").select("id, nama, role"),
    ]);
    if (list.error) throw list.error;

    const profMap = new Map<string, { nama: string | null; role: Role }>();
    (profs.data ?? []).forEach((p) => profMap.set(p.id, { nama: p.nama, role: p.role }));

    const users: UserInfo[] = list.data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      nama: profMap.get(u.id)?.nama ?? null,
      role: profMap.get(u.id)?.role ?? "viewer",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }));
    return NextResponse.json({ users });
  } catch (e) {
    console.error("[api/users GET]", e);
    return NextResponse.json({ error: "Tidak dapat membaca daftar pengguna. Cek SUPABASE_SERVICE_ROLE_KEY di .env.local." }, { status: 500 });
  }
}

// Membuat pengguna baru
export async function POST(request: Request) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string; nama?: string; role?: string }
    | null;
  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";
  const nama = (body?.nama ?? "").trim();
  const role: Role = isRole(body?.role) ? body.role : "viewer";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama: nama || email },
    });
    if (error || !data.user) {
      const dup = /already|registered|exists/i.test(error?.message ?? "");
      return NextResponse.json({ error: dup ? "Email sudah terdaftar." : "Gagal membuat pengguna." }, { status: 400 });
    }
    // Profil (role viewer) dibuat otomatis oleh trigger; naikkan jika diminta admin
    if (role === "admin") {
      await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/users POST]", e);
    return NextResponse.json({ error: "Gagal membuat pengguna." }, { status: 500 });
  }
}

// Mengubah role pengguna
export async function PUT(request: Request) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  const body = (await request.json().catch(() => null)) as { id?: string; role?: string } | null;
  if (!body?.id || !isRole(body.role)) {
    return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
  }
  if (body.id === check.auth.user.id) {
    return NextResponse.json({ error: "Anda tidak dapat mengubah role akun sendiri." }, { status: 400 });
  }

  try {
    const { error } = await createAdminClient().from("profiles").update({ role: body.role }).eq("id", body.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/users PUT]", e);
    return NextResponse.json({ error: "Gagal mengubah role." }, { status: 500 });
  }
}

// Menghapus pengguna
export async function DELETE(request: Request) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
  if (body.id === check.auth.user.id) {
    return NextResponse.json({ error: "Anda tidak dapat menghapus akun sendiri." }, { status: 400 });
  }

  try {
    const { error } = await createAdminClient().auth.admin.deleteUser(body.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/users DELETE]", e);
    return NextResponse.json({ error: "Gagal menghapus pengguna." }, { status: 500 });
  }
}
