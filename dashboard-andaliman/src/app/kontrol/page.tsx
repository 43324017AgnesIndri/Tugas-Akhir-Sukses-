"use client";

import AppShell from "@/components/AppShell";
import ActuatorStatus from "@/components/ActuatorStatus";
import ControlMode from "@/components/ControlMode";
import ManualControl from "@/components/ManualControl";
import { useApi } from "@/hooks/useApi";
import { useProfile } from "@/hooks/useProfile";
import type { DashboardData } from "@/lib/types";

// Diubah menjadi true setelah pengiriman perintah lewat MQTT selesai dibuat
const CONTROL_READY = false;

export default function KontrolPage() {
  const dash = useApi<DashboardData>("/api/dashboard", 5000);
  const { profile } = useProfile();
  const isAdmin = profile?.role === "admin";
  const d = dash.data;
  const actuators = d?.actuators ?? { kompresor: false, fan: false, mist: false };

  return (
    <AppShell
      title="Kontrol"
      subtitle="Mode kerja dan kontrol aktuator"
      statusText={d ? (d.online ? "Perangkat online" : "Perangkat offline") : "Memuat data..."}
      online={d?.online}
    >
      {dash.error && <div className="note tone-bd page-note">{dash.error}</div>}
      {!CONTROL_READY && (
        <div className="note tone-wn page-note">
          Tombol di halaman ini belum aktif karena pengiriman perintah ke ESP32 lewat MQTT belum dibuat. Yang tampil adalah status terakhir dari perangkat.
        </div>
      )}
      {profile && !isAdmin && (
        <div className="note tone-in page-note">Akun viewer tidak dapat mengubah mode atau aktuator.</div>
      )}

      <div className="grid g3">
        <ControlMode mode={d?.mode ?? null} onChange={() => {}} readOnly={!CONTROL_READY || !isAdmin} />
        <ManualControl actuators={actuators} enabled={CONTROL_READY && isAdmin && d?.mode === "MANUAL"} onChange={() => {}} />
        <ActuatorStatus mode={d?.mode ?? null} actuators={actuators} hasState={d?.hasActuatorState ?? false} title="Status aktuator" />
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
                <td>ESP32 mengendalikan kompresor, fan, dan mist maker sesuai threshold suhu dan kelembapan.</td>
              </tr>
              <tr>
                <td>MANUAL</td>
                <td>Admin menyalakan atau mematikan setiap aktuator langsung dari dashboard.</td>
              </tr>
              <tr>
                <td>SAFE</td>
                <td>Mode aman: aktuator dimatikan saat kondisi abnormal (misalnya sensor gagal dibaca).</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
