"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import EnvChart from "@/components/EnvChart";
import ActuatorStatus from "@/components/ActuatorStatus";
import ThresholdForm from "@/components/ThresholdForm";
import AlarmTable from "@/components/AlarmTable";
import { useDevice } from "@/hooks/useDevice";
import { useProfile } from "@/hooks/useProfile";
import { useApi } from "@/hooks/useApi";
import RangeTabs from "@/components/RangeTabs";
import type { HistoryRange, StatusInfo } from "@/lib/types";
import { fmt, getStatus, RANGES } from "@/lib/utils";

const NO_DATA: StatusInfo = { label: "Belum ada data", severity: "in" };
const CHART_RANGES: HistoryRange[] = ["1h", "6h", "24h"];

export default function DashboardPage() {
  const [chartRange, setChartRange] = useState<HistoryRange>("6h");
  const d = useDevice(chartRange);
  const { profile } = useProfile();
  const mqtt = useApi<{ connected: boolean; error: string | null }>("/api/mqtt/status", 5000);
  const [showMqttConnected, setShowMqttConnected] = useState(false);

  useEffect(() => {
    if (mqtt.data?.connected !== true) return;

    const showTimer = setTimeout(() => setShowMqttConnected(true), 0);
    const timeout = setTimeout(() => setShowMqttConnected(false), 3000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(timeout);
    };
  }, [mqtt.data?.connected]);

  const isAdmin = profile?.role === "admin";
  const th = d.thresholds;
  const r = d.reading;
  const st = r ? getStatus(r.t, th.tmin, th.tmax) : NO_DATA;
  const sh = r ? getStatus(r.h, th.hmin, th.hmax) : NO_DATA;
  const chartRangeLabel = RANGES.find((range) => range.key === chartRange)?.label ?? "";
  const statusText = d.loading
    ? "Memuat data..."
    : d.error
      ? "Data perangkat tidak tersedia"
      : d.online
        ? "Perangkat online"
        : "Perangkat offline";

  return (
    <AppShell title="Dashboard" subtitle="Ringkasan kondisi perangkat, threshold, dan alarm" statusText={statusText} online={d.online}>
      {d.error && (
        <div className="note tone-bd page-note">
          Data perangkat sedang tidak dapat diakses. Silakan coba lagi beberapa saat.
        </div>
      )}
      {profile && !isAdmin && (
        <div className="note tone-in page-note">
          Anda login sebagai viewer. Anda dapat melihat data, tetapi tidak dapat mengubah pengaturan.
        </div>
      )}
      {mqtt.error ? (
        <div className="note tone-bd page-note">
          Status koneksi MQTT tidak dapat diperiksa: {mqtt.error}
        </div>
      ) : mqtt.loading && !mqtt.data ? (
        <div className="note tone-wn page-note">Memeriksa koneksi ke broker MQTT...</div>
      ) : mqtt.data?.connected ? (
        showMqttConnected && (
          <div className="note tone-ok page-note">Broker MQTT terhubung.</div>
        )
      ) : mqtt.data?.error === "Sedang menghubungkan ke broker MQTT." ? (
        <div className="note tone-wn page-note">{mqtt.data.error}</div>
      ) : (
        <div className="note tone-bd page-note">
          {mqtt.data?.error ?? "Broker MQTT belum terhubung."}
        </div>
      )}

      {/* Baris 1: tiga kartu ringkasan, lebar sama */}
      <div className="grid g3">
        <StatCard
          label="Suhu"
          value={r ? `${fmt(r.t)} °C` : "--"}
          badge={st.label}
          severity={st.severity}
          hint={`Batas: ${th.tmin} - ${th.tmax} °C`}
        />
        <StatCard
          label="Kelembapan"
          value={r ? `${fmt(r.h)} %` : "--"}
          badge={sh.label}
          severity={sh.severity}
          hint={`Batas: ${th.hmin} - ${th.hmax} %`}
        />
        <StatCard
          label="Status perangkat"
          value={d.error ? "Tidak tersedia" : d.online ? "Online" : "Offline"}
          badge={d.error ? "Gagal membaca data" : d.online ? "Terhubung" : "Tidak ada data baru"}
          severity={d.error ? "bd" : d.online ? "ok" : "bd"}
          hint={
            d.error
              ? "Status perangkat tidak dapat ditentukan"
              : d.updatedAt
                ? `Data terakhir: ${new Date(d.updatedAt).toLocaleTimeString("id-ID")}`
                : `ESP32 ${d.deviceId}`
          }
        />
      </div>

      {/* Baris 2: grafik (lebar) + kondisi ruang (sempit) */}
      <div className="grid g2">
        <div>
          <div className="row between" style={{ marginBottom: 12 }}>
            <span className="muted">Rentang grafik:</span>
            <RangeTabs value={chartRange} onChange={setChartRange} options={CHART_RANGES} />
          </div>
          <EnvChart data={d.history} title={`Suhu dan kelembapan (${chartRangeLabel} terakhir)`} />
        </div>
        <ActuatorStatus mode={d.mode} actuators={d.actuators} hasState={d.hasActuatorState} />
      </div>

      {/* Baris 3: alarm (lebar) + threshold (sempit), kolomnya sejajar dengan baris 2 */}
      <div className="grid g2">
        <AlarmTable rows={d.alarms} />
        <ThresholdForm
          key={d.thresholdsLoaded ? "loaded" : "loading"}
          thresholds={d.thresholds}
          onApply={d.applyThresholds}
          readOnly={!isAdmin}
        />
      </div>
    </AppShell>
  );
}