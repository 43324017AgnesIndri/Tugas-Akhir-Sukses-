"use client";

import AppShell from "@/components/AppShell";
import ActuatorStatus from "@/components/ActuatorStatus";
import ControlMode from "@/components/ControlMode";
import ManualControl from "@/components/ManualControl";
import { useApi } from "@/hooks/useApi";
import { useControl } from "@/hooks/useControl";
import { useProfile } from "@/hooks/useProfile";
import type { DashboardData } from "@/lib/types";
import { ACTUATORS_OFF } from "@/lib/utils";

export default function KontrolPage() {
  const dash = useApi<DashboardData>("/api/dashboard", 5000);
  const { profile } = useProfile();
  const isAdmin = profile?.role === "admin";
  const d = dash.data;
  const ctl = useControl(d?.mode ?? null, d?.actuators ?? ACTUATORS_OFF, d?.online ?? false);

  return (
    <AppShell
      title="Kontrol"
      subtitle="Mode kerja dan kontrol aktuator"
      statusText={d ? (d.online ? "Perangkat online" : "Perangkat offline") : "Memuat data..."}
      online={d?.online}
    >
      {dash.error && <div className="note tone-bd page-note">{dash.error}</div>}
      {ctl.notice && <div className={`note tone-${ctl.notice.ok ? "ok" : "bd"} page-note`}>{ctl.notice.text}</div>}
      {profile && !isAdmin && (
        <div className="note tone-in page-note">Akun viewer tidak dapat mengubah mode atau aktuator.</div>
      )}

      <div className="grid g3">
        <ControlMode mode={ctl.mode} onChange={ctl.setMode} readOnly={!isAdmin || ctl.busy} />
        <ManualControl
          actuators={ctl.actuators}
          enabled={isAdmin && !ctl.busy && ctl.mode === "MANUAL"}
          onChange={ctl.setActuator}
        />
        <ActuatorStatus mode={ctl.mode} actuators={ctl.actuators} hasState={d?.hasActuatorState ?? false} title="Status aktuator" />
      </div>

      <div className="c">
        <h2>Penjelasan mode</h2>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Mode</th>
                <th>Cara kerja</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AUTO</td>
                <td>ESP32 mengendalikan kompresor, fan, dan mist maker sesuai threshold suhu dan kelembapan. Buzzer berbunyi jika suhu atau kelembapan bertahan di luar threshold.</td>
              </tr>
              <tr>
                <td>MANUAL</td>
                <td>Admin menyalakan atau mematikan setiap aktuator langsung dari dashboard.</td>
              </tr>
              <tr>
                <td>SAFE</td>
                <td>Mode aman: semua aktuator dimatikan. Jika sensor gagal dibaca, ESP32 masuk mode ini sendiri dan buzzer berbunyi.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
