1
import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-server";
import { DEVICE_ID } from "@/lib/influx";

export async function GET(request: Request) {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const raw = Number(new URL(request.url).searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(raw) ? Math.min(200, Math.max(1, Math.floor(raw))) : 20;

  const { data, error } = await auth.supabase
    .from("alarms")
    .select("id, parameter, nilai, status, keterangan, acknowledged, created_at")
    .eq("device_id", DEVICE_ID)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[api/alarms]", error.message);
    return NextResponse.json({ error: "Tidak dapat membaca data alarm dari Supabase." }, { status: 502 });
  }
  return NextResponse.json({ alarms: data ?? [] });
}

// Menandai alarm sudah dibaca (hanya admin). Kirim {id} untuk satu alarm, atau {} untuk semua.
export async function PATCH(request: Request) {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang boleh menandai alarm." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const base = auth.supabase.from("alarms").update({ acknowledged: true }).eq("device_id", DEVICE_ID);
  const { error } = body?.id ? await base.eq("id", body.id) : await base.eq("acknowledged", false);

  if (error) {
    console.error("[api/alarms PATCH]", error.message);
    return NextResponse.json({ error: "Gagal memperbarui alarm." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
