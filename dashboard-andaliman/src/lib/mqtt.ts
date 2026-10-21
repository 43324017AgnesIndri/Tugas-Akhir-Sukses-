// src/lib/mqtt.ts  [F4]
// Mem-publish perintah dari dashboard ke broker MQTT (hanya dipakai di server / API route).
// Install dulu:  npm install mqtt
//
// Tambahkan di .env.local:
//   MQTT_URL=mqtt://localhost:1883
//   MQTT_USERNAME=...
//   MQTT_PASSWORD=...

import mqtt, { MqttClient } from "mqtt";
import { DEVICE_ID } from "./influx";

// Disimpan di globalThis supaya reload otomatis Next.js (npm run dev) tidak membuat koneksi baru terus-menerus
const g = globalThis as unknown as {
  __andalimanMqtt?: MqttClient;
  __andalimanMqttError?: string | null;
};

function statusError(err: Error): string {
  const reason = err as Error & { code?: number | string; reasonCode?: number };
  if (
    reason.reasonCode === 5 ||
    reason.code === 5 ||
    /not authori[sz]ed|bad user ?name or password/i.test(err.message)
  ) {
    return "Autentikasi Mosquitto ditolak. Periksa MQTT_USERNAME dan MQTT_PASSWORD.";
  }
  if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|EAI_AGAIN/i.test(err.message)) {
    return "Broker MQTT tidak dapat dijangkau. Periksa MQTT_URL dan pastikan Mosquitto berjalan.";
  }
  return "Koneksi ke broker MQTT gagal. Periksa konfigurasi Mosquitto.";
}

function getClient(): MqttClient {
  if (g.__andalimanMqtt) return g.__andalimanMqtt;

  const client = mqtt.connect(process.env.MQTT_URL ?? "mqtt://localhost:1883", {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: `dashboard-${Math.random().toString(16).slice(2, 8)}`,
    reconnectPeriod: 2000,
    connectTimeout: 5000,
  });

  g.__andalimanMqttError = null;
  client.on("connect", () => {
    g.__andalimanMqttError = null;
  });
  client.on("error", (err) => {
    g.__andalimanMqttError = statusError(err);
    console.error("[MQTT] error:", err.message);
  });
  g.__andalimanMqtt = client;
  return client;
}

export function getMqttStatus(): { connected: boolean; error: string | null } {
  const client = getClient();
  return {
    connected: client.connected,
    error: client.connected
      ? null
      : g.__andalimanMqttError ?? "Sedang menghubungkan ke broker MQTT.",
  };
}

// Topik perintah: andaliman/<DEVICE_ID>/cmd/<jenis>
// DEVICE_ID diambil dari influx.ts supaya sama dengan yang dipakai data sensor.
export const cmdTopic = (kind: "mode" | "actuator" | "threshold" | "wifi") =>
  `andaliman/${DEVICE_ID}/cmd/${kind}`;

// Mengubah galat teknis mqtt.js menjadi petunjuk yang bisa ditindaklanjuti
function jelaskan(e: Error): string {
  const m = e.message || "";
  if (/not authori[sz]ed|bad user ?name or password/i.test(m)) {
    return "Login broker MQTT ditolak. Cek MQTT_USERNAME dan MQTT_PASSWORD di .env.local, lalu restart npm run dev.";
  }
  if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH/i.test(m)) {
    return "Broker MQTT tidak dapat dijangkau. Cek MQTT_URL dan pastikan container mosquitto berjalan.";
  }
  return "Gagal terhubung ke broker MQTT: " + m;
}

// retain = true dipakai untuk threshold: broker menyimpan nilai terakhir dan mengirimnya
// ke ESP32 setiap kali ESP32 terhubung. Perintah mode dan aktuator TIDAK retained.
// Gagal cepat (maksimal 5 detik) dengan pesan yang menyebut penyebabnya.
export function publishCommand(
  topic: string,
  payload: unknown,
  qos: 0 | 1 = 1,
  retain = false
): Promise<void> {
  const c = getClient();
  return new Promise((resolve, reject) => {
    let selesai = false;
    const akhiri = (err?: Error | null) => {
      if (selesai) return;
      selesai = true;
      clearTimeout(timer);
      c.removeListener("error", onError);
      c.removeListener("connect", kirim);
      if (err) reject(err);
      else resolve();
    };
    const onError = (e: Error) => akhiri(new Error(jelaskan(e)));
    const kirim = () =>
      c.publish(topic, JSON.stringify(payload), { qos, retain }, (err) =>
        akhiri(err ? new Error(jelaskan(err)) : null)
      );
    const timer = setTimeout(
      () =>
        akhiri(
          new Error(
            c.connected
              ? "Broker MQTT tidak merespons."
              : "Tidak dapat terhubung ke broker MQTT. Cek MQTT_URL dan container mosquitto."
          )
        ),
      5000
    );

    c.on("error", onError);
    if (c.connected) kirim();
    else c.once("connect", kirim);
  });
}
