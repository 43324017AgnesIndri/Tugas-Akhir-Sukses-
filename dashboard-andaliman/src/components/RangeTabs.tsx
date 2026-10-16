"use client";

import type { HistoryRange } from "@/lib/types";
import { RANGES } from "@/lib/utils";

interface Props {
  value: HistoryRange;
  onChange: (r: HistoryRange) => void;
  options: HistoryRange[];
}

export default function RangeTabs({ value, onChange, options }: Props) {
  return (
    <div className="sw">
      {RANGES.filter((r) => options.includes(r.key)).map((r) => (
        <button key={r.key} type="button" className={value === r.key ? "on" : ""} onClick={() => onChange(r.key)}>
          {r.label}
        </button>
      ))}
    </div>
  );
}
