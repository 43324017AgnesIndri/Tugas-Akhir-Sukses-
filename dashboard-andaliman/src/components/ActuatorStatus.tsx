aku agnes
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
            <i className={hasState && actuators[a.key] ? "on" : ""} />
            {hasState ? (actuators[a.key] ? "Menyala" : "Mati") : "-"}
          </span>
        </div>
      ))}
    </div>
  );
}
