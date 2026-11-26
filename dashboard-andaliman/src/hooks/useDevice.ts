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
    HistoryRange,
    Thresholds,
  } from "@/lib/types";
  import { ACTUATORS_OFF, DEFAULT_THRESHOLDS, severityFromStatus, toChartPoints } from "@/lib/utils";
  import { THRESHOLD_RANGE_ERRORS } from "@/lib/threshold-validation";

  const tanggal = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  // F3: semua data diambil dari /api/... (InfluxDB dan Supabase)
  export function useDevice(historyRange: HistoryRange = "6h") {
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
          throw new Error("Your session has expired. Please log in again.");
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((json as { error?: string }).error ?? "Failed to retrieve data from the server.");
        return json as T;
      },
      [router]
    );

    // Latest data: every 5 seconds
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
  if (alive) {
    setDashboard(null);
    setError(e instanceof Error ? e.message : "Failed to retrieve data.");
  }
}finally {
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

    // Chart history uses the same range and aggregation interval as the Monitoring page.
    useEffect(() => {
      let alive = true;
      const load = async () => {
        try {
          const { points } = await getJson<{ points: HistoryPoint[] }>(`/api/history?range=${historyRange}`);
          if (alive) setHistory(toChartPoints(points, historyRange));
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
    }, [getJson, historyRange]);

    // Alarms: every 30 seconds
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

    // Thresholds: once when the page loads
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

    // Save thresholds to Supabase (admin-only; also enforced on the server and by RLS).
    const applyThresholds = useCallback(async (v: Thresholds): Promise<ApplyResult> => {
      if ([v.tmin, v.tmax, v.hmin, v.hmax].some((n) => !Number.isFinite(n))) {
        return { ok: false, message: "All fields must contain valid numbers." };
      }
      const rangeErrors = [];
      if (v.tmin >= v.tmax) {
        rangeErrors.push(THRESHOLD_RANGE_ERRORS.temperature);
      }
      if (v.hmin >= v.hmax) {
        rangeErrors.push(THRESHOLD_RANGE_ERRORS.humidity);
      }
      if (rangeErrors.length) return { ok: false, message: rangeErrors.join(" ") };
      try {
        const res = await fetch("/api/threshold", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(v),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string; thresholds?: Thresholds };
        if (!res.ok || !json.thresholds) {
          return { ok: false, message: json.error ?? "Failed to save thresholds." };
        }
        setThresholds(json.thresholds);
        return { ok: true, message: "Thresholds saved to the database." };
      } catch {
        return { ok: false, message: "Unable to connect to the server." };
      }
    }, []);

    return {
      deviceId: dashboard?.deviceId ?? "andaliman01",
      reading: dashboard?.reading ?? null,
      updatedAt: dashboard?.updatedAt ?? null,
      online: dashboard?.online ?? false,
      mode: dashboard?.mode ?? null,
      actuators: dashboard?.actuators ?? ACTUATORS_OFF,
      hasActuatorState: dashboard?.hasActuatorState ?? false,
      safeReason: dashboard?.safeReason ?? null,
      history,
      alarms,
      thresholds,
      thresholdsLoaded,
      loading,
      error,
      applyThresholds,
    };
  }
