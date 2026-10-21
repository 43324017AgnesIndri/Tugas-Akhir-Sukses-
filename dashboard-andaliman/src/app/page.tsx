"use client";

import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import EnvChart from "@/components/EnvChart";
import ActuatorStatus from "@/components/ActuatorStatus";
import ControlMode from "@/components/ControlMode";
import ThresholdForm from "@/components/ThresholdForm";
import ManualControl from "@/components/ManualControl";
import AlarmTable from "@/components/AlarmTable";
import { useDevice } from "@/hooks/useDevice";
import { useProfile } from "@/hooks/useProfile";
import type { StatusInfo } from "@/lib/types";
import { fmt, getStatus } from "@/lib/utils";

// Kontrol mode dan aktuator (lewat MQTT) dibuat di tahap berikutnya
const CONTROL_READY = false;

const NO_DATA: StatusInfo = { label: "Belum ada data", severity: "in" };

export default function DashboardPage() {
  const d = useDevice();
  const { profile } = useProfile();

  const isAdmin = profile?.role === "admin";
  const th = d.thresholds;
  const r = d.reading;
  const st = r ? getStatus(r.t, th.tmin, th.tmax) : NO_DATA;
  const sh = r ? getStatus(r.h, th.hmin, th.hmax) : NO_DATA;
  const statusText = d.loading
  ? "Memuat data..."
  : d.error
    ? "Data perangkat tidak tersedia"
    : d.online
      ? "Perangkat online"
      : "Perangkat offline";

  return (
    <AppShell title="Dashboard" subtitle="Ringkasan kondisi perangkat, kontrol, threshold, dan alarm" statusText={statusText} online={d.online}>
      {d.error && (
        <div className="note tone-bd page-note">{d.error}</div>
      )}
      {profile && !isAdmin && (
        <div className="note tone-in page-note">
          Anda login sebagai viewer. Anda dapat melihat data, tetapi tidak dapat mengubah pengaturan.
        </div>
      )}
      {!CONTROL_READY && (
        <div className="note tone-wn page-note">
          Kontrol mode dan aktuator dari dashboard belum aktif (menunggu MQTT). Tampilan mode dan aktuator adalah status terakhir dari perangkat.
        </div>
      )}

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

      <div className="grid g2">
        <EnvChart data={d.history} />
        <ActuatorStatus mode={d.mode} actuators={d.actuators} hasState={d.hasActuatorState} />
      </div>

      <div className="grid g3">
       <ControlMode
  mode={d.mode}
  safeReason={d.safeReason}
  onChange={() => {}}
  readOnly={!CONTROL_READY || !isAdmin}
/>
        <ThresholdForm
          key={d.thresholdsLoaded ? "loaded" : "loading"}
          thresholds={d.thresholds}
          onApply={d.applyThresholds}
          readOnly={!isAdmin}
        />
        <ManualControl actuators={d.actuators} enabled={CONTROL_READY && isAdmin && d.mode === "MANUAL"} onChange={() => {}} />
      </div>

      <AlarmTable rows={d.alarms} />
    </AppShell>
  );
}
