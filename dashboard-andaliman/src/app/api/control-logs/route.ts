// src/app/api/control/route.ts  [F4]
// Menerima perintah dari dashboard, memvalidasi, mengirim ke MQTT, lalu mencatat ke tabel control_logs.
//
// Body yang diterima:
//   { "type": "mode",     "value": "AUTO" | "MANUAL" | "SAFE" }
//   { "type": "actuator", "target": "kompresor" | "fan" | "mist", "state": true | false }
//
// Nama aktuator ("kompresor", "fan", "mist") sama dengan ActuatorKey di types.ts
// dan dengan yang dipahami firmware ESP32.

import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-server";
import { DEVICE_ID } from "@/lib/influx";
import { publishCommand, cmdTopic } from "@/lib/mqtt";
import type { ActuatorKey, Mode } from "@/lib/types";
import { ACTUATORS, MODES } from "@/lib/utils";

const MODE_KEYS: readonly string[] = MODES.map((m) => m.key);
const NAMA_AKTUATOR = Object.fromEntries(ACTUATORS.map((a) => [a.key, a.nama])) as Record<ActuatorKey, string>;
const isActuator = (v: unknown): v is ActuatorKey => ACTUATORS.some((a) => a.key === v);
const isMode = (v: unknown): v is Mode => typeof v === "string" && MODE_KEYS.includes(v);

export async function POST(req: Request) {
  // 1. Wajib login, dan hanya admin yang boleh mengontrol
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang boleh mengontrol" }, { status: 403 });
  }

  // 2. Validasi isi perintah
  const body = (await req.json().catch(() => null)) as {
    type?: unknown;
    value?: unknown;
    target?: unknown;
    state?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Body bukan JSON" }, { status: 400 });

  let topic: string;
  let payload: Record<string, unknown>;
  let aksi: string;
  let detail: string;

  if (body.type === "mode" && isMode(body.value)) {
    topic = cmdTopic("mode");
    payload = { mode: body.value, ts: Date.now() };
    aksi = "Mode kontrol";
    detail = body.value;
  } else if (body.type === "actuator" && isActuator(body.target) && typeof body.state === "boolean") {
    topic = cmdTopic("actuator");
    payload = { target: body.target, state: body.state, ts: Date.now() };
    aksi = `Aktuator ${NAMA_AKTUATOR[body.target]}`;
    detail = body.state ? "ON" : "OFF";
  } else {
    return NextResponse.json({ error: "Perintah tidak valid" }, { status: 400 });
  }

  // 3. Kirim ke MQTT
  try {
    await publishCommand(topic, payload);
  } catch (e) {
    const alasan = e instanceof Error ? e.message : "Perintah gagal dikirim ke broker MQTT.";
    console.error("[api/control] MQTT:", alasan);
    return NextResponse.json({ error: alasan }, { status: 502 });
  }

  // 4. Catat ke control_logs (hanya perintah yang berhasil terkirim)
  const { error } = await auth.supabase.from("control_logs").insert({
    device_id: DEVICE_ID,
    user_id: auth.user.id,
    aksi,
    detail,
  });
  if (error) console.error("[api/control] log:", error.message);

  return NextResponse.json({ ok: true });
}
