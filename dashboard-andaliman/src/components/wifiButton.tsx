"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useWifi } from "@/hooks/useWifi";
import type { WifiNetwork } from "@/lib/types";

// Number of signal bars (1-3) based on RSSI strength.
const level = (rssi: number | null): 1 | 2 | 3 => (rssi === null ? 3 : rssi >= -60 ? 3 : rssi >= -72 ? 2 : 1);

// Wi-Fi icon: connected shows signal bars; disconnected shows a crossed-out icon, matching the LCD.
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
    <span className="bars" title={`${rssi} dBm`} aria-label={`Signal level ${lv} out of 3`}>
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
  const label = connecting
    ? "Connecting"
    : w.loading
      ? "Loading..."
      : !known
        ? "Status unknown"
        : connected
          ? "ESP32 online"
          : "ESP32 offline";
  const tone = connecting ? "wn" : !known ? "mu" : connected ? "ok" : "bd";
  const lv = level(w.status?.rssi ?? null);

  const toggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      w.refresh();
      if (isAdmin && connected && !w.networks && !w.scanning) void w.scan();
    }
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
      setFormError("The Wi-Fi password must be 8–63 characters.");
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
        aria-label={`ESP32 Wi-Fi: ${label}`}
      >
        <WifiIcon lv={lv} off={!connected && !connecting} />
        <span className="wifi-st">{label}</span>
      </button>

      {open && (
        <div className="wifi-pop" role="dialog" aria-label="ESP32 Wi-Fi">
          <div className="row between">
            <h2>Wi-Fi ESP32</h2>
            <span className={`b tone-${tone === "mu" ? "in" : tone}`}>{label}</span>
          </div>

          <div className="wifi-now">
            {connecting ? (
              <>
                <strong>Connecting to &quot;{w.connectingTo}&quot;...</strong>
                <span className="muted">
                  The device will disconnect briefly. This can take 1–2 minutes; if it fails, it will return to its previous Wi-Fi network.
                </span>
              </>
            ) : connected ? (
              <>
                <strong>{w.status?.ssid ?? "Connected"}</strong>
                <span className="muted">
                  {[w.status?.rssi != null ? `${w.status.rssi} dBm` : null, w.status?.ip].filter(Boolean).join(" · ") ||
                    "The ESP32 is connected to the dashboard via MQTT."}
                </span>
              </>
            ) : (
              <>
                <strong>ESP32 is not currently online</strong>
                <span className="muted">
                  {w.status?.ssid ? `Last Wi-Fi network: "${w.status.ssid}". ` : ""}
                  The dashboard has not received an ESP32 status update via MQTT. Connecting your laptop to Wi-Fi does not automatically connect the ESP32.
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
            <p className="muted wifi-gap">Only admins can change the device Wi-Fi network.</p>
          ) : (
            <>
              <div className="wifi-picker-heading">
                <strong>Select a network</strong>
                <button
                  type="button"
                  className="wifi-refresh"
                  onClick={() => void w.scan()}
                  disabled={!connected || sibuk}
                >
                  {w.scanning ? "Scanning..." : "Scan again"}
                </button>
              </div>

              {w.scanning && <div className="muted wifi-empty" role="status">Searching for nearby Wi-Fi networks...</div>}
              {!w.scanning && w.networks && (
                <ul className="wifi-list" aria-label="Available Wi-Fi networks">
                  {w.networks.length === 0 && <li className="muted wifi-empty">No networks found.</li>}
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
                          {aktif && <span className="b tone-ok">Connected</span>}
                          {n.secure && (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Password-protected network" role="img">
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
                                  Password for &quot;{n.ssid}&quot;
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
                                    {lihat ? "Hide" : "Show"}
                                  </button>
                                </div>
                              </>
                            )}
                            {formError && <div className="note tone-bd">{formError}</div>}
                            <div className="row">
                              <button type="submit" className="apply" style={{ flex: 1 }} disabled={connecting}>
                                Connect
                              </button>
                              <button type="button" className="btn" onClick={batalPilih}>
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {!connected && (
                <div className="muted wifi-foot" role="note">
                  <strong>ESP32 is offline — configure Wi-Fi through local setup</strong>
                  <ol>
                    <li>Open the Arduino IDE Serial Monitor (115200 baud) and find the network name and password for <code>ANDALIMAN-SETUP-...</code>.</li>
                    <li>Connect your computer or phone to that setup network, then open the <a href="http://192.168.4.1" target="_blank" rel="noreferrer">ESP32 setup page</a>.</li>
                    <li>Scan for and select a 2.4 GHz Wi-Fi network. It must be able to reach the MQTT broker for the ESP32 to come online.</li>
                  </ol>
                  The dashboard can scan for and change Wi-Fi networks here once the ESP32 is online via MQTT.
                </div>
              )}
              <p className="muted wifi-foot">
                This status and scan apply to the ESP32, not your computer. Scanning requires the ESP32 to be powered on, connected to a 2.4 GHz Wi-Fi network, and online via the MQTT broker. A password is only required for secured networks.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
