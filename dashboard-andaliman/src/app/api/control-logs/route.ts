import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-server";
import { DEVICE_ID } from "@/lib/influx";
import type { ControlLogRecord } from "@/lib/types";

export async function GET() {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { data, error } = await auth.supabase
    .from("control_logs")
    .select("id, user_id, aksi, detail, created_at")
    .eq("device_id", DEVICE_ID)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[api/control-logs]", error.message);
    return NextResponse.json({ error: "Tidak dapat membaca log kontrol." }, { status: 502 });
  }

  // Nama pengguna hanya bisa dibaca admin (aturan RLS pada tabel profiles)
  const names = new Map<string, string>();
  const ids = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
  if (auth.role === "admin" && ids.length > 0) {
    const { data: profs } = await auth.supabase.from("profiles").select("id, nama").in("id", ids);
    (profs ?? []).forEach((p) => names.set(p.id, p.nama ?? ""));
  }

  const logs: ControlLogRecord[] = (data ?? []).map((r) => ({
    id: r.id,
    aksi: r.aksi,
    detail: r.detail,
    created_at: r.created_at,
    user_nama: r.user_id ? (names.get(r.user_id) ?? null) : null,
  }));
  return NextResponse.json({ logs });
}
