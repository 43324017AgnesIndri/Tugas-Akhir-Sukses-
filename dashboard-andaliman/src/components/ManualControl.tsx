"use client";

import type { ActuatorKey, Actuators } from "@/lib/types";
import { ACTUATORS } from "@/lib/utils";

interface Props {
  actuators: Actuators;
  hasState: boolean;
  enabled: boolean; // true hanya pada mode MANUAL
  onChange: (key: ActuatorKey, on: boolean) => void;
}

export default function ManualControl({ actuators, hasState, enabled, onChange }: Props) {
  return (
    <div className="c">
      <h2>Kontrol manual (aktuator)</h2>
      <div>
        {ACTUATORS.map((a) => (
          <div className="act" key={a.key}>
            <div>
              {a.nama}
              <div className="lbl">{a.ket}</div>
            </div>
            <div className="sw">
              <button type="button" className={hasState && actuators[a.key] ? "on" : ""} disabled={!enabled} onClick={() => onChange(a.key, true)}>
                ON
              </button>
              <button type="button" className={hasState && !actuators[a.key] ? "on" : ""} disabled={!enabled} onClick={() => onChange(a.key, false)}>
                OFF
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="note tone-wn">
        Kontrol manual hanya aktif saat ESP32 melaporkan mode MANUAL dan status relay terbaru.
      </div>
    </div>
  );
}
