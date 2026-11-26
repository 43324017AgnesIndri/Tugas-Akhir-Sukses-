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
                ? "Command sent. The status will update when the device responds."
                : "Command sent to the broker, but the device is offline and may not receive it.",
            }
          : { ok: false, text: r.error ?? "Failed to send command." }
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
