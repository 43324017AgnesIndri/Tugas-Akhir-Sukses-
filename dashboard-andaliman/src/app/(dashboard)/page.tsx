  "use client";

  import { useEffect, useState } from "react";
  import { Activity, CircleCheck, Info, Thermometer, Droplets, Cpu, Triangle, X } from "lucide-react";
  import AppShell from "@/components/AppShell";
  import StatCard from "@/components/StatCard";
  import EnvChart from "@/components/EnvChart";
  import ActuatorStatus from "@/components/ActuatorStatus";
  import ThresholdForm from "@/components/ThresholdForm";
  import AlarmTable from "@/components/AlarmTable";
  import { useDevice } from "@/hooks/useDevice";
  import { useProfile } from "@/hooks/useProfile";
  import { useApi } from "@/hooks/useApi";
  import RangeTabs from "@/components/RangeTabs";
  import type { HistoryRange, StatusInfo } from "@/lib/types";
  import { fmt, getStatus, RANGES } from "@/lib/utils";

  const NO_DATA: StatusInfo = { label: "No data yet", severity: "in" };
  const CHART_RANGES: HistoryRange[] = ["1h", "6h", "24h", "7d", "30d"];

  type SystemAlert = {
    key: string;
    message: string;
    kind: "error" | "info" | "success";
  };

  export default function DashboardPage() {
    const [chartRange, setChartRange] = useState<HistoryRange>("6h");
    const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
    const d = useDevice(chartRange);
    const { profile } = useProfile();
    const mqtt = useApi<{ connected: boolean; error: string | null }>("/api/mqtt/status", 5000);
    const [showMqttConnected, setShowMqttConnected] = useState(false);

    useEffect(() => {
      if (mqtt.data?.connected !== true) return;

      const showTimer = setTimeout(() => setShowMqttConnected(true), 0);
      const timeout = setTimeout(() => setShowMqttConnected(false), 3000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(timeout);
      };
    }, [mqtt.data?.connected]);

    const isAdmin = profile?.role === "admin";
    const th = d.thresholds;
    const r = d.reading;
    const st = r ? getStatus(r.t, th.tmin, th.tmax) : NO_DATA;
    const sh = r ? getStatus(r.h, th.hmin, th.hmax) : NO_DATA;
    const chartRangeLabel = RANGES.find((range) => range.key === chartRange)?.label ?? "";
    const statusText = d.loading
      ? "Loading data..."
      : d.error
        ? "Device data unavailable"
        : d.online
          ? "Device online"
          : "Device offline";
    const systemAlerts: SystemAlert[] = [];

    if (d.error) {
      systemAlerts.push({
        key: "device-data",
        message: "Device data is temporarily unavailable. Please try again shortly.",
        kind: "error",
      });
    }
    if (profile && !isAdmin) {
      systemAlerts.push({
        key: "viewer-access",
        message: "You are signed in as a viewer. You can view data but cannot change settings.",
        kind: "info",
      });
    }
    if (mqtt.error) {
      systemAlerts.push({
        key: `mqtt-api:${mqtt.error}`,
        message: `Unable to check the MQTT connection: ${mqtt.error}`,
        kind: "error",
      });
    } else if (mqtt.loading && !mqtt.data) {
      systemAlerts.push({
        key: "mqtt-checking",
        message: "Checking the MQTT broker connection...",
        kind: "info",
      });
    } else if (mqtt.data?.connected) {
      if (showMqttConnected) {
        systemAlerts.push({
          key: "mqtt-connected",
          message: "Connected to the MQTT broker.",
          kind: "success",
        });
      }
    } else if (mqtt.data?.error === "Connecting to the MQTT broker...") {
      systemAlerts.push({
        key: "mqtt-connecting",
        message: mqtt.data.error,
        kind: "info",
      });
    } else {
      const message = mqtt.data?.error ?? "The MQTT broker is not connected yet.";
      systemAlerts.push({
        key: `mqtt-status:${message}`,
        message,
        kind: "error",
      });
    }
    const visibleAlerts = systemAlerts.filter((alert) => !dismissedAlerts.includes(alert.key));
    const hasSystemError = visibleAlerts.some((alert) => alert.kind === "error");

    return (
      <AppShell
        title="Dashboard"
        subtitle="Overview of device conditions, thresholds, and alarms"
        statusText={statusText}
        online={d.online}
        dashboard
      >
        {visibleAlerts.length > 0 && (
          <section className={`system-alerts${hasSystemError ? " has-errors" : ""}`} aria-labelledby="system-alerts-title">
            <header className="system-alerts-header">
              <span className="system-alerts-heading-icon" aria-hidden="true">
                <Triangle size={19} />
                <span>!</span>
              </span>
              <h2 id="system-alerts-title">System alerts</h2>
              <span className="system-alerts-count" aria-label={`${visibleAlerts.length} alerts`}>
                {visibleAlerts.length}
              </span>
            </header>
            <ul className="system-alerts-list">
              {visibleAlerts.map((alert) => (
                <li className={`system-alert-item is-${alert.kind}`} key={alert.key}>
                  <span className="system-alert-item-icon" aria-hidden="true">
                    {alert.kind === "error" ? (
                      <span className="system-alert-warning">
                        <Triangle size={18} />
                        <i>!</i>
                      </span>
                    ) : alert.kind === "success" ? (
                      <CircleCheck size={18} />
                    ) : (
                      <Info size={18} />
                    )}
                  </span>
                  <p>{alert.message}</p>
                  <button
                    type="button"
                    className="system-alert-dismiss"
                    aria-label={`Dismiss alert: ${alert.message}`}
                    onClick={() => setDismissedAlerts((current) => [...current, alert.key])}
                  >
                    <X size={17} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="dashboard-kpis">
          <StatCard
            label="Temperature"
            value={r ? `${fmt(r.t)} °C` : "--"}
            badge={st.label}
            severity={st.severity}
            icon={<Thermometer size={24} strokeWidth={1.8} />}
            accent="temperature"
            loading={d.loading}
            countUp
            range={{
              current: r?.t ?? null,
              min: th.tmin,
              max: th.tmax,
              scaleMin: 0,
              scaleMax: 40,
              unit: "°C",
            }}
          />
          <StatCard
            label="Humidity"
            value={r ? `${fmt(r.h)} %` : "--"}
            badge={sh.label}
            severity={sh.severity}
            icon={<Droplets size={24} strokeWidth={1.8} />}
            accent="humidity"
            loading={d.loading}
            countUp
            range={{
              current: r?.h ?? null,
              min: th.hmin,
              max: th.hmax,
              scaleMin: 0,
              scaleMax: 100,
              unit: "%",
            }}
          />
          <StatCard
            label="Device Status"
            value={d.error ? "Unavailable" : d.online ? "Online" : "Offline"}
            badge={d.error ? "Failed to read data" : d.online ? "Connected" : "No new data"}
            severity={d.error ? "bd" : d.online ? "ok" : "bd"}
            icon={d.error ? <Activity size={24} strokeWidth={1.8} /> : <Cpu size={24} strokeWidth={1.8} />}
            accent="device"
            unavailable={!d.online}
            loading={d.loading}
            hint={
              d.error
                ? "Device status cannot be determined"
                : d.updatedAt
                  ? `Last updated: ${new Date(d.updatedAt).toLocaleTimeString("en-US")}`
                  : `ESP32 ${d.deviceId}`
            }
          />
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-chart">
            <div className="chart-toolbar">
              <span className="muted">Chart range:</span>
              <RangeTabs value={chartRange} onChange={setChartRange} options={CHART_RANGES} />
            </div>
            <EnvChart data={d.history} title={`Temperature and humidity (last ${chartRangeLabel})`} />
          </section>
          <section className="dashboard-room">
            <ActuatorStatus mode={d.mode} actuators={d.actuators} hasState={d.hasActuatorState} />
          </section>
          <section className="dashboard-threshold">
            <ThresholdForm
              key={d.thresholdsLoaded ? "loaded" : "loading"}
              thresholds={d.thresholds}
              onApply={d.applyThresholds}
              readOnly={!isAdmin}
            />
          </section>
          <section className="dashboard-alarms">
            <AlarmTable rows={d.alarms} />
          </section>
        </div>
      </AppShell>
    );
  }