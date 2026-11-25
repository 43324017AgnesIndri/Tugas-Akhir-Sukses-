import { InfluxDB, Point } from "@influxdata/influxdb-client";

const { INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET } = process.env;
const device = process.env.DEVICE_ID ?? "andaliman01";
const [suhuArg, kelembapanArg, waktuArg] = process.argv.slice(2);

if (suhuArg === "--help") {
  console.log("Usage: node --env-file=.env.local scripts/write-manual-reading.mjs <suhu> <kelembapan> [timestamp-ISO]");
  process.exit(0);
}

if (!INFLUX_URL || !INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
  throw new Error("INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET belum lengkap di .env.local");
}

const suhu = Number(suhuArg);
const kelembapan = Number(kelembapanArg);
const waktu = waktuArg ? new Date(waktuArg) : new Date();

if (!Number.isFinite(suhu) || suhu < -40 || suhu > 125) {
  throw new Error("Suhu harus berupa angka antara -40 dan 125 °C.");
}
if (!Number.isFinite(kelembapan) || kelembapan < 0 || kelembapan > 100) {
  throw new Error("Kelembapan harus berupa angka antara 0 dan 100 %.");
}
if (!Number.isFinite(waktu.getTime()) || waktu.getTime() > Date.now()) {
  throw new Error("Timestamp harus valid dan tidak boleh berada di masa depan.");
}
if (!/^[A-Za-z0-9_-]{3,40}$/.test(device)) {
  throw new Error("DEVICE_ID harus 3-40 karakter: huruf, angka, - atau _.");
}

const writeApi = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN }).getWriteApi(
  INFLUX_ORG,
  INFLUX_BUCKET,
  "ms"
);
const point = new Point("environment_manual")
  .tag("device_id", device)
  .floatField("suhu", Math.round(suhu * 10) / 10)
  .floatField("kelembapan", Math.round(kelembapan * 10) / 10)
  .timestamp(waktu);

try {
  writeApi.writePoint(point);
  await writeApi.flush();
  console.log(`Pembacaan manual tersimpan untuk ${device} pada ${waktu.toISOString()}.`);
} finally {
  await writeApi.close();
}
