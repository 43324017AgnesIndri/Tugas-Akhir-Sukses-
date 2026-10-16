"use client";

import { useState } from "react";
import type { ApplyResult, Thresholds } from "@/lib/types";

interface Props {
  thresholds: Thresholds;
  onApply: (v: Thresholds) => Promise<ApplyResult>;
  readOnly?: boolean; // true untuk akun viewer
}

const FIELDS: { key: keyof Thresholds; label: string }[] = [
  { key: "tmin", label: "Suhu bawah (°C)" },
  { key: "tmax", label: "Suhu atas (°C)" },
  { key: "hmin", label: "Kelembapan bawah (%)" },
  { key: "hmax", label: "Kelembapan atas (%)" },
];

const toNum = (s: string) => parseFloat(s.replace(",", "."));

export default function ThresholdForm({ thresholds, onApply, readOnly = false }: Props) {
  const [form, setForm] = useState<Record<keyof Thresholds, string>>({
    tmin: String(thresholds.tmin),
    tmax: String(thresholds.tmax),
    hmin: String(thresholds.hmin),
    hmax: String(thresholds.hmax),
  });
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    const r = await onApply({
      tmin: toNum(form.tmin),
      tmax: toNum(form.tmax),
      hmin: toNum(form.hmin),
      hmax: toNum(form.hmax),
    });
    setResult(r);
    setBusy(false);
  };

  const tone = result ? (result.ok ? "ok" : "bd") : "in";

  return (
    <div className="c">
      <h2>Pengaturan threshold</h2>
      <div className="f">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key}>{f.label}</label>
            <input
              id={f.key}
              type="number"
              step="0.5"
              disabled={readOnly}
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <button type="button" className="apply" disabled={readOnly || busy} onClick={apply}>
        {busy ? "Menyimpan..." : "Terapkan threshold"}
      </button>
      <div className={`note tone-${tone}`}>
        {result ? result.message : "Threshold disimpan di database. Pengiriman ke alat diaktifkan di fase F4."}
      </div>
    </div>
  );
}
