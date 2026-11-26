import type { ApplyResult, Thresholds } from "./types";
import { THRESHOLD_RANGE_ERRORS } from "./threshold-validation";

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
    if (!res.ok) return { ok: false, data: null, error: json?.error ?? "Request failed." };
    return { ok: true, data: json, error: null };
  } catch {
    return { ok: false, data: null, error: "Unable to connect to the server." };
  }
}

// Menyimpan threshold ke Supabase lewat API
export async function saveThresholds(v: Thresholds): Promise<ApplyResult> {
  if ([v.tmin, v.tmax, v.hmin, v.hmax].some((n) => !Number.isFinite(n))) {
    return { ok: false, message: "All fields must contain valid numbers." };
  }
  const rangeErrors = [];
  if (v.tmin >= v.tmax) {
    rangeErrors.push(THRESHOLD_RANGE_ERRORS.temperature);
  }
  if (v.hmin >= v.hmax) {
    rangeErrors.push(THRESHOLD_RANGE_ERRORS.humidity);
  }
  if (rangeErrors.length) return { ok: false, message: rangeErrors.join(" ") };
  const r = await sendJson<{ thresholds: Thresholds; synced?: boolean }>("PUT", "/api/threshold", v);
  if (!r.ok) return { ok: false, message: r.error ?? "Failed to save thresholds." };
  if (r.data?.synced === false) {
    return { ok: true, message: "Thresholds were saved to the database but not sent to the device because the MQTT broker is unreachable." };
  }
  return { ok: true, message: "Thresholds were saved and sent to the device." };
}
