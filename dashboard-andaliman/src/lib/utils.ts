import type { ActuatorKey, Actuators, ChartPoint, HistoryPoint, HistoryRange, Mode, Severity, StatusInfo, Thresholds } from "./types";

// Daftar aktuator pada alat, sesuai urutan channel relay: 1 kompresor, 2 buzzer, 3 fan, 4 mist maker
export const ACTUATORS: { key: ActuatorKey; nama: string; ket: string }[] = [
  { key: "kompresor", nama: "Compressor", ket: "Room cooling" },
  { key: "buzzer", nama: "Buzzer", ket: "Audible alarm" },
  { key: "fan", nama: "Fan", ket: "Air circulation" },
  { key: "mist", nama: "Mist maker", ket: "Adds humidity" },
];

// Semua aktuator mati (nilai awal sebelum perangkat mengirim status)
export const ACTUATORS_OFF = Object.fromEntries(ACTUATORS.map((a) => [a.key, false])) as Actuators;

// Daftar mode kontrol
export const MODES: { key: Mode; ket: string }[] = [
  { key: "AUTO", ket: "Automatic control based on thresholds" },
  { key: "MANUAL", ket: "Control from the dashboard" },
  { key: "SAFE", ket: "Active when conditions are abnormal" },
];

export const fmt = (n: number): string =>
  n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

// Menentukan status nilai terhadap batas bawah dan atas
export function getStatus(v: number, min: number, max: number): StatusInfo {
  if (v < min) return { label: "Low", severity: "wn" };
  if (v > max) return { label: "High", severity: "bd" };
  return { label: "Normal", severity: "ok" };
}

// Nilai awal threshold sebelum data dari database selesai dimuat
export const DEFAULT_THRESHOLDS: Thresholds = { tmin: 18, tmax: 24, hmin: 70, hmax: 85 };

// Warna lencana alarm berdasarkan teks status
export function severityFromStatus(status: string): Severity {
  const s = status.toLowerCase();
  if (s === "tinggi" || s === "bahaya" || s === "kritis") return "bd";
  if (s === "rendah" || s === "peringatan") return "wn";
  if (s === "normal" || s === "ok") return "ok";
  return "in";
}

// Pilihan rentang waktu untuk grafik dan riwayat
export const RANGES: { key: HistoryRange; label: string }[] = [
  { key: "1h", label: "1 hour" },
  { key: "6h", label: "6 hours" },
  { key: "24h", label: "24 hours" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Mengubah titik riwayat dari API menjadi titik grafik dengan label waktu
export function toChartPoints(points: HistoryPoint[], range: HistoryRange): ChartPoint[] {
  const long = range === "7d" || range === "30d";
  return points.map((p) => {
    const d = new Date(p.time);
    const label = long
      ? d.toLocaleString("en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return { label, suhu: p.suhu, kelembapan: p.kelembapan };
  });
}

// Nilai terendah, rata-rata, dan tertinggi (null diabaikan)
export function stats(values: (number | null)[]): { min: number; max: number; avg: number } | null {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return {
    min: Math.min(...nums),
    max: Math.max(...nums),
    avg: nums.reduce((a, b) => a + b, 0) / nums.length,
  };
}

// Export CSV with semicolon separators and decimal points.
export function downloadCsv(filename: string, rows: (string | number | null)[][]): void {
  const esc = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(";")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
