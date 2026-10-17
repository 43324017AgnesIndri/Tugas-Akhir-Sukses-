"use client";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import EnvChart from "@/components/EnvChart";
import ActuatorStatus from "@/components/ActuatorStatus";
import RangeTabs from "@/components/RangeTabs";
import { useApi } from "@/hooks/useApi";
import type {
  DashboardData,
  HistoryPoint,
  HistoryRange,
  StatusInfo,
  Thresholds,
} from "@/lib/types";
import {
  DEFAULT_THRESHOLDS,
  RANGES,
  fmt,
  getStatus,
  stats,
  toChartPoints,
} from "@/lib/utils";

const NO_DATA: StatusInfo = {
  label: "Belum ada data",
  severity: "in",
};

const OPTIONS: HistoryRange[] = ["1h", "6h", "24h"];

export default function MonitoringPage() {
  const [range, setRange] = useState<HistoryRange>("6h");

  const dash = useApi<DashboardData>("/api/dashboard", 5000);
  const thr = useApi<{ thresholds: Thresholds }>("/api/threshold");
  const hist = useApi<{ points: HistoryPoint[] }>(
    `/api/history?range=${range}`,
    30000
  );

  const d = dash.data;
  const th = thr.data?.thresholds ?? DEFAULT_THRESHOLDS;
  const r = d?.reading ?? null;

  const st = r
    ? getStatus(r.t, th.tmin, th.tmax)
    : NO_DATA;

  const sh = r
    ? getStatus(r.h, th.hmin, th.hmax)
    : NO_DATA;

  const points = hist.data?.points ?? [];

  const sT = stats(points.map((p) => p.suhu));
  const sH = stats(points.map((p) => p.kelembapan));

  const label =
    RANGES.find((x) => x.key === range)?.label ?? "";

  const show = (n: number | undefined) =>
    n === undefined ? "-" : fmt(n);

  return (
    <AppShell
      title="Monitoring"
      subtitle="Pantauan langsung kondisi ruang penyimpanan"
      statusText={
        d
          ? d.online
            ? "Perangkat online"
            : "Perangkat offline"
          : "Memuat data..."
      }
      online={d?.online}
    >
      {dash.error && (
        <div className="note tone-bd page-note">
          {dash.error}
        </div>
      )}

      <div className="grid g4">
        <StatCard
          label="Suhu sekarang"
          value={r ? `${fmt(r.t)} °C` : "--"}
          badge={st.label}
          severity={st.severity}
          hint={`Batas: ${th.tmin} - ${th.tmax} °C`}
        />

        <StatCard
          label="Kelembapan sekarang"
          value={r ? `${fmt(r.h)} %` : "--"}
          badge={sh.label}
          severity={sh.severity}
          hint={`Batas: ${th.hmin} - ${th.hmax} %`}
        />

        <div className="c">
          <div className="lbl">Pembaruan terakhir</div>

          <div className="big" style={{ fontSize: 22 }}>
            {d?.updatedAt
              ? new Date(d.updatedAt).toLocaleTimeString("id-ID")
              : "--"}
          </div>

          <div className="rng">
            Data diperbarui otomatis tiap 5 detik
          </div>
        </div>

        <div className="c">
          <div className="lbl">Perangkat</div>

          <div className="big" style={{ fontSize: 22 }}>
            {d?.deviceId ?? "--"}
          </div>

          <span
            className={`b tone-${d?.online ? "ok" : "bd"}`}
          >
            {d?.online ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      <div
        className="row between"
        style={{ marginBottom: 12 }}
      >
        <span className="muted">
          Rentang grafik dan statistik:
        </span>

        <RangeTabs
          value={range}
          onChange={setRange}
          options={OPTIONS}
        />
      </div>

      <div className="grid g2">
        <EnvChart
          data={toChartPoints(points, range)}
          title={`Suhu dan kelembapan (${label} terakhir)`}
        />

        <ActuatorStatus
          mode={d?.mode ?? null}
          actuators={
            d?.actuators ?? {
              kompresor: false,
              fan: false,
              mist: false,
            }
          }
          hasState={d?.hasActuatorState ?? false}
        />
      </div>

      <div className="c">
        <h2>Statistik ({label} terakhir)</h2>

        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Terendah</th>
                <th>Rata-rata</th>
                <th>Tertinggi</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Suhu (°C)</td>
                <td>{show(sT?.min)}</td>
                <td>{show(sT?.avg)}</td>
                <td>{show(sT?.max)}</td>
              </tr>

              <tr>
                <td>Kelembapan (%)</td>
                <td>{show(sH?.min)}</td>
                <td>{show(sH?.avg)}</td>
                <td>{show(sH?.max)}</td>
              </tr>
            </tbody>
          </table>
        </div>

     
        <div

        <div
          className="note tone-in"
          style={{
            backgroundColor: "lightblue",
            color: "black",
            border: "2px solid blue",
          }}
        >
          Nilai dihitung dari rata-rata data per jendela waktu pada rentang yang dipilih
        </div>
      </div>

    </AppShell>
  );
}