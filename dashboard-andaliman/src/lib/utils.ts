import type { ActuatorKey, ChartPoint, HistoryPoint, HistoryRange, Mode, Severity, StatusInfo, Thresholds } from "./types";

// Daftar aktuator pada alat
export const ACTUATORS: { key: ActuatorKey; nama: string; ket: string }[] = [
  { key: "kompresor", nama: "Kompresor", ket: "Pendingin ruang" },
  { key: "fan", nama: "Fan", ket: "Sirkulasi udara" },
  { key: "mist", nama: "Mist maker", ket: "Menambah kelembapan" },
];

// Daftar mode kontrol
export const MODES: { key: Mode; ket: string }[] = [
  { key: "AUTO", ket: "Otomatis sesuai threshold" },
  { key: "MANUAL", ket: "Kontrol lewat dashboard" },
  { key: "SAFE", ket: "Aktif saat kondisi abnormal" },
];

// Angka dengan 1 desimal dan koma: 22.4 -> "22,4"
export const fmt = (n: number): string => n.toFixed(1).replace(".", ",");

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

// Menentukan status nilai terhadap batas bawah dan atas
export function getStatus(v: number, min: number, max: number): StatusInfo {
  if (v < min) return { label: "Rendah", severity: "wn" };
  if (v > max) return { label: "Tinggi", severity: "bd" };
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
  { key: "1h", label: "1 jam" },
  { key: "6h", label: "6 jam" },
  { key: "24h", label: "24 jam" },
  { key: "7d", label: "7 hari" },
  { key: "30d", label: "30 hari" },
];

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
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
      ? d.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
      : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
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

// Unduh file CSV. Pemisah titik koma dan desimal koma agar terbaca benar di Excel berbahasa Indonesia.
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
