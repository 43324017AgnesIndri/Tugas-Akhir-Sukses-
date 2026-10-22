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

// Angka dengan koma desimal untuk CSV (Excel Indonesia)
const csvNum = (n: number | null) =>
  n === null ? "" : String(n).replace(".", ",");

const formatPointTime = (iso: string, includeSeconds: boolean) =>
  new Date(iso).toLocaleString("id-ID", {
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
      ["Waktu", "Suhu (°C)", "Kelembapan (%)"],
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
      title="Riwayat data"
      subtitle="Data suhu dan kelembapan yang tersimpan di InfluxDB"
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
          Unduh CSV
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <EnvChart
          data={toChartPoints(points, range)}
          title={`Suhu dan kelembapan (${label} terakhir)`}
        />
      </div>

      <div className="c riwayat-table-card">
        <h2>Tabel data ({points.length} titik)</h2>

        {/* Desktop: tetap tabel */}
        <div className="tw riwayat-table-desktop">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Suhu (°C)</th>
                <th>Kelembapan (%)</th>
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
                    Memuat data...
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
                    Belum ada data pada rentang waktu ini.
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

        {/* HP: tampil vertikal */}
        <div className="riwayat-table-mobile">
          {hist.loading && (
            <div className="riwayat-empty">
              Memuat data...
            </div>
          )}

          {!hist.loading && points.length === 0 && (
            <div className="riwayat-empty">
              Belum ada data pada rentang waktu ini.
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
                    <span>Waktu</span>
                    <strong>
                      {formatPointTime(p.time, range === "24h")}
                    </strong>
                  </div>

                  <div className="riwayat-data-row">
                    <span>Suhu (°C)</span>
                    <strong>
                      {p.suhu === null
                        ? "-"
                        : fmt(p.suhu)}
                    </strong>
                  </div>

                  <div className="riwayat-data-row">
                    <span>Kelembapan (%)</span>
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
            Tabel menampilkan {MAX_ROWS} data terbaru.
            File CSV memuat seluruh {points.length} titik.
          </div>
        )}

        <div className="note tone-in">
          {range === "24h"
            ? "Rentang 24 jam menampilkan setiap pembacaan yang tersimpan, tanpa dirata-ratakan. CSV memuat semua titik; tabel menampilkan maksimal 300 data terbaru."
            : `Data ${label} ditampilkan sebagai rata-rata per jendela waktu (${range === "7d" ? "3 jam" : "12 jam"}) untuk meringkas riwayat.`}
        </div>
      </div>
    </AppShell>
  );
}