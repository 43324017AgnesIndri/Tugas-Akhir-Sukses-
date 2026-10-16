"use client";

import { useState } from "react";
impot { useApi } from "@/hooks/useApi";
import { usePrrt AppShell from "@/components/AppShell";
imporofile } from "@/hooks/useProfile";
import { sendJson } from "@/lib/client";
import type { AlarmRecord, ControlLogRecord } from "@/lib/types";
import { formatDateTime, severityFromStatus } from "@/lib/utils";

const AKSI: Record<string, string> = {
  set_mode: "Ubah mode",
  set_aktuator: "Ubah aktuator",
  set_threshold: "Ubah threshold",
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
  const rows = onlyUnread ? all.filter((a) => !a.acknowledged) : all;

  const acknowledge = async (id?: string) => {
    setMessage(null);
    const r = await sendJson("PATCH", "/api/alarms", id ? { id } : {});
    if (!r.ok) setMessage(r.error);
    alarms.reload();
  };

  return (
    <AppShell title="Alarm dan log" subtitle="Riwayat alarm dan catatan perintah kontrol">
      {alarms.error && <div className="note tone-bd page-note">{alarms.error}</div>}
      {message && <div className="note tone-bd page-note">{message}</div>}

      <div className="c" style={{ marginBottom: 12 }}>
        <div className="row between">
          <h2 style={{ margin: 0 }}>
            Alarm ({all.length}) · belum dibaca: {unread}
          </h2>
          <div className="row">
            <button type="button" className="btn" onClick={() => setOnlyUnread((v) => !v)}>
              {onlyUnread ? "Tampilkan semua" : "Hanya yang belum dibaca"}
            </button>
            {isAdmin && (
              <button type="button" className="btn" disabled={unread === 0} onClick={() => acknowledge()}>
                Tandai semua dibaca
              </button>
            )}
          </div>
        </div>
        <div className="tw scroll" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Parameter</th>
                <th>Nilai</th>
                <th>Status</th>
                <th>Keterangan</th>
                <th>Dibaca</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: "center", padding: 20 }}>
                    {alarms.loading ? "Memuat data..." : "Tidak ada alarm."}
                  </td>
                </tr>
              )}
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{formatDateTime(a.created_at)}</td>
                  <td>{a.parameter}</td>
                  <td>{a.nilai ?? "-"}</td>
                  <td>
                    <span className={`b tone-${severityFromStatus(a.status)}`} style={{ margin: 0 }}>
                      {a.status}
                    </span>
                  </td>
                  <td>{a.keterangan ?? ""}</td>
                  <td>
                    {a.acknowledged ? (
                      "Sudah"
                    ) : isAdmin ? (
                      <button type="button" className="btn" onClick={() => acknowledge(a.id)}>
                        Tandai
                      </button>
                    ) : (
                      "Belum"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="c">
        <h2>Log perintah kontrol</h2>
        {logs.error && <div className="note tone-bd">{logs.error}</div>}
        <div className="tw scroll">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pengguna</th>
                <th>Aksi</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {(logs.data?.logs ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="muted" style={{ textAlign: "center", padding: 20 }}>
                    {logs.loading ? "Memuat data..." : "Belum ada perintah kontrol yang tercatat."}
                  </td>
                </tr>
              )}
              {(logs.data?.logs ?? []).map((l) => (
                <tr key={l.id}>
                  <td>{formatDateTime(l.created_at)}</td>
                  <td>{l.user_nama ?? "-"}</td>
                  <td>{AKSI[l.aksi] ?? l.aksi}</td>
                  <td>{l.detail ? JSON.stringify(l.detail) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
