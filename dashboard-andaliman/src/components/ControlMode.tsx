"use client";

import type { Mode, Severity } from "@/lib/types";
import { MODES } from "@/lib/utils";

const NOTE: Record<Mode, { text: string; tone: Severity }> = {
  AUTO: { text: "Automatic mode is active. The system controls actuators based on thresholds.", tone: "ok" },
  MANUAL: { text: "Manual mode is active. Actuators are controlled from the dashboard.", tone: "in" },
  SAFE: { text: "Safe mode is active. All actuators are off.", tone: "bd" },
};

interface Props {
  mode: Mode | null;
  safeReason: "sensor_gagal" | "dipilih_pengguna" | null;
  onChange: (m: Mode) => void;
  readOnly?: boolean;
}

export default function ControlMode({ mode, safeReason, onChange, readOnly = false }: Props) {
  const note = mode ? NOTE[mode] : { text: "No mode data received from the device yet.", tone: "in" as Severity };
  const safeText =
  mode === "SAFE"
    ? safeReason === "sensor_gagal"
      ? "SAFE mode is active because a sensor failed."
      : safeReason === "dipilih_pengguna"
        ? "SAFE mode was selected by a user."
        : "The reason for SAFE mode is unavailable."
    : null;

  return (
    <div className="c">
      <h2>Control Mode</h2>
      <div className="modes">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`mode ${mode === m.key ? "on" : ""}`}
            disabled={readOnly}
            onClick={() => onChange(m.key)}
          >
            {m.key}
            <small>{m.ket}</small>
          </button>
        ))}
      </div>
      <div className={`note tone-${note.tone}`}>
  {note.text}
  {safeText && <div>{safeText}</div>}
</div>
    </div>
  );
}
