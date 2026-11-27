"use client";

import { Area, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartLine } from "lucide-react";
import type { ChartPoint } from "@/lib/types";

const tick = { fontSize: 12.5, fill: "#6B7F72" };

export default function EnvChart({
  data,
  title = "Environmental Data (Last 24 Hours)",
}: {
  data: ChartPoint[];
  title?: string;
}) {
  const interval = Math.max(0, Math.floor(data.length / 6) - 1);

  return (
    <div className="c chart-card">
      <header className="chart-card-header">
        <h2>{title}</h2>
        <div className="chart-legend" aria-label="Chart legend">
          <span><i className="chart-legend-dot is-temperature" aria-hidden="true" />Temperature</span>
          <span><i className="chart-legend-dot is-humidity" aria-hidden="true" />Humidity</span>
        </div>
      </header>
      {data.length === 0 ? (
        <div className="chart-empty-state">
          <span className="chart-empty-icon" aria-hidden="true">
            <ChartLine size={40} strokeWidth={1.6} />
          </span>
          <p>No data yet for this time range.</p>
        </div>
      ) : (
        <div className="env-chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="temperature-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D99A2B" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#D99A2B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="humidity-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F8FA8" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2F8FA8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E6ECE4" vertical={false} />
              <XAxis dataKey="label" tick={tick} interval={interval} stroke="#DDE5DC" />
              <YAxis yAxisId="t" domain={[0, 40]} tick={tick} stroke="#DDE5DC" />
              <YAxis yAxisId="h" orientation="right" domain={[0, 100]} tick={tick} stroke="#DDE5DC" />
              <Tooltip
                cursor={{ stroke: "#AAB9AB", strokeDasharray: "4 4" }}
                content={({ active, payload, label }) => {
                  const series = payload?.filter(
                    (point) => point.name === "Temperature" || point.name === "Humidity"
                  );
                  if (!active || !series?.length) return null;
                  return (
                    <div className="chart-tooltip">
                      <p>{String(label ?? "")}</p>
                      {series.map((point, index) => {
                        const isTemperature = point.dataKey === "suhu";
                        return (
                          <div className="chart-tooltip-row" key={`${String(point.dataKey)}-${index}`}>
                            <i className={`chart-tooltip-dot ${isTemperature ? "is-temperature" : "is-humidity"}`} aria-hidden="true" />
                            <span>{String(point.name ?? point.dataKey)}</span>
                            <strong>{point.value == null ? "—" : `${point.value}${isTemperature ? " °C" : " %"}`}</strong>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />
              <Area
                yAxisId="t"
                type="monotone"
                dataKey="suhu"
                stroke="none"
                fill="url(#temperature-area)"
              />
              <Area
                yAxisId="h"
                type="monotone"
                dataKey="kelembapan"
                stroke="none"
                fill="url(#humidity-area)"
              />
              <Line
                yAxisId="t"
                type="monotone"
                dataKey="suhu"
                name="Temperature"
                stroke="#D99A2B"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#FFFDF8", stroke: "#D99A2B", strokeWidth: 2 }}
              />
              <Line
                yAxisId="h"
                type="monotone"
                dataKey="kelembapan"
                name="Humidity"
                stroke="#2F8FA8"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#FFFDF8", stroke: "#2F8FA8", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
