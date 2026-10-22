"use client";

import AppShell from "@/components/AppShell";
import ThresholdForm from "@/components/ThresholdForm";
import { useApi } from "@/hooks/useApi";
import { useProfile } from "@/hooks/useProfile";
import { saveThresholds } from "@/lib/client";
import type { ApplyResult, Thresholds } from "@/lib/types";
import { DEFAULT_THRESHOLDS, formatDateTime } from "@/lib/utils";

export default function ThresholdPage() {
  const thr = useApi<{ thresholds: Thresholds; updatedAt: string | null }>("/api/threshold");
  const { profile } = useProfile();
  const isAdmin = profile?.role === "admin";
  const th = thr.data?.thresholds ?? DEFAULT_THRESHOLDS;

  const onApply = async (v: Thresholds): Promise<ApplyResult> => {
    const result = await saveThresholds(v);
    if (result.ok) thr.reload();
    return result;
  };

  return (
    <AppShell title="Pengaturan threshold" subtitle="Batas suhu dan kelembapan ruang penyimpanan">
      {thr.error && <div className="note tone-bd page-note">{thr.error}</div>}
      {profile && !isAdmin && (
        <div className="note tone-in page-note">Akun viewer hanya dapat melihat threshold. Perubahan hanya untuk admin.</div>
      )}

      <div className="grid g2e">
        <ThresholdForm key={thr.data ? "loaded" : "loading"} thresholds={th} onApply={onApply} readOnly={!isAdmin} />

        <div className="c threshold-current">
  <h2>Nilai yang berlaku</h2>
  
  <div className="tw threshold-current-table">
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Batas bawah</th>
                  <th>Batas atas</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Suhu (°C)</td>
                  <td>{th.tmin}</td>
                  <td>{th.tmax}</td>
                </tr>
                <tr>
                  <td>Kelembapan (%)</td>
                  <td>{th.hmin}</td>
                  <td>{th.hmax}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="note tone-in">
            Terakhir diubah: {thr.data?.updatedAt ? formatDateTime(thr.data.updatedAt) : "-"}
          </div>
          <div className="note tone-in">
            Threshold disimpan di database dan langsung dikirim ke ESP32 lewat MQTT, jadi tidak perlu upload ulang program. ESP32 yang sedang mati menerima nilai terbaru saat menyala kembali.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
