"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Severity } from "@/lib/types";

interface RangeVisual {
  current: number | null;
  min: number;
  max: number;
  scaleMin: number;
  scaleMax: number;
  unit: string;
}

interface Props {
  label: string;
  value: string;
  badge: string;
  severity: Severity;
  icon?: ReactNode;
  accent?: "temperature" | "humidity" | "device";
  hint?: string;
  range?: RangeVisual;
  unavailable?: boolean;
  loading?: boolean;
  countUp?: boolean;
}

function RangeBar({ label, range }: { label: string; range: RangeVisual }) {
  const scale = range.scaleMax - range.scaleMin;
  const zoneStart = Math.max(0, Math.min(100, ((range.min - range.scaleMin) / scale) * 100));
  const zoneEnd = Math.max(0, Math.min(100, ((range.max - range.scaleMin) / scale) * 100));
  const marker = range.current === null
    ? null
    : Math.max(5, Math.min(95, ((range.current - range.scaleMin) / scale) * 100));
  const outOfRange = range.current !== null && (range.current < range.min || range.current > range.max);
  const gradientId = `range-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const formatLimit = (number: number) =>
    number.toLocaleString("en-US", { maximumFractionDigits: 1 });

  return (
    <div className={`stat-range${marker === null ? " is-empty" : ""}`}>
      <svg
        className="stat-range-track"
        viewBox="0 0 100 14"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} limit: ${formatLimit(range.min)} to ${formatLimit(range.max)} ${range.unit}${range.current === null ? ", no current reading" : `, current value ${formatLimit(range.current)} ${range.unit}`}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#71B77E" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
        </defs>
        <rect className="range-track-base" x="0" y="3" width="100" height="8" rx="4" />
        <rect
          className="range-track-ideal"
          fill={`url(#${gradientId})`}
          x={zoneStart}
          y="3"
          width={Math.max(0, zoneEnd - zoneStart)}
          height="8"
          rx="4"
        />
        {marker !== null && (
          <circle
            className={`range-track-marker${outOfRange ? " is-out-of-range" : ""}`}
            cx={marker}
            cy="7"
            r="6"
          />
        )}
      </svg>
      <div className="stat-range-labels" aria-hidden="true">
        <span>{formatLimit(range.min)} {range.unit}</span>
        <span>{formatLimit(range.max)} {range.unit}</span>
      </div>
    </div>
  );
}

export default function StatCard({
  label,
  value,
  badge,
  severity,
  icon,
  accent,
  hint,
  range,
  unavailable = false,
  loading = false,
  countUp = false,
}: Props) {
  const [animatedValue, setAnimatedValue] = useState<{ source: string; display: string } | null>(null);
  const hasAnimated = useRef(false);
  const displayValue = animatedValue?.source === value ? animatedValue.display : value;

  useEffect(() => {
    if (!countUp || hasAnimated.current) return;

    const number = value.match(/-?\d+(?:\.\d+)?/);
    if (!number) return;

    hasAnimated.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = Number(number[0]);
    const suffix = value.slice((number.index ?? 0) + number[0].length);
    const start = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / 520);
      const eased = 1 - (1 - progress) ** 3;
      setAnimatedValue({ source: value, display: `${(target * eased).toFixed(1)}${suffix}` });
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [countUp, value]);

  return (
    <div className={`c stat-card${accent ? ` stat-${accent}` : ""}${unavailable ? " is-unavailable" : ""}${loading ? " is-loading" : ""}`}>
      <div className="stat-card-heading">
        {icon && <span className="stat-icon" aria-hidden="true">{icon}</span>}
        <span className="lbl">{label}</span>
      </div>
      <div className={`big${value === "Unavailable" ? " is-unavailable" : ""}`}>
        {loading ? <span className="kpi-skeleton" aria-label="Loading value" /> : displayValue}
      </div>
      <span className={`b tone-${severity} stat-badge`}>{badge}</span>
      {range && <RangeBar label={label} range={range} />}
      {hint && <div className="rng">{hint}</div>}
    </div>
  );
}
