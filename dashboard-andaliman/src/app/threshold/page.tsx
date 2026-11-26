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
    <AppShell title="Threshold Settings" subtitle="Temperature and humidity limits for the storage room">
      {thr.error && <div className="note tone-bd page-note">{thr.error}</div>}
      {profile && !isAdmin && (
        <div className="note tone-in page-note">Viewer accounts can only view thresholds. Only admins can make changes.</div>
      )}

      <div className="grid g2e">
        <ThresholdForm key={thr.data ? "loaded" : "loading"} thresholds={th} onApply={onApply} readOnly={!isAdmin} />

        <div className="c threshold-current">
  <h2>Current Values</h2>
  
  <div className="tw threshold-current-table">
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Lower limit</th>
                  <th>Upper limit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Temperature (°C)</td>
                  <td>{th.tmin}</td>
                  <td>{th.tmax}</td>
                </tr>
                <tr>
                  <td>Humidity (%)</td>
                  <td>{th.hmin}</td>
                  <td>{th.hmax}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="note tone-in">
            Last updated: {thr.data?.updatedAt ? formatDateTime(thr.data.updatedAt) : "-"}
          </div>
          <div className="note tone-in">
            Thresholds are saved to the database and sent directly to the ESP32 via MQTT, so there is no need to re-upload the program. An ESP32 that is offline receives the latest values when it reconnects.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
