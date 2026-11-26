import { Droplets, Fan, Gauge, House, Snowflake, Volume2 } from "lucide-react";
import type { ActuatorKey, Actuators, Mode } from "@/lib/types";
import { ACTUATORS } from "@/lib/utils";

interface Props {
  mode: Mode | null;
  actuators: Actuators;
  hasState: boolean;
  title?: string;
}

const ACTUATOR_ICONS: Record<ActuatorKey, typeof Snowflake> = {
  kompresor: Snowflake,
  buzzer: Volume2,
  fan: Fan,
  mist: Droplets,
};

function ActuatorIcon({ actuator }: { actuator: ActuatorKey }) {
  const Icon = ACTUATOR_ICONS[actuator];
  return <Icon size={20} strokeWidth={1.8} aria-hidden="true" />;
}

function getModeStatus(mode: Mode | null) {
  return mode ? `mode-${mode.toLowerCase()}` : "is-unknown";
}

export default function ActuatorStatus({
  mode,
  actuators,
  hasState,
  title = "Actuator Status",
}: Props) {
  const modeLabel = mode ?? "No report yet";

  return (
    <div className="c room-card">
      <header className="room-card-header">
        <span className="room-header-icon" aria-hidden="true">
          <House size={21} strokeWidth={1.8} />
        </span>
        <div className="room-header-copy">
          <h2>{title}</h2>
          <p>Relay status reported by the ESP32</p>
        </div>
        {hasState && (
          <span className="room-live-badge" aria-label="ESP32 is reporting live status">
            <i aria-hidden="true" />
            Live
          </span>
        )}
      </header>

      <div className="room-rows">
        <div className="room-row">
          <div className="room-row-name">
            <span className="room-row-icon" aria-hidden="true">
              <Gauge size={20} strokeWidth={1.8} />
            </span>
            <span>Control Mode</span>
          </div>
          <span
            className={`room-status is-mode ${getModeStatus(mode)}`}
            aria-live="polite"
          >
            {modeLabel}
          </span>
        </div>

        {ACTUATORS.map((actuator) => {
          const isOn = hasState && actuators[actuator.key];
          const status = !hasState ? "unknown" : isOn ? "on" : "off";
          const label = !hasState ? "No report yet" : isOn ? "On" : "Off";

          return (
            <div className="room-row" key={actuator.key}>
              <div className="room-row-name">
                <span className="room-row-icon" aria-hidden="true">
                  <ActuatorIcon actuator={actuator.key} />
                </span>
                <span>{actuator.nama}</span>
              </div>
              <span
                className={`room-status is-${status}`}
                aria-label={`${actuator.nama}: ${label}`}
                aria-live="polite"
              >
                <i className={`room-status-light is-${status}`} aria-hidden="true" />
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <footer className="room-status-guide">
        <h3>Status guide</h3>
        <div className="room-guide-items">
          <span><i className="room-guide-dot is-on" aria-hidden="true" />Green: On / running</span>
          <span><i className="room-guide-dot is-off" aria-hidden="true" />Red: Off / stopped</span>
          <span><i className="room-guide-dot is-unknown" aria-hidden="true" />Gray: No report from device</span>
        </div>
      </footer>
    </div>
  );
}
