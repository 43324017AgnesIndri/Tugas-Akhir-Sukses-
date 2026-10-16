"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Mengambil data dari API, dengan pembaruan berkala (intervalMs) dan reload manual.
// url = null berarti jangan mengambil apa pun.
export function useApi<T>(url: string | null, intervalMs = 0) {
  const router = useRouter();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) return;
    let alive = true;

    const load = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const json = (await res.json().catch(() => ({}))) as T & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Gagal mengambil data dari server.");
        if (alive) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Gagal mengambil data.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();
    const id = intervalMs > 0 ? setInterval(load, intervalMs) : undefined;
    return () => {
      alive = false;
      if (id) clearInterval(id);
    };
  }, [url, intervalMs, tick, router]);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  return { data, error, loading: url ? loading : false, reload };
}
