"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendJson } from "@/lib/client";
import type { WifiHasil, WifiNetwork, WifiStatus } from "@/lib/types";

const POLL_IDLE_MS = 10000; // status Wi-Fi saat tidak ada proses
const POLL_BUSY_MS = 2000; // saat menunggu hasil scan atau ganti Wi-Fi
const SCAN_TIMEOUT_MS = 25000;
const CONNECT_TIMEOUT_MS = 100000; // percobaan gagal bisa memakan ~45 detik (coba + kembali + lapor)

export interface WifiNotice {
  ok: boolean;
  text: string;
}

interface Pending {
  id: string;
  ssid: string;
}

function pesanHasil(hasil: WifiHasil, target: string, sekarang: string | null): { ok: boolean; text: string } {
  const lama = sekarang ? ` Perangkat kembali ke "${sekarang}".` : "";
  if (hasil === "ok") return { ok: true, text: `Perangkat terhubung ke "${target}" dan akan memakainya seterusnya.` };
  if (hasil === "gagal_wifi") {
    return { ok: false, text: `Tidak dapat terhubung ke "${target}". Periksa password dan kekuatan sinyalnya.${lama}` };
  }
  return {
    ok: false,
    text: `Perangkat berhasil masuk ke "${target}", tetapi server MQTT tidak terjangkau dari jaringan itu (jaringan tamu atau firewall).${lama}`,
  };
}

export function useWifi() {
  const router = useRouter();
  const [status, setStatus] = useState<WifiStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [networks, setNetworks] = useState<WifiNetwork[] | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [notice, setNotice] = useState<WifiNotice | null>(null);

  // Salinan untuk dibaca di dalam fungsi load tanpa membuatnya berubah terus
  const scanRef = useRef<string | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const beginScan = useCallback((id: string | null) => {
    scanRef.current = id;
    setScanId(id);
  }, []);
  const beginPending = useCallback((p: Pending | null) => {
    pendingRef.current = p;
    setPending(p);
  }, []);

  const wantScan = scanId !== null;
  const busy = scanId !== null || pending !== null;

  const load = useCallback(async () => {
    try {
      const res = await fetch(wantScan ? "/api/wifi?scan=1" : "/api/wifi", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const json = (await res.json().catch(() => ({}))) as WifiStatus & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal mengambil status Wi-Fi.");
      setStatus(json);
      setError(null);

      // Hasil scan milik permintaan kita?
      if (scanRef.current && json.scan?.id === scanRef.current) {
        setNetworks(json.scan.networks);
        scanRef.current = null;
        setScanId(null);
      }
      // Hasil ganti Wi-Fi milik permintaan kita?
      const p = pendingRef.current;
      if (p && json.hasil && json.resultId === p.id) {
        setNotice(pesanHasil(json.hasil, p.ssid, json.ssid));
        pendingRef.current = null;
        setPending(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengambil status Wi-Fi.");
    } finally {
      setLoading(false);
    }
  }, [wantScan, router]);

  useEffect(() => {
    void load();
    const id = setInterval(load, busy ? POLL_BUSY_MS : POLL_IDLE_MS);
    return () => clearInterval(id);
  }, [load, busy]);

  // Batas waktu menunggu jawaban perangkat
  useEffect(() => {
    if (!scanId) return;
    const t = setTimeout(() => {
      if (scanRef.current !== scanId) return;
      scanRef.current = null;
      setScanId(null);
      setNotice({ ok: false, text: "Perangkat tidak mengirim daftar jaringan. Pastikan perangkat online, lalu coba lagi." });
    }, SCAN_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [scanId]);

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => {
      if (pendingRef.current?.id !== pending.id) return;
      pendingRef.current = null;
      setPending(null);
      setNotice({
        ok: false,
        text: "Belum ada jawaban dari perangkat. Tunggu sebentar; jika tetap offline, periksa ESP32 dan Wi-Fi-nya.",
      });
    }, CONNECT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [pending]);

  const scan = useCallback(async () => {
    setNotice(null);
    const r = await sendJson<{ id: string }>("POST", "/api/wifi", { action: "scan" });
    if (!r.ok || !r.data) {
      setNotice({ ok: false, text: r.error ?? "Perintah scan gagal dikirim." });
      return;
    }
    beginScan(r.data.id);
  }, [beginScan]);

  const connectTo = useCallback(async (ssid: string, password: string): Promise<boolean> => {
    setNotice(null);
    const r = await sendJson<{ id: string }>("POST", "/api/wifi", { action: "connect", ssid, password });
    if (!r.ok || !r.data) {
      setNotice({ ok: false, text: r.error ?? "Perintah ganti Wi-Fi gagal dikirim." });
      return false;
    }
    beginPending({ id: r.data.id, ssid });
    return true;
  }, [beginPending]);

  const refresh = useCallback(() => void load(), [load]);
  const clearNotice = useCallback(() => setNotice(null), []);

  return {
    status,
    error,
    loading,
    networks,
    scanning: scanId !== null,
    connectingTo: pending?.ssid ?? null,
    notice,
    scan,
    connectTo,
    refresh,
    clearNotice,
  };
}
