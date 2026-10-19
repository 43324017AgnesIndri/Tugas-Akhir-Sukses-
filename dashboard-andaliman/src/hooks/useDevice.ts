  "use client";

  import { useCallback, useEffect, useState } from "react";
  import { useRouter } from "next/navigation";
  import type {
    AlarmRecord,
    AlarmRow,
    ApplyResult,
    ChartPoint,
    DashboardData,
    HistoryPoint,
    Thresholds,
  } from "@/lib/types";
  import { DEFAULT_THRESHOLDS, severityFromStatus } from "@/lib/utils";

  const EMPTY_ACTUATORS = { kompresor: false, fan: false, mist: false };

  const jam = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

  const tanggal = (iso: string) =>
    new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  // F3: semua data diambil dari /api/... (InfluxDB dan Supabase)
  export function useDevice() {
    const router = useRouter();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [history, setHistory] = useState<ChartPoint[]>([]);
    const [alarms, setAlarms] = useState<AlarmRow[]>([]);
    const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
    const [thresholdsLoaded, setThresholdsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Mengambil JSON dari API. Jika sesi habis (401), kembali ke halaman login.
    const getJson = useCallback(
      async <T>(url: string): Promise<T> => {
        const res = await fetch(url, { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login");
          throw new Error("Sesi berakhir, silakan login lagi.");
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((json as { error?: string }).error ?? "Gagal mengambil data dari server.");
        return json as T;
      },
      [router]
    );

    // Data terbaru: setiap 5 detik
    useEffect(() => {
      let alive = true;
      const load = async () => {
        try {
          const d = await getJson<DashboardData>("/api/dashboard");
          if (alive) {
            setDashboard(d);
            setError(null);
          }
        } catch (e) {
          if (alive) setError(e instanceof Error ? e.message : "Gagal mengambil data.");
        } finally {
          if (alive) setLoading(false);
        }
      };
      void load();
      const id = setInterval(load, 5000);
      return () => {
        alive = false;
        clearInterval(id);
      };
    }, [getJson]);

    // Grafik 24 jam: setiap 60 detik
    useEffect(() => {
      let alive = true;
      const load = async () => {
        try {
          const { points } = await getJson<{ points: HistoryPoint[] }>("/api/history");
          if (alive) setHistory(points.map((p) => ({ label: jam(p.time), suhu: p.suhu, kelembapan: p.kelembapan })));
        } catch {
          // Kesalahan ditampilkan oleh pengambilan data utama
        }
      };
      void load();
      const id = setInterval(load, 60000);
      return () => {
        alive = false;
        clearInterval(id);
      };
    }, [getJson]);

    // Alarm: setiap 30 detik
    useEffect(() => {
      let alive = true;
      const load = async () => {
        try {
          const { alarms: rows } = await getJson<{ alarms: AlarmRecord[] }>("/api/alarms");
          if (alive) {
            setAlarms(
              rows.map((a) => ({
                id: a.id,
                waktu: tanggal(a.created_at),
                parameter: a.parameter,
                nilai: a.nilai ?? "-",
                status: a.status,
                severity: severityFromStatus(a.status),
                keterangan: a.keterangan ?? "",
              }))
            );
          }
        } catch {
          // Kesalahan ditampilkan oleh pengambilan data utama
        }
      };
      void load();
      const id = setInterval(load, 30000);
      return () => {
        alive = false;
        clearInterval(id);
      };
    }, [getJson]);

    // Threshold: sekali saat halaman dibuka
    useEffect(() => {
      let alive = true;
      getJson<{ thresholds: Thresholds }>("/api/threshold")
        .then((r) => {
          if (alive) {
            setThresholds(r.thresholds);
            setThresholdsLoaded(true);
          }
        })
        .catch(() => {
          if (alive) setThresholdsLoaded(true);
        });
      return () => {
        alive = false;
      };
    }, [getJson]);

    // Menyimpan threshold ke Supabase (hanya admin; dijaga juga di server dan RLS)
    const applyThresholds = useCallback(async (v: Thresholds): Promise<ApplyResult> => {
      if ([v.tmin, v.tmax, v.hmin, v.hmax].some((n) => Number.isNaN(n))) {
        return { ok: false, message: "Semua kolom harus berisi angka." };
      }
      if (v.tmin >= v.tmax || v.hmin >= v.hmax) {
        return { ok: false, message: "Batas bawah harus lebih kecil dari batas atas." };
      }
      try {
        const res = await fetch("/api/threshold", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(v),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string; thresholds?: Thresholds };
        if (!res.ok || !json.thresholds) {
          return { ok: false, message: json.error ?? "Gagal menyimpan threshold." };
        }
        setThresholds(json.thresholds);
        return { ok: true, message: "Threshold tersimpan di database." };
      } catch {
        return { ok: false, message: "Tidak dapat terhubung ke server." };
      }
    }, []);

    return {
      deviceId: dashboard?.deviceId ?? "andaliman01",
      reading: dashboard?.reading ?? null,
      updatedAt: dashboard?.updatedAt ?? null,
      online: dashboard?.online ?? false,
      mode: dashboard?.mode ?? null,
      actuators: dashboard?.actuators ?? EMPTY_ACTUATORS,
      hasActuatorState: dashboard?.hasActuatorState ?? false,
      history,
      alarms,
      thresholds,
      thresholdsLoaded,
      loading,
      error,
      applyThresholds,
    };
  }
