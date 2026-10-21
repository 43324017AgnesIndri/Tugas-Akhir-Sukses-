// Tipe data yang dipakai di seluruh dashboard

export type Mode = "AUTO" | "MANUAL" | "SAFE";
export type ActuatorKey = "kompresor" | "buzzer" | "fan" | "mist";
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
  reading: Reading | null;
  updatedAt: string | null;
  online: boolean;
  mode: Mode | null;
  safeReason: "sensor_gagal" | "dipilih_pengguna" | null;
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

// ===== Wi-Fi perangkat =====
export interface WifiNetwork {
  ssid: string;
  rssi: number; // dBm; makin dekat ke 0 makin kuat (-50 kuat, -80 lemah)
  secure: boolean; // true jika memakai password
}

// Hasil percobaan ganti Wi-Fi terakhir (dikirim ESP32)
export type WifiHasil = "ok" | "gagal_wifi" | "gagal_broker";

export interface WifiScan {
  id: string; // sama dengan id permintaan scan dari dashboard
  networks: WifiNetwork[];
}

export interface WifiStatus {
  connected: boolean; // perangkat terhubung ke Wi-Fi dan menjangkau broker (ada kabar baru-baru ini)
  ssid: string | null; // Wi-Fi yang dipakai (atau yang terakhir diketahui jika sedang terputus)
  rssi: number | null;
  ip: string | null;
  updatedAt: string | null;
  hasil: WifiHasil | null; // hasil ganti Wi-Fi terakhir
  target: string | null; // Wi-Fi yang dituju pada percobaan terakhir
  resultId: string | null; // id permintaan yang menghasilkan `hasil`
  scan: WifiScan | null; // hanya ada jika diminta dengan ?scan=1
}
