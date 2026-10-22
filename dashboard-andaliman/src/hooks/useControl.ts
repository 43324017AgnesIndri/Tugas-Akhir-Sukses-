"use client";

import { useCallback, useState } from "react";
import { sendJson } from "@/lib/client";
import type { ActuatorKey, Actuators, Mode } from "@/lib/types";

export interface ControlNotice {
  ok: boolean;
  text: string;
}

export function useControl(serverMode: Mode | null, serverActuators: Actuators, online: boolean) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<ControlNotice | null>(null);

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
      await send({ type: "mode", value: m });
    },
    [send]
  );

  const setActuator = useCallback(
    async (key: ActuatorKey, on: boolean) => {
      await send({ type: "actuator", target: key, state: on });
    },
    [send]
  );

  return { mode: serverMode, actuators: serverActuators, busy, notice, setMode, setActuator };
}
