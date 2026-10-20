// Mengisi InfluxDB dengan data contoh (menggantikan ESP32 sementara).
//
//   Isi riwayat 24 jam saja:
//     node --env-file=.env.local scripts/seed-influx.mjs
//
//   Isi riwayat, lalu terus kirim data baru tiap 5 detik (tekan Ctrl + C untuk berhenti):
//     node --env-file=.env.local scripts/seed-influx.mjs --live

import { InfluxDB, Point } from "@influxdata/influxdb-client";

const { INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET } = process.env;
const device = process.env.DEVICE_ID ?? "andaliman01";
const live = process.argv.includes("--live");

if (!INFLUX_URL || !INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
  console.error("INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET belum lengkap di .env.local");
  console.error("Jalankan perintah ini dari folder dashboard-andaliman, dengan --env-file=.env.local");
  process.exit(1);
}

const writeApi = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN }).getWriteApi(INFLUX_ORG, INFLUX_BUCKET, "s", {
  flushInterval: 1000,
});

const r1 = (n) => Math.round(n * 10) / 10;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const envPoint = (t, h, time) =>
  new Point("environment").tag("device_id", device).floatField("suhu", r1(t)).floatField("kelembapan", r1(h)).timestamp(time);

const actPoint = (t, h, time) =>
  new Point("actuator_state")
    .tag("device_id", device)
    .intField("kompresor", t > 24 || h > 85 ? 1 : 0)
    .intField("buzzer", 0)
    .intField("fan", 1)
    .intField("mist", h < 70 ? 1 : 0)
    .stringField("mode", "AUTO")
    .timestamp(time);

// 1) Riwayat 24 jam ke belakang, satu titik tiap 5 menit
const now = Date.now();
const STEP = 5 * 60 * 1000;
const COUNT = (24 * 60) / 5;
let t = 22;
let h = 78;
for (let i = COUNT; i >= 1; i--) {
  const k = COUNT - i;
  t = 22 + 1.6 * Math.sin(k / 20) + (Math.random() - 0.5) * 0.5;
  h = 78 + 4 * Math.sin(k / 28 + 1) + (Math.random() - 0.5) * 1.2;
  writeApi.writePoint(envPoint(t, h, new Date(now - i * STEP)));
}

// 2) Data terbaru
writeApi.writePoint(envPoint(t, h, new Date()));
writeApi.writePoint(actPoint(t, h, new Date()));
await writeApi.flush();
console.log(`Riwayat 24 jam untuk "${device}" berhasil ditulis ke bucket "${INFLUX_BUCKET}".`);

if (!live) {
  await writeApi.close();
  console.log("Selesai. Tambahkan --live untuk mengirim data baru terus-menerus.");
} else {
  console.log("Mode live: mengirim data baru tiap 5 detik. Tekan Ctrl + C untuk berhenti.");
  const timer = setInterval(() => {
    t = clamp(t + (Math.random() - 0.5) * 0.3, 15, 30);
    h = clamp(h + (Math.random() - 0.5) * 0.6, 55, 95);
    const time = new Date();
    writeApi.writePoint(envPoint(t, h, time));
    writeApi.writePoint(actPoint(t, h, time));
    console.log(`${time.toLocaleTimeString("id-ID")}  suhu=${r1(t)}  kelembapan=${r1(h)}`);
  }, 5000);

  process.on("SIGINT", async () => {
    clearInterval(timer);
    await writeApi.close();
    console.log("\nBerhenti.");
    process.exit(0);
  });
}
