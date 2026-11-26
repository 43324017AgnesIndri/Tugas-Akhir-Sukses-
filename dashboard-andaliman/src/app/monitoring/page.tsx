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
  ACTUATORS_OFF,
  RANGES,
  fmt,
  getStatus,
  stats,
  toChartPoints,
} from "@/lib/utils";

const NO_DATA: StatusInfo = {
  label: "No data yet",
  severity: "in",
};

const OPTIONS: HistoryRange[] = ["1h", "6h", "24h", "7d", "30d"];

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
      subtitle="Sensor data and room condition trends over time"
      statusText={
        d
          ? d.online
            ? "Device online"
            : "Device offline"
          : "Loading data..."
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
          label="Current Temperature"
          value={r ? `${fmt(r.t)} °C` : "--"}
          badge={st.label}
          severity={st.severity}
          hint={`Limit: ${th.tmin} - ${th.tmax} °C`}
        />

        <StatCard
          label="Current Humidity"
          value={r ? `${fmt(r.h)} %` : "--"}
          badge={sh.label}
          severity={sh.severity}
          hint={`Limit: ${th.hmin} - ${th.hmax} %`}
        />

        <div className="c">
          <div className="lbl">Last updated</div>

          <div className="big" style={{ fontSize: 22 }}>
            {d?.updatedAt
              ? new Date(d.updatedAt).toLocaleTimeString("en-US")
              : "--"}
          </div>

          <div className="rng">
            Data updates automatically every 5 seconds
          </div>
        </div>

        <div className="c">
          <div className="lbl">Device</div>

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
          Chart and statistics range:
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
          title={`Temperature and humidity (last ${label})`}
        />

        <ActuatorStatus
          mode={d?.mode ?? null}
          actuators={d?.actuators ?? ACTUATORS_OFF}
          hasState={d?.hasActuatorState ?? false}
        />
      </div>

      <div className="c monitoring-statistics">
  <h2>Statistics (last {label})</h2>

  {/* Desktop */}
  <div className="tw monitoring-statistics-desktop">
    <table>
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Lowest</th>
          <th>Average</th>
          <th>Highest</th>
        </tr>
      </thead>

      <tbody>
        <tr>
          <td>Temperature (°C)</td>
          <td>{show(sT?.min)}</td>
          <td>{show(sT?.avg)}</td>
          <td>{show(sT?.max)}</td>
        </tr>

        <tr>
          <td>Humidity (%)</td>
          <td>{show(sH?.min)}</td>
          <td>{show(sH?.avg)}</td>
          <td>{show(sH?.max)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  {/* Mobile */}
  <div className="monitoring-statistics-mobile">
    <div className="monitoring-stat-item">
      <strong>Temperature (°C)</strong>

      <div className="monitoring-stat-row">
        <span>Lowest</span>
        <span>{show(sT?.min)}</span>
      </div>

      <div className="monitoring-stat-row">
        <span>Average</span>
        <span>{show(sT?.avg)}</span>
      </div>

      <div className="monitoring-stat-row">
        <span>Highest</span>
        <span>{show(sT?.max)}</span>
      </div>
    </div>

    <div className="monitoring-stat-item">
      <strong>Humidity (%)</strong>

      <div className="monitoring-stat-row">
        <span>Lowest</span>
        <span>{show(sH?.min)}</span>
      </div>

      <div className="monitoring-stat-row">
        <span>Average</span>
        <span>{show(sH?.avg)}</span>
      </div>

      <div className="monitoring-stat-row">
        <span>Highest</span>
        <span>{show(sH?.max)}</span>
      </div>
    </div>
  </div>

  <div className="note tone-in monitoring-stat-note">
    Values are calculated from the average readings in each time window for the selected range.
  </div>
</div>

    </AppShell>
  );
}