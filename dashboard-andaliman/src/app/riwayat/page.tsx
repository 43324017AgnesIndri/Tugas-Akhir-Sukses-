"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import EnvChart from "@/components/EnvChart";
import RangeTabs from "@/components/RangeTabs";
import { useApi } from "@/hooks/useApi";
import type { HistoryPoint, HistoryRange } from "@/lib/types";
import {
  RANGES,
  downloadCsv,
  fmt,
  toChartPoints,
} from "@/lib/utils";

const OPTIONS: HistoryRange[] = ["24h", "7d", "30d"];
const MAX_ROWS = 300;

const csvNum = (n: number | null) =>
  n === null ? "" : String(n);

const formatPointTime = (iso: string, includeSeconds: boolean) =>
  new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
  });

export default function RiwayatPage() {
  const [range, setRange] = useState<HistoryRange>("24h");

  const hist = useApi<{ points: HistoryPoint[] }>(
    `/api/history?range=${range}${range === "24h" ? "&raw=1" : ""}`
  );

  const points = hist.data?.points ?? [];
  const label =
    RANGES.find((x) => x.key === range)?.label ?? "";

  const newestFirst = [...points].reverse();

  const exportCsv = () => {
    const rows: (string | number | null)[][] = [
      ["Time", "Temperature (°C)", "Humidity (%)"],
    ];

    points.forEach((p) =>
      rows.push([
      formatPointTime(p.time, range === "24h"),
        csvNum(p.suhu),
        csvNum(p.kelembapan),
      ])
    );

    downloadCsv(
      `riwayat-andaliman-${range}.csv`,
      rows
    );
  };

  return (
    <AppShell
      title="Data History"
      subtitle="Temperature and humidity data stored in InfluxDB"
    >
      {hist.error && (
        <div className="note tone-bd page-note">
          {hist.error}
        </div>
      )}

      <div
        className="row between"
        style={{ marginBottom: 12 }}
      >
        <RangeTabs
          value={range}
          onChange={setRange}
          options={OPTIONS}
        />

        <button
          type="button"
          className="btn"
          disabled={points.length === 0}
          onClick={exportCsv}
        >
          Download CSV
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <EnvChart
          data={toChartPoints(points, range)}
          title={`Temperature and humidity (last ${label})`}
        />
      </div>

      <div className="c riwayat-table-card">
        <h2>Data Table ({points.length} points)</h2>

        {/* Desktop: table layout */}
        <div className="tw riwayat-table-desktop">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Temperature (°C)</th>
                <th>Humidity (%)</th>
              </tr>
            </thead>

            <tbody>
              {hist.loading && (
                <tr>
                  <td
                    colSpan={3}
                    className="muted"
                    style={{
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    Loading data...
                  </td>
                </tr>
              )}

              {!hist.loading && points.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="muted"
                    style={{
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    No data yet for this time range.
                  </td>
                </tr>
              )}

              {newestFirst
                .slice(0, MAX_ROWS)
                .map((p) => (
                  <tr key={p.time}>
                    <td>{formatPointTime(p.time, range === "24h")}</td>
                    <td>
                      {p.suhu === null
                        ? "-"
                        : fmt(p.suhu)}
                    </td>
                    <td>
                      {p.kelembapan === null
                        ? "-"
                        : fmt(p.kelembapan)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: vertical layout */}
        <div className="riwayat-table-mobile">
          {hist.loading && (
            <div className="riwayat-empty">
              Loading data...
            </div>
          )}

          {!hist.loading && points.length === 0 && (
            <div className="riwayat-empty">
              No data yet for this time range.
            </div>
          )}

          {!hist.loading &&
            newestFirst
              .slice(0, MAX_ROWS)
              .map((p) => (
                <div
                  className="riwayat-data-item"
                  key={p.time}
                >
                  <div className="riwayat-data-row">
                    <span>Time</span>
                    <strong>
                      {formatPointTime(p.time, range === "24h")}
                    </strong>
                  </div>

                  <div className="riwayat-data-row">
                    <span>Temperature (°C)</span>
                    <strong>
                      {p.suhu === null
                        ? "-"
                        : fmt(p.suhu)}
                    </strong>
                  </div>

                  <div className="riwayat-data-row">
                    <span>Humidity (%)</span>
                    <strong>
                      {p.kelembapan === null
                        ? "-"
                        : fmt(p.kelembapan)}
                    </strong>
                  </div>
                </div>
              ))}
        </div>

        {points.length > MAX_ROWS && (
          <div className="note tone-in">
            The table shows the latest {MAX_ROWS} readings.
            The CSV file contains all {points.length} points.
          </div>
        )}

        <div className="note tone-in">
          {range === "24h"
            ? "The 24-hour range shows every stored reading without averaging. The CSV includes all points; the table shows up to the latest 300 readings."
            : `${label} of data is shown as averages per time window (${range === "7d" ? "3 hours" : "12 hours"}) to summarize the history.`}
        </div>
      </div>
    </AppShell>
  );
}