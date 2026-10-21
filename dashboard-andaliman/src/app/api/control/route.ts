import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-server";
import { DEVICE_ID } from "@/lib/influx";
import { cmdTopic, publishCommand } from "@/lib/mqtt";
import type { ActuatorKey, Mode } from "@/lib/types";
import { ACTUATORS, MODES } from "@/lib/utils";

const MODE_KEYS: readonly string[] = MODES.map((mode) => mode.key);
const NAMA_AKTUATOR = Object.fromEntries(ACTUATORS.map((actuator) => [actuator.key, actuator.nama])) as Record<
  ActuatorKey,
  string
>;
const isActuator = (value: unknown): value is ActuatorKey => ACTUATORS.some((actuator) => actuator.key === value);
const isMode = (value: unknown): value is Mode => typeof value === "string" && MODE_KEYS.includes(value);

export async function POST(req: Request) {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang boleh mengontrol" }, { status: 403 });
  }

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

  try {
    await publishCommand(topic, payload);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Perintah gagal dikirim ke broker MQTT.";
    console.error("[api/control] MQTT:", reason);
    return NextResponse.json({ error: reason }, { status: 502 });
  }

  const { error } = await auth.supabase.from("control_logs").insert({
    device_id: DEVICE_ID,
    user_id: auth.user.id,
    aksi,
    detail,
  });
  if (error) console.error("[api/control] log:", error.message);

  return NextResponse.json({ ok: true });
}
