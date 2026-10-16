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
    const r = await sendJson("PUT", "/api/devices", { id: editId, nama: editNama, lokasi: editLokasi });
    setMessage(r.ok ? { ok: true, text: "Perubahan tersimpan." } : { ok: false, text: r.error ?? "Gagal." });
    if (r.ok) setEditId(null);
    setBusy(false);
    devices.reload();
  };

  const addDevice = async () => {
    setBusy(true);
    const r = await sendJson("POST", "/api/devices", { device_id: newId, nama: newNama, lokasi: newLokasi });
    setMessage(r.ok ? { ok: true, text: "Perangkat ditambahkan." } : { ok: false, text: r.error ?? "Gagal." });
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
    <AppShell title="Perangkat" subtitle="Daftar perangkat ESP32 dan statusnya">
      {devices.error && <div className="note tone-bd page-note">{devices.error}</div>}
      {message && <div className={`note tone-${message.ok ? "ok" : "bd"} page-note`}>{message.text}</div>}

      <div className="c" style={{ marginBottom: 12 }}>
        <h2>Daftar perangkat</h2>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama</th>
                <th>Lokasi</th>
                <th>Status</th>
                <th>Data terakhir</th>
                {isAdmin && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="muted" style={{ textAlign: "center", padding: 20 }}>
                    {devices.loading ? "Memuat data..." : "Belum ada perangkat."}
                  </td>
                </tr>
              )}
              {list.map((d) => (
                <tr key={d.id}>
                  <td>{d.device_id}</td>
                  <td>{editId === d.id ? <input value={editNama} onChange={(e) => setEditNama(e.target.value)} /> : d.nama}</td>
                  <td>
                    {editId === d.id ? <input value={editLokasi} onChange={(e) => setEditLokasi(e.target.value)} /> : (d.lokasi ?? "-")}
                  </td>
                  <td>
                    <span className={`b tone-${d.online ? "ok" : "bd"}`} style={{ margin: 0 }}>
                      {d.online ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td>{d.lastSeen ? formatDateTime(d.lastSeen) : "Belum pernah"}</td>
                  {isAdmin && (
                    <td>
                      {editId === d.id ? (
                        <div className="row">
                          <button type="button" className="btn" disabled={busy} onClick={saveEdit}>
                            Simpan
                          </button>
                          <button type="button" className="btn" onClick={() => setEditId(null)}>
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="btn" onClick={() => startEdit(d)}>
                          Ubah
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="note tone-wn">
          Perangkat dianggap online jika ada data baru dalam 3 menit terakhir. Dashboard saat ini menampilkan data untuk satu perangkat utama.
        </div>
      </div>

      {isAdmin && (
        <div className="c">
          <h2>Tambah perangkat</h2>
          <div className="f" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div>
              <label htmlFor="newId">ID perangkat</label>
              <input id="newId" placeholder="andaliman02" value={newId} onChange={(e) => setNewId(e.target.value)} />
            </div>
            <div>
              <label htmlFor="newNama">Nama</label>
              <input id="newNama" value={newNama} onChange={(e) => setNewNama(e.target.value)} />
            </div>
            <div>
              <label htmlFor="newLokasi">Lokasi</label>
              <input id="newLokasi" value={newLokasi} onChange={(e) => setNewLokasi(e.target.value)} />
            </div>
          </div>
          <button type="button" className="apply" style={{ width: "auto", padding: "9px 20px" }} disabled={busy} onClick={addDevice}>
            Tambah perangkat
          </button>
          <div className="note tone-in">ID perangkat harus sama dengan tag device_id yang dikirim ESP32 ke InfluxDB.</div>
        </div>
      )}
    </AppShell>
  );
}
