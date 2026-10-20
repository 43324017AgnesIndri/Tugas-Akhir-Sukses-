import type { ApplyResult, Thresholds } from "./types";

interface SendResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

// Mengirim data JSON ke API (POST, PUT, PATCH, DELETE)
export async function sendJson<T = unknown>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  body: unknown
): Promise<SendResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok) return { ok: false, data: null, error: json?.error ?? "Permintaan gagal." };
    return { ok: true, data: json, error: null };
  } catch {
    return { ok: false, data: null, error: "Tidak dapat terhubung ke server." };
  }
}

// Menyimpan threshold ke Supabase lewat API
export async function saveThresholds(v: Thresholds): Promise<ApplyResult> {
  if ([v.tmin, v.tmax, v.hmin, v.hmax].some((n) => Number.isNaN(n))) {
    return { ok: false, message: "Semua kolom harus berisi angka." };
  }
  if (v.tmin >= v.tmax || v.hmin >= v.hmax) {
    return { ok: false, message: "Batas bawah harus lebih kecil dari batas atas." };
  }
  const r = await sendJson<{ thresholds: Thresholds; synced?: boolean }>("PUT", "/api/threshold", v);
  if (!r.ok) return { ok: false, message: r.error ?? "Gagal menyimpan threshold." };
  if (r.data?.synced === false) {
    return { ok: true, message: "Threshold tersimpan di database, tetapi belum terkirim ke perangkat (broker MQTT tidak terjangkau)." };
  }
  return { ok: true, message: "Threshold tersimpan dan dikirim ke perangkat." };
}
