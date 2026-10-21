import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-server";
import { DEVICE_ID, ONLINE_WITHIN_MS, q, queryRows } from "@/lib/influx";
import { cmdTopic, publishCommand } from "@/lib/mqtt";
import type { WifiHasil, WifiNetwork, WifiScan, WifiStatus } from "@/lib/types";

interface InfluxRow {
  _field: string;
  _value: number | string | boolean;
  _time: string;
}

const pick = (rows: InfluxRow[], field: string) => rows.find((row) => row._field === field);
const text = (rows: InfluxRow[], field: string): string | null => {
  const value = pick(rows, field)?._value;
  return typeof value === "string" && value.length > 0 ? value : null;
};

const queryLatest = (measurement: string) => (bucket: string) => `
  from(bucket: ${q(bucket)})
    |> range(start: -7d)
    |> filter(fn: (r) => r._measurement == ${q(measurement)} and r.device_id == ${q(DEVICE_ID)})
    |> last()
`;

function parseNetworks(value: string | null): WifiNetwork[] {
  if (!value) return [];
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error("Data daftar Wi-Fi dari perangkat tidak valid.");
  return parsed.flatMap((entry): WifiNetwork[] => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("s" in entry) ||
      typeof entry.s !== "string" ||
      !("r" in entry) ||
      typeof entry.r !== "number" ||
      !("x" in entry)
    ) {
      return [];
    }
    return [{ ssid: entry.s, rssi: entry.r, secure: entry.x === 1 || entry.x === true }];
  });
}

export async function GET(request: Request) {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  try {
    const includeScan = new URL(request.url).searchParams.get("scan") === "1";
    const [state, scans] = await Promise.all([
      queryRows<InfluxRow>(queryLatest("wifi_state")),
      includeScan ? queryRows<InfluxRow>(queryLatest("wifi_scan")) : Promise.resolve([]),
    ]);

    const stateTime = pick(state, "connected")?._time;
    const updatedMs = stateTime ? new Date(stateTime).getTime() : null;
    const age = updatedMs === null ? Infinity : Date.now() - updatedMs;
    const connected = Number(pick(state, "connected")?._value) === 1 && age < ONLINE_WITHIN_MS;
    const hasilRaw = text(state, "hasil");
    const hasil: WifiHasil | null =
      hasilRaw === "ok" || hasilRaw === "gagal_wifi" || hasilRaw === "gagal_broker" ? hasilRaw : null;
    const networksRaw = text(scans, "networks");
    const scan: WifiScan | null =
      includeScan && networksRaw
        ? { id: text(scans, "id") ?? "", networks: parseNetworks(networksRaw) }
        : null;

    const body: WifiStatus = {
      connected,
      ssid: text(state, "ssid"),
      rssi: pick(state, "rssi") ? Number(pick(state, "rssi")?._value) : null,
      ip: text(state, "ip"),
      updatedAt: updatedMs !== null && Number.isFinite(updatedMs) ? new Date(updatedMs).toISOString() : null,
      hasil,
      target: text(state, "target"),
      resultId: text(state, "id"),
      scan,
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error("[api/wifi GET]", error);
    return NextResponse.json({ error: "Tidak dapat membaca status Wi-Fi dari InfluxDB." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang boleh mengubah Wi-Fi perangkat." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    ssid?: unknown;
    password?: unknown;
  } | null;
  if (!body || (body.action !== "scan" && body.action !== "connect")) {
    return NextResponse.json({ error: "Permintaan Wi-Fi tidak valid." }, { status: 400 });
  }

  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  let payload: Record<string, string>;
  if (body.action === "scan") {
    payload = { action: "scan", id };
  } else {
    if (typeof body.ssid !== "string" || body.ssid.length < 1 || new TextEncoder().encode(body.ssid).length > 32) {
      return NextResponse.json({ error: "Nama Wi-Fi harus berisi 1 sampai 32 byte." }, { status: 400 });
    }
    if (
      typeof body.password !== "string" ||
      (body.password.length > 0 && (body.password.length < 8 || body.password.length > 63))
    ) {
      return NextResponse.json({ error: "Password Wi-Fi harus kosong untuk jaringan terbuka atau 8 sampai 63 karakter." }, { status: 400 });
    }
    payload = { action: "connect", ssid: body.ssid, password: body.password, id };
  }

  try {
    await publishCommand(cmdTopic("wifi"), payload);
    return NextResponse.json({ id });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Perintah Wi-Fi gagal dikirim ke broker MQTT.";
    console.error("[api/wifi POST] MQTT:", reason);
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}
