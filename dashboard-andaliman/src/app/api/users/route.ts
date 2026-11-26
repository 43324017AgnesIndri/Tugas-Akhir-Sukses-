import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { Role, UserInfo } from "@/lib/types";

const isRole = (v: unknown): v is Role => v === "admin" || v === "viewer";

// These functions are admin-only. The service_role client is created after authorization.
async function requireAdmin() {
  const auth = await getServerAuth();
  if (!auth) return { error: NextResponse.json({ error: "Not logged in." }, { status: 401 }) };
  if (auth.role !== "admin") {
    return { error: NextResponse.json({ error: "Only admins can manage users." }, { status: 403 }) };
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
    return NextResponse.json({ error: "Unable to retrieve the user list. Check SUPABASE_SERVICE_ROLE_KEY in .env.local." }, { status: 500 });
  }
}

// Create a user.
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
    return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
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
      return NextResponse.json({ error: dup ? "Email is already registered." : "Failed to create the user." }, { status: 400 });
    }
    // The trigger creates a viewer profile; promote it if requested by the admin.
    if (role === "admin") {
      await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/users POST]", e);
    return NextResponse.json({ error: "Failed to create the user." }, { status: 500 });
  }
}

// Update a user's role.
export async function PUT(request: Request) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  const body = (await request.json().catch(() => null)) as { id?: string; role?: string } | null;
  if (!body?.id || !isRole(body.role)) {
    return NextResponse.json({ error: "Incomplete data." }, { status: 400 });
  }
  if (body.id === check.auth.user.id) {
    return NextResponse.json({ error: "You cannot change your own account role." }, { status: 400 });
  }

  try {
    const { error } = await createAdminClient().from("profiles").update({ role: body.role }).eq("id", body.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/users PUT]", e);
    return NextResponse.json({ error: "Failed to update the role." }, { status: 500 });
  }
}

// Delete a user.
export async function DELETE(request: Request) {
  const check = await requireAdmin();
  if (check.error) return check.error;

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Incomplete data." }, { status: 400 });
  if (body.id === check.auth.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  try {
    const { error } = await createAdminClient().auth.admin.deleteUser(body.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/users DELETE]", e);
    return NextResponse.json({ error: "Failed to delete the user." }, { status: 500 });
  }
}
