"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "@/lib/types";

const tick = { fontSize: 11, fill: "var(--mu)" };

export default function EnvChart({ data, title = "Data lingkungan (24 jam terakhir)" }: { data: ChartPoint[]; title?: string }) {
  // Tampilkan sekitar 6 label jam di sumbu X, berapa pun jumlah datanya
  const interval = Math.max(0, Math.floor(data.length / 6) - 1);

  return (
    <div className="c">
      <h2>{title}</h2>
      {data.length === 0 ? (
        <div className="lbl" style={{ padding: "60px 0", textAlign: "center" }}>
          Belum ada data pada rentang waktu ini.
        </div>
      ) : (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="var(--ln)" vertical={false} />
              <XAxis dataKey="label" tick={tick} interval={interval} stroke="var(--ln)" />
              <YAxis yAxisId="t" domain={[0, 40]} tick={tick} stroke="var(--ln)" />
              <YAxis yAxisId="h" orientation="right" domain={[0, 100]} tick={tick} stroke="var(--ln)" />
              <Tooltip
                contentStyle={{
                  background: "var(--sf)",
                  border: "1px solid var(--ln)",
                  borderRadius: 8,
                  color: "var(--tx)",
                }}
              />
              <Legend verticalAlign="top" height={28} iconType="plainline" wrapperStyle={{ fontSize: 12, color: "var(--mu)" }} />
              <Line yAxisId="t" type="monotone" dataKey="suhu" name="Suhu (°C)" stroke="var(--ct)" strokeWidth={2} dot={false} />
              <Line yAxisId="h" type="monotone" dataKey="kelembapan" name="Kelembapan (%)" stroke="var(--ch)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
