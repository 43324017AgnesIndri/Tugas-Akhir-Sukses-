import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-server";
import { ONLINE_WITHIN_MS, q, queryRows } from "@/lib/influx";
import type { DeviceInfo } from "@/lib/types";

interface SeenRow {
  device_id: string;
  _time: string;
}

// Daftar perangkat (semua pengguna), lengkap dengan waktu data terakhir dari InfluxDB
export async function GET() {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { data, error } = await auth.supabase
    .from("devices")
    .select("id, device_id, nama, lokasi, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[api/devices]", error.message);
    return NextResponse.json({ error: "Tidak dapat membaca daftar perangkat." }, { status: 502 });
  }

  // Jika InfluxDB tidak bisa dijangkau, perangkat tetap tampil dengan status offline
  const seen = new Map<string, number>();
  try {
    const rows = await queryRows<SeenRow>(
      (bucket) => `
        from(bucket: ${q(bucket)})
          |> range(start: -30d)
          |> filter(fn: (r) => r._measurement == "environment" and r._field == "suhu")
          |> last()
          |> keep(columns: ["device_id", "_time"])
      `
    );
    rows.forEach((r) => seen.set(r.device_id, new Date(r._time).getTime()));
  } catch (e) {
    console.error("[api/devices influx]", e);
  }

  const devices: DeviceInfo[] = (data ?? []).map((d) => {
    const ms = seen.get(d.device_id) ?? null;
    return {
      ...d,
      lastSeen: ms ? new Date(ms).toISOString() : null,
      online: ms !== null && Date.now() - ms < ONLINE_WITHIN_MS,
    };
  });
  return NextResponse.json({ devices });
}

// Menambah perangkat (hanya admin)
export async function POST(request: Request) {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang boleh menambah perangkat." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { device_id?: string; nama?: string; lokasi?: string } | null;
  const deviceId = (body?.device_id ?? "").trim();
  const nama = (body?.nama ?? "").trim();
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(deviceId)) {
    return NextResponse.json({ error: "ID perangkat 3-40 karakter: huruf, angka, - dan _ saja." }, { status: 400 });
  }
  if (!nama) return NextResponse.json({ error: "Nama perangkat wajib diisi." }, { status: 400 });

  const { error } = await auth.supabase
    .from("devices")
    .insert({ device_id: deviceId, nama, lokasi: (body?.lokasi ?? "").trim() || null });
  if (error) {
    const msg = error.code === "23505" ? "ID perangkat sudah terdaftar." : "Gagal menambah perangkat.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Siapkan baris threshold bawaan untuk perangkat baru
  await auth.supabase.from("thresholds").insert({ device_id: deviceId });
  return NextResponse.json({ ok: true });
}

// Mengubah nama dan lokasi perangkat (hanya admin)
export async function PUT(request: Request) {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang boleh mengubah perangkat." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { id?: string; nama?: string; lokasi?: string } | null;
  const nama = (body?.nama ?? "").trim();
  if (!body?.id || !nama) return NextResponse.json({ error: "Nama perangkat wajib diisi." }, { status: 400 });

  const { error } = await auth.supabase
    .from("devices")
    .update({ nama, lokasi: (body.lokasi ?? "").trim() || null })
    .eq("id", body.id);
  if (error) return NextResponse.json({ error: "Gagal menyimpan perubahan." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
