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
  const ctl = useControl(
    d?.mode ?? null,
    d?.actuators ?? ACTUATORS_OFF,
    d?.online ?? false
  );

  return (
    <AppShell
      title="Control"
      subtitle="Operating mode and actuator controls"
      statusText={
        d
          ? d.online
            ? "Device online"
            : "Device offline"
          : "Loading data..."
      }
      online={d?.online}
    >
      {dash.error && (
        <div className="note tone-bd page-note">
          {dash.error}
        </div>
      )}

      {ctl.notice && (
        <div
          className={`note tone-${ctl.notice.ok ? "ok" : "bd"} page-note`}
        >
          {ctl.notice.text}
        </div>
      )}

      {profile && !isAdmin && (
        <div className="note tone-in page-note">
          Viewer accounts cannot change the mode or actuators.
        </div>
      )}

      <div className="grid g3">
        <ControlMode
          mode={ctl.mode}
          safeReason={d?.safeReason ?? null}
          onChange={ctl.setMode}
          readOnly={!isAdmin || ctl.busy || d?.online !== true || !d.hasActuatorState}
        />

        <ManualControl
          actuators={ctl.actuators}
          hasState={d?.hasActuatorState ?? false}
          enabled={isAdmin && !ctl.busy && d?.online === true && d.hasActuatorState && d.mode === "MANUAL"}
          onChange={ctl.setActuator}
        />

        <ActuatorStatus
          mode={d?.mode ?? null}
          actuators={d?.actuators ?? ACTUATORS_OFF}
          hasState={d?.hasActuatorState ?? false}
          title="Actuator Status"
        />
      </div>

      <div className="c mode-explanation">
        <h2>Mode Descriptions</h2>

        <div className="tw">
          <table className="mode-explanation-table">
            <thead>
              <tr>
                <th>Mode</th>
                <th>How it works</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>AUTO</td>
                <td>
                  The ESP32 controls the compressor, fan, and mist maker based on
                  the temperature and humidity thresholds. The buzzer sounds if
                  either reading remains outside its threshold.
                </td>
              </tr>

              <tr>
                <td>MANUAL</td>
                <td>
                  Admins can turn each actuator on or off directly from the
                  dashboard.
                </td>
              </tr>

              <tr>
                <td>SAFE</td>
                <td>
                  Safe mode: all actuators are turned off. If a sensor reading
                  fails, the ESP32 enters this mode and the buzzer sounds.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}