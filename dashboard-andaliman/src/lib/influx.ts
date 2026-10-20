import { InfluxDB } from "@influxdata/influxdb-client";

// Hanya dipakai di server (API route). Token tidak pernah sampai ke browser.
export const DEVICE_ID = process.env.DEVICE_ID ?? "andaliman01";

// Perangkat dianggap online jika ada data baru dalam 30 detik terakhir.
// ESP32 mengirim data tiap 5 detik (DATA_INTERVAL_MS di firmware), jadi 30 detik = 6 kiriman terlewat.
export const ONLINE_WITHIN_MS = 30 * 1000;

// Membuat teks Flux yang aman: "nilai" dengan tanda kutip
export const q = (s: string): string => JSON.stringify(s);

function config() {
  const url = process.env.INFLUX_URL;
  const token = process.env.INFLUX_TOKEN;
  const org = process.env.INFLUX_ORG;
  const bucket = process.env.INFLUX_BUCKET;
  if (!url || !token || !org || !bucket) {
    throw new Error("Pengaturan INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET belum lengkap di .env.local");
  }
  return { url, token, org, bucket };
}

// Menjalankan query Flux dan mengembalikan baris hasilnya
export async function queryRows<T = Record<string, unknown>>(build: (bucket: string) => string): Promise<T[]> {
  const { url, token, org, bucket } = config();
  const api = new InfluxDB({ url, token, timeout: 10000 }).getQueryApi(org);
  return api.collectRows<T>(build(bucket));
}
