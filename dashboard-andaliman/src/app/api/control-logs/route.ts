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

  const names = new Map<string, string>();
  const ids = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
  if (auth.role === "admin" && ids.length > 0) {
    const { data: profiles } = await auth.supabase.from("profiles").select("id, nama").in("id", ids);
    (profiles ?? []).forEach((profile) => names.set(profile.id, profile.nama ?? ""));
  }

  const logs: ControlLogRecord[] = (data ?? []).map((record) => ({
    id: record.id,
    aksi: record.aksi,
    detail: record.detail,
    created_at: record.created_at,
    user_nama: record.user_id ? (names.get(record.user_id) ?? null) : null,
  }));
  return NextResponse.json({ logs });
}
