import type { Actuators, Mode } from "@/lib/types";
import { ACTUATORS } from "@/lib/utils";

interface Props {
  mode: Mode | null;
  actuators: Actuators;
  hasState: boolean; // false jika perangkat belum mengirim status
  title?: string;
}

export default function ActuatorStatus({ mode, actuators, hasState, title = "Kondisi ruang saat ini" }: Props) {
  return (
    <div className="c">
      <h2>{title}</h2>
      <div className="lbl actuator-source">Status relay berdasarkan laporan ESP32</div>
      <div className="act">
        <span>Mode kontrol</span>
        <span className="b tone-in" style={{ margin: 0 }}>
          {mode ?? "-"}
        </span>
      </div>
      {ACTUATORS.map((a) => (
        <div className="act" key={a.key}>
          <span>{a.nama}</span>
          <span className="st">
            <span className="st-lights" aria-hidden="true">
              <i className={`st-light st-light-off ${hasState && !actuators[a.key] ? "active" : ""}`} />
              <i className={`st-light st-light-on ${hasState && actuators[a.key] ? "active" : ""}`} />
            </span>
            {hasState ? (actuators[a.key] ? "Menyala" : "Mati") : "Belum ada laporan"}
          </span>
        </div>
      ))}
      <div className="actuator-legend">
        <span><i className="st-light st-light-off active" aria-hidden="true" /> Mati</span>
        <span><i className="st-light st-light-on active" aria-hidden="true" /> Menyala</span>
      </div>
    </div>
  );
}
