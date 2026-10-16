import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-server";
import { DEVICE_ID } from "@/lib/influx";
import type { Thresholds } from "@/lib/types";

interface DbRow {
  updated_at?: string | null;
  suhu_min: number | string;
  suhu_max: number | string;
  lembap_min: number | string;
  lembap_max: number | string;
}

const toThresholds = (r: DbRow): Thresholds => ({
  tmin: Number(r.suhu_min),
  tmax: Number(r.suhu_max),
  hmin: Number(r.lembap_min),
  hmax: Number(r.lembap_max),
});

// Membaca threshold (semua pengguna yang login)
export async function GET() {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { data, error } = await auth.supabase
    .from("thresholds")
    .select("suhu_min, suhu_max, lembap_min, lembap_max, updated_at")
    .eq("device_id", DEVICE_ID)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Threshold belum ada di database." }, { status: 404 });
  }
  return NextResponse.json({ thresholds: toThresholds(data), updatedAt: (data as DbRow).updated_at ?? null });
}

// Menyimpan threshold (hanya admin)
export async function PUT(request: Request) {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang boleh mengubah threshold." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Partial<Thresholds> | null;
  const v = {
    tmin: Number(body?.tmin),
    tmax: Number(body?.tmax),
    hmin: Number(body?.hmin),
    hmax: Number(body?.hmax),
  };
  if ([v.tmin, v.tmax, v.hmin, v.hmax].some((n) => !Number.isFinite(n))) {
    return NextResponse.json({ error: "Semua nilai harus berupa angka." }, { status: 400 });
  }
  if (v.tmin >= v.tmax || v.hmin >= v.hmax) {
    return NextResponse.json({ error: "Batas bawah harus lebih kecil dari batas atas." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("thresholds")
    .update({
      suhu_min: v.tmin,
      suhu_max: v.tmax,
      lembap_min: v.hmin,
      lembap_max: v.hmax,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("device_id", DEVICE_ID)
    .select("suhu_min, suhu_max, lembap_min, lembap_max")
    .single();

  if (error || !data) {
    console.error("[api/threshold]", error?.message);
    return NextResponse.json({ error: "Gagal menyimpan threshold ke database." }, { status: 500 });
  }
  return NextResponse.json({ thresholds: toThresholds(data) });
}
