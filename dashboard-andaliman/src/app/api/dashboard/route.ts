import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-server";
import { DEVICE_ID, ONLINE_WITHIN_MS, q, queryRows } from "@/lib/influx";
import type { DashboardData, Mode } from "@/lib/types";

interface Row {
  _field: string;
  _value: number | string | boolean;
  _time: string;
}

const isOn = (v: unknown): boolean => v === true || Number(v) === 1;
const pick = (rows: Row[], field: string) => rows.find((r) => r._field === field);

export async function GET() {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  try {
    const latest = (measurement: string) => (bucket: string) => `
      from(bucket: ${q(bucket)})
        |> range(start: -7d)
        |> filter(fn: (r) => r._measurement == ${q(measurement)} and r.device_id == ${q(DEVICE_ID)})
        |> last()
    `;

    const [env, act] = await Promise.all([
      queryRows<Row>(latest("environment")),
      queryRows<Row>(latest("actuator_state")),
    ]);

    const suhu = pick(env, "suhu");
    const lembap = pick(env, "kelembapan");
    const times = env.map((r) => new Date(r._time).getTime());
    const updatedMs = times.length > 0 ? Math.max(...times) : null;

    const modeRaw = String(pick(act, "mode")?._value ?? "").toUpperCase();
    const mode = (["AUTO", "MANUAL", "SAFE"].includes(modeRaw) ? modeRaw : null) as Mode | null;

    const body: DashboardData = {
      deviceId: DEVICE_ID,
      reading: suhu && lembap ? { t: Number(suhu._value), h: Number(lembap._value) } : null,
      updatedAt: updatedMs ? new Date(updatedMs).toISOString() : null,
      online: updatedMs !== null && Date.now() - updatedMs < ONLINE_WITHIN_MS,
      mode,
      actuators: {
        kompresor: isOn(pick(act, "kompresor")?._value),
        buzzer: isOn(pick(act, "buzzer")?._value),
        fan: isOn(pick(act, "fan")?._value),
        mist: isOn(pick(act, "mist")?._value),
      },
      hasActuatorState: act.length > 0,
    };
    return NextResponse.json(body);
  } catch (e) {
    console.error("[api/dashboard]", e);
    return NextResponse.json({ error: "Tidak dapat membaca InfluxDB. Pastikan Docker dan InfluxDB menyala." }, { status: 502 });
  }
}
