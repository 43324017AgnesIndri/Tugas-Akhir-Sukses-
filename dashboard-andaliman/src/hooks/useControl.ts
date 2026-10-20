"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendJson } from "@/lib/client";
import type { ActuatorKey, Actuators, Mode } from "@/lib/types";
import { ACTUATORS_OFF } from "@/lib/utils";

// Status di dashboard berasal dari InfluxDB (diperbarui tiap 5 detik setelah ESP32 menjawab).
// Agar tombol terasa langsung merespons, nilai yang baru dikirim ditampilkan dulu selama HOLD_MS.
const HOLD_MS = 10000;

export interface ControlNotice {
  ok: boolean;
  text: string;
}

export function useControl(serverMode: Mode | null, serverActuators: Actuators, online: boolean) {
  const [modeHold, setModeHold] = useState<Mode | null>(null);
  const [actHold, setActHold] = useState<Partial<Actuators>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<ControlNotice | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const hold = useCallback((mode: Mode | null, acts: Partial<Actuators>) => {
    setModeHold(mode);
    setActHold(acts);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setModeHold(null);
      setActHold({});
    }, HOLD_MS);
  }, []);

  const send = useCallback(
    async (body: object): Promise<boolean> => {
      setBusy(true);
      const r = await sendJson("POST", "/api/control", body);
      setBusy(false);
      setNotice(
        r.ok
          ? {
              ok: true,
              text: online
                ? "Perintah terkirim. Status berubah setelah perangkat menjawab."
                : "Perintah terkirim ke broker, tetapi perangkat sedang offline sehingga mungkin tidak diterima.",
            }
          : { ok: false, text: r.error ?? "Perintah gagal dikirim." }
      );
      return r.ok;
    },
    [online]
  );

  const setMode = useCallback(
    async (m: Mode) => {
      if (!(await send({ type: "mode", value: m }))) return;
      // SAFE mematikan semua aktuator; AUTO dikendalikan perangkat sehingga tidak ditebak di sini
      hold(m, m === "SAFE" ? ACTUATORS_OFF : {});
    },
    [send, hold]
  );

  const setActuator = useCallback(
    async (key: ActuatorKey, on: boolean) => {
      if (!(await send({ type: "actuator", target: key, state: on }))) return;
      hold(modeHold, { ...actHold, [key]: on });
    },
    [send, hold, modeHold, actHold]
  );

  const mode = modeHold ?? serverMode;
  const actuators: Actuators = { ...serverActuators, ...actHold };

  return { mode, actuators, busy, notice, setMode, setActuator };
}
