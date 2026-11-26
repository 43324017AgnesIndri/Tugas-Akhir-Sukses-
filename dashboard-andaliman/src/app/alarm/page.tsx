"use client";

import AppShell from "@/components/AppShell";
import { useApi } from "@/hooks/useApi";
import { useProfile } from "@/hooks/useProfile";
import { sendJson } from "@/lib/client";
import type { AlarmRecord, ControlLogRecord } from "@/lib/types";
import { formatDateTime, severityFromStatus } from "@/lib/utils";
import { useState } from "react";

const AKSI: Record<string, string> = {
  set_mode: "Change mode",
  set_aktuator: "Change actuator",
  set_threshold: "Change threshold",
};

export default function AlarmPage() {
  const alarms = useApi<{ alarms: AlarmRecord[] }>("/api/alarms?limit=100", 15000);
  const logs = useApi<{ logs: ControlLogRecord[] }>("/api/control-logs", 30000);
  const { profile } = useProfile();

  const isAdmin = profile?.role === "admin";

  const [onlyUnread, setOnlyUnread] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const all = alarms.data?.alarms ?? [];
  const unread = all.filter((a) => !a.acknowledged).length;
  const rows = onlyUnread
    ? all.filter((a) => !a.acknowledged)
    : all;

  const acknowledge = async (id?: string) => {
    setMessage(null);

    const r = await sendJson(
      "PATCH",
      "/api/alarms",
      id ? { id } : {}
    );

    if (!r.ok) setMessage(r.error);

    alarms.reload();
  };

  const controlLogs = logs.data?.logs ?? [];

  return (
    <AppShell
      title="Alarms and Logs"
      subtitle="Alarm history and control command log"
    >
      {alarms.error && (
        <div className="note tone-bd page-note">
          {alarms.error}
        </div>
      )}

      {message && (
        <div className="note tone-bd page-note">
          {message}
        </div>
      )}

      {/* =====================================================
          ALARM
         ===================================================== */}
      <div className="c alarm-page-card">
        <div className="alarm-page-header">
          <h2>
            Alarms ({all.length}) · unread: {unread}
          </h2>

          <div className="alarm-page-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setOnlyUnread((v) => !v)}
            >
              {onlyUnread
                ? "Show all"
                : "Unread only"}
            </button>

            {isAdmin && (
              <button
                type="button"
                className="btn"
                disabled={unread === 0}
                onClick={() => acknowledge()}
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* DESKTOP */}
        <div className="tw scroll alarm-page-desktop">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Parameter</th>
                <th>Value</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Read</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="muted"
                    style={{
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    {alarms.loading
                      ? "Loading data..."
                      : "No alarms yet."}
                  </td>
                </tr>
              )}

              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{formatDateTime(a.created_at)}</td>

                  <td>{a.parameter}</td>

                  <td>{a.nilai ?? "-"}</td>

                  <td>
                    <span
                      className={`b tone-${severityFromStatus(
                        a.status
                      )}`}
                      style={{ margin: 0 }}
                    >
                      {a.status}
                    </span>
                  </td>

                  <td>{a.keterangan ?? ""}</td>

                  <td>
                    {a.acknowledged ? (
                      "Read"
                    ) : isAdmin ? (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => acknowledge(a.id)}
                      >
                        Mark as read
                      </button>
                    ) : (
                      "Unread"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* HP */}
        <div className="alarm-page-mobile">
          {rows.length === 0 ? (
            <div className="alarm-page-empty">
              {alarms.loading
                ? "Loading data..."
                : "No alarms yet."}
            </div>
          ) : (
            rows.map((a) => (
              <div className="alarm-page-item" key={a.id}>
                <div className="alarm-page-row">
                  <span>Time</span>
                  <strong>
                    {formatDateTime(a.created_at)}
                  </strong>
                </div>

                <div className="alarm-page-row">
                  <span>Parameter</span>
                  <strong>{a.parameter}</strong>
                </div>

                <div className="alarm-page-row">
                  <span>Value</span>
                  <strong>{a.nilai ?? "-"}</strong>
                </div>

                <div className="alarm-page-row">
                  <span>Status</span>
                  <span>
                    <span
                      className={`b tone-${severityFromStatus(
                        a.status
                      )}`}
                    >
                      {a.status}
                    </span>
                  </span>
                </div>

                <div className="alarm-page-row alarm-page-description">
                  <span>Notes</span>
                  <strong>
                    {a.keterangan ?? "-"}
                  </strong>
                </div>

                <div className="alarm-page-row">
                  <span>Read</span>

                  {a.acknowledged ? (
                    <strong>Read</strong>
                  ) : isAdmin ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => acknowledge(a.id)}
                    >
                      Mark as read
                    </button>
                  ) : (
                    <strong>Unread</strong>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =====================================================
          LOG PERINTAH KONTROL
         ===================================================== */}
      <div className="c control-log-page-card">
        <h2>Control Command Log</h2>

        {logs.error && (
          <div className="note tone-bd">
            {logs.error}
          </div>
        )}

        {/* DESKTOP */}
        <div className="tw scroll control-log-page-desktop">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Detail</th>
              </tr>
            </thead>

            <tbody>
              {controlLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="muted"
                    style={{
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    {logs.loading
                      ? "Loading data..."
                      : "No control commands recorded yet."}
                  </td>
                </tr>
              )}

              {controlLogs.map((l) => (
                <tr key={l.id}>
                  <td>
                    {formatDateTime(l.created_at)}
                  </td>

                  <td>{l.user_nama ?? "-"}</td>

                  <td>
                    {AKSI[l.aksi] ?? l.aksi}
                  </td>

                  <td>
                    {l.detail
                      ? JSON.stringify(l.detail)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* HP */}
        <div className="control-log-page-mobile">
          {controlLogs.length === 0 ? (
            <div className="control-log-page-empty">
              {logs.loading
                ? "Loading data..."
                : "No control commands recorded yet."}
            </div>
          ) : (
            controlLogs.map((l) => (
              <div
                className="control-log-page-item"
                key={l.id}
              >
                <div className="control-log-page-row">
                  <span>Time</span>
                  <strong>
                    {formatDateTime(l.created_at)}
                  </strong>
                </div>

                <div className="control-log-page-row">
                  <span>User</span>
                  <strong>
                    {l.user_nama ?? "-"}
                  </strong>
                </div>

                <div className="control-log-page-row">
                  <span>Action</span>
                  <strong>
                    {AKSI[l.aksi] ?? l.aksi}
                  </strong>
                </div>

                <div className="control-log-page-row control-log-page-description">
                  <span>Details</span>
                  <strong>
                    {l.detail
                      ? JSON.stringify(l.detail)
                      : "-"}
                  </strong>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}