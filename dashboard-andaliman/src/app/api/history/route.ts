import { NextResponse } from "next/server";
import { getServerAuth } from "@/lib/auth-server";
import { DEVICE_ID, q, queryRows } from "@/lib/influx";
import type { HistoryPoint } from "@/lib/types";

interface Row {
  _time: string;
  suhu?: number;
  kelembapan?: number;
}

// Rentang yang diizinkan, beserta lebar jendela rata-ratanya.
const RANGES: Record<string, { start: string; every: string }> = {
  "1h": { start: "-1h", every: "1m" },
  "6h": { start: "-6h", every: "5m" },
  "24h": { start: "-24h", every: "30m" },
  "7d": { start: "-7d", every: "3h" },
  "30d": { start: "-30d", every: "12h" },
};

const r1 = (n: number | undefined): number | null => (typeof n === "number" ? Math.round(n * 10) / 10 : null);

export async function GET(request: Request) {
  const auth = await getServerAuth();
  if (!auth) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const key = new URL(request.url).searchParams.get("range") ?? "24h";
  const cfg = RANGES[key];
  if (!cfg) return NextResponse.json({ error: "Rentang tidak dikenal." }, { status: 400 });
  const raw = new URL(request.url).searchParams.get("raw") === "1";
  if (raw && key !== "1h" && key !== "24h") {
    return NextResponse.json({ error: "Data mentah hanya tersedia untuk rentang 1 jam dan 24 jam." }, { status: 400 });
  }

  try {
    const rows = await queryRows<Row>(
      (bucket) => `
        from(bucket: ${q(bucket)})
          |> range(start: ${cfg.start})
          |> filter(fn: (r) => r._measurement == "environment" and r.device_id == ${q(DEVICE_ID)})
          |> filter(fn: (r) => r._field == "suhu" or r._field == "kelembapan")
          ${raw ? "" : `|> aggregateWindow(every: ${cfg.every}, fn: mean, createEmpty: false)`}
          |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      `
    );
    const points: HistoryPoint[] = rows.map((r) => ({ time: r._time, suhu: r1(r.suhu), kelembapan: r1(r.kelembapan) }));
    return NextResponse.json({ points });
  } catch (e) {
    console.error("[api/history]", e);
    return NextResponse.json({ error: "Tidak dapat membaca riwayat dari InfluxDB." }, { status: 502 });
  }
}
