"use client";

import { useState } from "react";
import { Droplets, SlidersHorizontal, Thermometer } from "lucide-react";
import type { ApplyResult, Thresholds } from "@/lib/types";
import { validateThresholdForm } from "@/lib/threshold-validation";

interface Props {
  thresholds: Thresholds;
  onApply: (v: Thresholds) => Promise<ApplyResult>;
  readOnly?: boolean;
}

type FieldKey = keyof Thresholds;

function LoadingIcon() {
  return (
    <svg className="threshold-spinner" aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}

export default function ThresholdForm({ thresholds, onApply, readOnly = false }: Props) {
  const [form, setForm] = useState<Record<FieldKey, string>>({
    tmin: String(thresholds.tmin),
    tmax: String(thresholds.tmax),
    hmin: String(thresholds.hmin),
    hmax: String(thresholds.hmax),
  });
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const validation = validateThresholdForm(form);
  const { invalidFields, temperatureError, humidityError } = validation;

  const updateField = (key: FieldKey, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setTouched((current) => ({ ...current, [key]: true }));
    setResult(null);
  };

  const apply = async () => {
    setSubmitted(true);
    if (!validation.values) return;

    setBusy(true);
    setResult(null);
    try {
      const applied = await onApply(validation.values);
      setResult(applied);
    } finally {
      setBusy(false);
    }
  };

  const renderRange = (
    kind: "temperature" | "humidity",
    title: string,
    lower: FieldKey,
    upper: FieldKey,
    error: string | null,
    Icon: typeof Thermometer | typeof Droplets,
    labels: [string, string],
    unit: string,
  ) => {
    const visibleError = submitted || touched[lower] || touched[upper] ? error : null;
    return (
      <section className="threshold-range" aria-labelledby={`${kind}-range-title`}>
        <h3 id={`${kind}-range-title`} className="threshold-range-title">
          <span className="threshold-range-icon"><Icon size={20} strokeWidth={1.8} /></span>
          <span>{title}</span>
        </h3>
        <div className="threshold-range-fields">
          {([lower, upper] as const).map((key, index) => {
            const label = labels[index];
            const errorId = `${kind}-range-error`;
            const showFieldError = Boolean((submitted || touched[key]) && invalidFields[key]);
            return (
              <div className="threshold-field" key={key}>
                <label htmlFor={`threshold-${key}`}>{label}</label>
                <div className={`threshold-input-wrap${showFieldError ? " has-error" : ""}`}>
                  <input
                    id={`threshold-${key}`}
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    disabled={readOnly || busy}
                    value={form[key]}
                    aria-invalid={showFieldError}
                    aria-describedby={visibleError ? errorId : undefined}
                    onChange={(event) => updateField(key, event.target.value)}
                    onBlur={() => setTouched((current) => ({ ...current, [key]: true }))}
                  />
                  <span className="threshold-unit" aria-hidden="true">{unit}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div
          id={`${kind}-range-error`}
          className={`threshold-validation${visibleError ? " is-visible" : ""}`}
          role={visibleError ? "alert" : undefined}
          aria-live="polite"
        >
          {visibleError && <><span aria-hidden="true">!</span>{visibleError}</>}
        </div>
      </section>
    );
  };

  return (
    <section className="c threshold-form" aria-labelledby="threshold-form-title">
      <header className="threshold-form-header">
        <span className="threshold-header-icon" aria-hidden="true">
          <SlidersHorizontal size={22} strokeWidth={1.8} />
        </span>
        <div>
          <span className="threshold-eyebrow">SENSOR CONFIGURATION</span>
          <h2 id="threshold-form-title">Threshold Settings</h2>
          <p>Set the ideal range to keep storage room conditions stable.</p>
        </div>
      </header>

      <div className="threshold-ranges">
        {renderRange(
          "temperature",
          "Temperature Range (°C)",
          "tmin",
          "tmax",
          temperatureError,
          Thermometer,
          ["Lower limit", "Upper limit"],
          "°C",
        )}
        {renderRange(
          "humidity",
          "Humidity Range (%)",
          "hmin",
          "hmax",
          humidityError,
          Droplets,
          ["Lower limit", "Upper limit"],
          "%",
        )}
      </div>

      <button
        type="button"
        className="apply threshold-apply"
        disabled={readOnly || busy}
        onClick={apply}
        aria-busy={busy}
      >
        {busy ? <><LoadingIcon />Saving settings...</> : <>Apply Thresholds<span aria-hidden="true">→</span></>}
      </button>

      {result && (
        <div className={`threshold-result note tone-${result.ok ? "ok" : "bd"}`} role={result.ok ? "status" : "alert"}>
          <span className="threshold-result-icon" aria-hidden="true">{result.ok ? "✓" : "!"}</span>
          <span>{result.message}</span>
        </div>
      )}
      {readOnly && <p className="threshold-readonly">Only admins can change threshold settings.</p>}
    </section>
  );
}
