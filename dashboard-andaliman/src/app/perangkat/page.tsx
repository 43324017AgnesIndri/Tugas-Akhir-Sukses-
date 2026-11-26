"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useApi } from "@/hooks/useApi";
import { useProfile } from "@/hooks/useProfile";
import { sendJson } from "@/lib/client";
import type { DeviceInfo } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function PerangkatPage() {
  const devices = useApi<{ devices: DeviceInfo[] }>("/api/devices", 10000);
  const { profile } = useProfile();
  const isAdmin = profile?.role === "admin";

  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editLokasi, setEditLokasi] = useState("");
  const [newId, setNewId] = useState("");
  const [newNama, setNewNama] = useState("");
  const [newLokasi, setNewLokasi] = useState("");
  const [busy, setBusy] = useState(false);

  const startEdit = (d: DeviceInfo) => {
    setEditId(d.id);
    setEditNama(d.nama);
    setEditLokasi(d.lokasi ?? "");
  };

  const saveEdit = async () => {
    if (!editId) return;

    setBusy(true);

    const r = await sendJson("PUT", "/api/devices", {
      id: editId,
      nama: editNama,
      lokasi: editLokasi,
    });

    setMessage(
      r.ok
        ? { ok: true, text: "Changes saved." }
        : { ok: false, text: r.error ?? "Failed." }
    );

    if (r.ok) setEditId(null);

    setBusy(false);
    devices.reload();
  };

  const addDevice = async () => {
    if (!newId.trim() && !newNama.trim()) {
      setMessage({
        ok: false,
        text: "Device ID and device name are required.",
      });
      return;
    }

    if (!newId.trim()) {
      setMessage({
        ok: false,
        text: "Device ID is required.",
      });
      return;
    }

    if (!newNama.trim()) {
      setMessage({
        ok: false,
        text: "Device name is required.",
      });
      return;
    }

    setBusy(true);

    const r = await sendJson("POST", "/api/devices", {
      device_id: newId.trim(),
      nama: newNama.trim(),
      lokasi: newLokasi.trim(),
    });

    setMessage(
      r.ok
        ? { ok: true, text: "Device added." }
        : {
            ok: false,
            text: r.error ?? "Failed to add device.",
          }
    );

    if (r.ok) {
      setNewId("");
      setNewNama("");
      setNewLokasi("");
    }

    setBusy(false);
    devices.reload();
  };

  const list = devices.data?.devices ?? [];

  return (
    <AppShell
      title="Devices"
      subtitle="ESP32 devices and their status"
    >
      {devices.error && (
        <div className="note tone-bd page-note">
          {devices.error}
        </div>
      )}

      {message && (
        <div
          className={`note tone-${message.ok ? "ok" : "bd"} page-note`}
        >
          {message.text}
        </div>
      )}

      <div className="c perangkat-card" style={{ marginBottom: 12 }}>
        <h2>Device List</h2>

        {/* Desktop: table layout */}
        <div className="tw perangkat-table-desktop">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Location</th>
                <th>Status</th>
                <th>Last seen</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {list.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="muted"
                    style={{
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    {devices.loading
                      ? "Loading data..."
                      : "No devices yet."}
                  </td>
                </tr>
              )}

              {list.map((d) => (
                <tr key={d.id}>
                  <td>{d.device_id}</td>

                  <td>
                    {editId === d.id ? (
                      <input
                        value={editNama}
                        onChange={(e) =>
                          setEditNama(e.target.value)
                        }
                      />
                    ) : (
                      d.nama
                    )}
                  </td>

                  <td>
                    {editId === d.id ? (
                      <input
                        value={editLokasi}
                        onChange={(e) =>
                          setEditLokasi(e.target.value)
                        }
                      />
                    ) : (
                      d.lokasi ?? "-"
                    )}
                  </td>

                  <td>
                    <span
                      className={`b tone-${d.online ? "ok" : "bd"}`}
                      style={{ margin: 0 }}
                    >
                      {d.online ? "Online" : "Offline"}
                    </span>
                  </td>

                  <td>
                    {d.lastSeen
                      ? formatDateTime(d.lastSeen)
                      : "Never"}
                  </td>

                  {isAdmin && (
                    <td>
                      {editId === d.id ? (
                        <div className="row">
                          <button
                            type="button"
                            className="btn"
                            disabled={busy}
                            onClick={saveEdit}
                          >
                            Save
                          </button>

                          <button
                            type="button"
                            className="btn"
                            onClick={() => setEditId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => startEdit(d)}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: vertical cards */}
        <div className="perangkat-table-mobile">
          {list.length === 0 && (
            <div className="perangkat-empty">
              {devices.loading
                ? "Loading data..."
                : "No devices yet."}
            </div>
          )}

          {list.map((d) => (
            <div className="perangkat-item" key={d.id}>
              <div className="perangkat-row">
                <span>ID</span>
                <strong>{d.device_id}</strong>
              </div>

              <div className="perangkat-row">
                <span>Name</span>

                {editId === d.id ? (
                  <input
                    value={editNama}
                    onChange={(e) =>
                      setEditNama(e.target.value)
                    }
                  />
                ) : (
                  <strong>{d.nama}</strong>
                )}
              </div>

              <div className="perangkat-row">
                <span>Location</span>

                {editId === d.id ? (
                  <input
                    value={editLokasi}
                    onChange={(e) =>
                      setEditLokasi(e.target.value)
                    }
                  />
                ) : (
                  <strong>{d.lokasi ?? "-"}</strong>
                )}
              </div>

              <div className="perangkat-row">
                <span>Status</span>

                <span
                  className={`b tone-${d.online ? "ok" : "bd"}`}
                  style={{ margin: 0 }}
                >
                  {d.online ? "Online" : "Offline"}
                </span>
              </div>

              <div className="perangkat-row">
                <span>Last seen</span>
                <strong>
                  {d.lastSeen
                    ? formatDateTime(d.lastSeen)
                    : "Never"}
                </strong>
              </div>

              {isAdmin && (
                <div className="perangkat-actions">
                  {editId === d.id ? (
                    <>
                      <button
                        type="button"
                        className="btn"
                        disabled={busy}
                        onClick={saveEdit}
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        className="btn"
                        onClick={() => setEditId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => startEdit(d)}
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="note tone-wn">
          A device is considered online if it has sent new data within the last
          3 minutes. The dashboard currently displays data for one primary
          device.
        </div>
      </div>

      {isAdmin && (
        <div className="c">
          <h2>Add Device</h2>

          <div
            className="f"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            <div>
              <label htmlFor="newId">Device ID</label>
              <input
                id="newId"
                placeholder="andaliman02"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="newNama">Name</label>
              <input
                id="newNama"
                value={newNama}
                onChange={(e) => setNewNama(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="newLokasi">Location</label>
              <input
                id="newLokasi"
                value={newLokasi}
                onChange={(e) => setNewLokasi(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            className="apply"
            style={{
              width: "auto",
              padding: "9px 20px",
            }}
            disabled={busy}
            onClick={addDevice}
          >
            Add Device
          </button>

          <div className="note tone-in">
            The device ID must match the device_id tag sent by the ESP32 to
            InfluxDB.
          </div>
        </div>
      )}
    </AppShell>
  );
}