"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useWifi } from "@/hooks/useWifi";
import type { WifiNetwork } from "@/lib/types";

// Jumlah busur sinyal (1-3) dari kekuatan sinyal dBm
const level = (rssi: number | null): 1 | 2 | 3 => (rssi === null ? 3 : rssi >= -60 ? 3 : rssi >= -72 ? 2 : 1);

// Ikon Wi-Fi: terhubung = busur sinyal, terputus = busur dicoret garis miring (sama dengan ikon di LCD)
function WifiIcon({ lv, off }: { lv: 1 | 2 | 3; off: boolean }) {
  return (
    <svg className="wifi-ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M2.5 9a14 14 0 0 1 19 0" opacity={off || lv >= 3 ? 1 : 0.28} />
      <path d="M5.8 12.6a9.4 9.4 0 0 1 12.4 0" opacity={off || lv >= 2 ? 1 : 0.28} />
      <path d="M9.1 16.1a4.8 4.8 0 0 1 5.8 0" />
      <circle cx="12" cy="19.4" r="1.1" fill="currentColor" stroke="none" />
      {off && <path d="M4 3.5 20 20.5" strokeWidth="2.4" />}
    </svg>
  );
}

function Bars({ rssi }: { rssi: number }) {
  const lv = level(rssi);
  return (
    <span className="bars" title={`${rssi} dBm`} aria-label={`Sinyal ${lv} dari 3`}>
      {[1, 2, 3].map((n) => (
        <i key={n} className={n <= lv ? "on" : ""} style={{ height: 4 + n * 4 }} />
      ))}
    </span>
  );
}

export default function WifiButton({ isAdmin }: { isAdmin: boolean }) {
  const w = useWifi();
  const [open, setOpen] = useState(false);
  const [pilih, setPilih] = useState<WifiNetwork | null>(null);
  const [password, setPassword] = useState("");
  const [lihat, setLihat] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  // Tutup dengan klik di luar panel atau tombol Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const connecting = w.connectingTo !== null;
  const connected = w.status?.connected ?? false;
  const known = w.status !== null;
  const label = connecting ? "Menghubungkan" : w.loading ? "..." : !known ? "Tidak ada data" : connected ? "Connect" : "Disconnect";
  const tone = connecting ? "wn" : !known ? "mu" : connected ? "ok" : "bd";
  const lv = level(w.status?.rssi ?? null);

  const toggle = () => {
    setOpen((o) => {
      if (!o) w.refresh();
      return !o;
    });
  };

  const batalPilih = () => {
    setPilih(null);
    setPassword("");
    setLihat(false);
    setFormError(null);
  };

  const kirim = async (e: FormEvent) => {
    e.preventDefault();
    if (!pilih) return;
    if (pilih.secure && (password.length < 8 || password.length > 63)) {
      setFormError("Password Wi-Fi harus 8 sampai 63 karakter.");
      return;
    }
    const ok = await w.connectTo(pilih.ssid, pilih.secure ? password : "");
    if (ok) batalPilih();
  };

  const sibuk = w.scanning || connecting;

  return (
    <div className="wifi" ref={wrap}>
      <button
        type="button"
        className={`wifi-btn tone-t-${tone}`}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Wi-Fi perangkat: ${label}`}
      >
        <WifiIcon lv={lv} off={!connected && !connecting} />
        <span className="wifi-st">{label}</span>
      </button>

      {open && (
        <div className="wifi-pop" role="dialog" aria-label="Wi-Fi perangkat">
          <div className="row between">
            <h2>Wi-Fi perangkat</h2>
            <span className={`b tone-${tone === "mu" ? "in" : tone}`}>{label}</span>
          </div>

          <div className="wifi-now">
            {connecting ? (
              <>
                <strong>Menghubungkan ke &quot;{w.connectingTo}&quot;...</strong>
                <span className="muted">
                  Perangkat terputus sebentar. Bisa sampai 1-2 menit; jika gagal, perangkat kembali ke Wi-Fi sebelumnya.
                </span>
              </>
            ) : connected ? (
              <>
                <strong>{w.status?.ssid ?? "Terhubung"}</strong>
                <span className="muted">
                  {[w.status?.rssi != null ? `${w.status.rssi} dBm` : null, w.status?.ip].filter(Boolean).join(" · ") ||
                    "Perangkat mengirim data."}
                </span>
              </>
            ) : (
              <>
                <strong>Tidak terhubung</strong>
                <span className="muted">
                  {w.status?.ssid ? `Terakhir terhubung ke "${w.status.ssid}". ` : ""}
                  Perangkat harus online untuk menerima pengaturan Wi-Fi.
                </span>
              </>
            )}
          </div>

          {w.error && <div className="note tone-bd">{w.error}</div>}
          {w.notice && (
            <div className={`note tone-${w.notice.ok ? "ok" : "bd"}`} role="status">
              {w.notice.text}
            </div>
          )}

          {!isAdmin ? (
            <p className="muted wifi-gap">Hanya admin yang dapat mengganti Wi-Fi perangkat.</p>
          ) : (
            <>
              <button type="button" className="apply wifi-gap" onClick={() => void w.scan()} disabled={!connected || sibuk}>
                {w.scanning ? "Mencari jaringan..." : w.networks ? "Cari ulang" : "Cari jaringan Wi-Fi"}
              </button>

              {w.networks && (
                <ul className="wifi-list" aria-label="Jaringan Wi-Fi tersedia">
                  {w.networks.length === 0 && <li className="muted wifi-empty">Tidak ada jaringan ditemukan.</li>}
                  {w.networks.map((n) => {
                    const aktif = connected && w.status?.ssid === n.ssid;
                    const dipilih = pilih?.ssid === n.ssid;
                    return (
                      <li key={n.ssid}>
                        <button
                          type="button"
                          className={`wifi-item${dipilih ? " on" : ""}`}
                          onClick={() => (dipilih ? batalPilih() : (batalPilih(), setPilih(n)))}
                          disabled={connecting || aktif}
                        >
                          <span className="wifi-name">{n.ssid}</span>
                          {aktif && <span className="b tone-ok">Terhubung</span>}
                          {n.secure && (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Berpassword" role="img">
                              <rect x="5" y="11" width="14" height="9" rx="2" />
                              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                            </svg>
                          )}
                          <Bars rssi={n.rssi} />
                        </button>
                        {dipilih && (
                          <form className="wifi-form" onSubmit={kirim}>
                            {n.secure && (
                              <>
                                <label htmlFor="wifi-pass" className="lbl">
                                  Password untuk &quot;{n.ssid}&quot;
                                </label>
                                <div className="row">
                                  <input
                                    id="wifi-pass"
                                    type={lihat ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => {
                                      setPassword(e.target.value);
                                      setFormError(null);
                                    }}
                                    autoComplete="new-password"
                                    autoFocus
                                    maxLength={63}
                                    style={{ flex: 1, minWidth: 0 }}
                                  />
                                  <button type="button" className="btn" onClick={() => setLihat((v) => !v)}>
                                    {lihat ? "Sembunyikan" : "Tampilkan"}
                                  </button>
                                </div>
                              </>
                            )}
                            {formError && <div className="note tone-bd">{formError}</div>}
                            <div className="row">
                              <button type="submit" className="apply" style={{ flex: 1 }} disabled={connecting}>
                                Hubungkan
                              </button>
                              <button type="button" className="btn" onClick={batalPilih}>
                                Batal
                              </button>
                            </div>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="muted wifi-foot">
                ESP32 hanya mendeteksi Wi-Fi 2,4 GHz. Password dikirim ke perangkat lewat MQTT dan disimpan di memori ESP32.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
