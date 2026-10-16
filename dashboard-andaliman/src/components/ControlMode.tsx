"use client";

import type { Mode, Severity } from "@/lib/types";
import { MODES } from "@/lib/utils";

const NOTE: Record<Mode, { text: string; tone: Severity }> = {
  AUTO: { text: "Mode otomatis aktif. Sistem mengendalikan aktuator sesuai threshold.", tone: "ok" },
  MANUAL: { text: "Mode manual aktif. Aktuator dikendalikan dari dashboard.", tone: "in" },
  SAFE: { text: "Mode aman aktif. Semua aktuator dimatikan.", tone: "bd" },
};

interface Props {
  mode: Mode | null; // null jika perangkat belum mengirim status
  onChange: (m: Mode) => void;
  readOnly?: boolean;
}

export default function ControlMode({ mode, onChange, readOnly = false }: Props) {
  const note = mode ? NOTE[mode] : { text: "Belum ada data mode dari perangkat.", tone: "in" as Severity };

  return (
    <div className="c">
      <h2>Mode kontrol</h2>
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
      <div className={`note tone-${note.tone}`}>{note.text}</div>
    </div>
  );
}
