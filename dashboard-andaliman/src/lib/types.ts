// Tipe data yang dipakai di seluruh dashboard

export type Mode = "AUTO" | "MANUAL" | "SAFE";
export type ActuatorKey = "kompresor" | "fan" | "mist";
export type Actuators = Record<ActuatorKey, boolean>;

export interface Thresholds {
  tmin: number; // suhu bawah (°C)
  tmax: number; // suhu atas (°C)
  hmin: number; // kelembapan bawah (%)
  hmax: number; // kelembapan atas (%)
}

export interface Reading {
  t: number; // suhu (°C)
  h: number; // kelembapan (%)
}

// ok = normal, wn = peringatan, bd = bahaya, in = info
export type Severity = "ok" | "wn" | "bd" | "in";

export interface StatusInfo {
  label: string;
  severity: Severity;
}

export interface AlarmRow {
  id: string;
  waktu: string;
  parameter: string;
  nilai: string;
  status: string;
  severity: Severity;
  keterangan: string;
}

export interface ChartPoint {
  label: string; // jam, contoh "14:30"
  suhu: number | null;
  kelembapan: number | null;
}

export interface ApplyResult {
  ok: boolean;
  message: string;
}

// ===== F2: akun pengguna =====
export type Role = "admin" | "viewer";

export interface Profile {
  id: string;
  email: string;
  nama: string | null;
  role: Role;
}

// ===== F3: bentuk data dari API =====
export interface DashboardData {
  deviceId: string;
  reading: Reading | null; // null jika belum ada data di InfluxDB
  updatedAt: string | null; // waktu data terakhir (ISO)
  online: boolean; // true jika ada data baru dalam 3 menit terakhir
  mode: Mode | null;
  actuators: Actuators;
  hasActuatorState: boolean;
}

export interface HistoryPoint {
  time: string; // ISO
  suhu: number | null;
  kelembapan: number | null;
}

export interface AlarmRecord {
  id: string;
  parameter: string;
  nilai: string | null;
  status: string;
  keterangan: string | null;
  acknowledged: boolean;
  created_at: string;
}

// ===== F4: menu lengkap =====
export type HistoryRange = "1h" | "6h" | "24h" | "7d" | "30d";

export interface ControlLogRecord {
  id: string;
  aksi: string;
  detail: unknown;
  created_at: string;
  user_nama: string | null;
}

export interface DeviceInfo {
  id: string;
  device_id: string;
  nama: string;
  lokasi: string | null;
  created_at: string;
  lastSeen: string | null;
  online: boolean;
}

export interface UserInfo {
  id: string;
  email: string;
  nama: string | null;
  role: Role;
  created_at: string;
  last_sign_in_at: string | null;
}
