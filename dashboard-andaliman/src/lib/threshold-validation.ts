import type { Thresholds } from "./types";

type FieldKey = keyof Thresholds;
type ThresholdFormValues = Record<FieldKey, string>;

export const THRESHOLD_RANGE_ERRORS = {
  temperature: "Invalid temperature range. The lower limit must be less than the upper limit.",
  humidity: "Invalid humidity range. The lower limit must be less than the upper limit.",
} as const;

export interface ThresholdFormValidation {
  values: Thresholds | null;
  invalidFields: Partial<Record<FieldKey, boolean>>;
  temperatureError: string | null;
  humidityError: string | null;
}

const parseValue = (value: string): number | null => {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export function validateThresholdForm(form: ThresholdFormValues): ThresholdFormValidation {
  const tmin = parseValue(form.tmin);
  const tmax = parseValue(form.tmax);
  const hmin = parseValue(form.hmin);
  const hmax = parseValue(form.hmax);
  const temperatureMissing = tmin === null || tmax === null;
  const humidityMissing = hmin === null || hmax === null;
  const temperatureRangeInvalid = tmin !== null && tmax !== null && tmin >= tmax;
  const humidityRangeInvalid = hmin !== null && hmax !== null && hmin >= hmax;
  const temperatureError = temperatureMissing
    ? "Enter valid numbers for both temperature limits."
    : temperatureRangeInvalid
      ? THRESHOLD_RANGE_ERRORS.temperature
      : null;
  const humidityError = humidityMissing
    ? "Enter valid numbers for both humidity limits."
    : humidityRangeInvalid
      ? THRESHOLD_RANGE_ERRORS.humidity
      : null;

  const invalidFields: Partial<Record<FieldKey, boolean>> = {};
  if (tmin === null || temperatureRangeInvalid) invalidFields.tmin = true;
  if (tmax === null || temperatureRangeInvalid) invalidFields.tmax = true;
  if (hmin === null || humidityRangeInvalid) invalidFields.hmin = true;
  if (hmax === null || humidityRangeInvalid) invalidFields.hmax = true;

  const validation = { invalidFields, temperatureError, humidityError };
  if (
    temperatureError ||
    humidityError ||
    tmin === null ||
    tmax === null ||
    hmin === null ||
    hmax === null
  ) {
    return { values: null, ...validation };
  }

  return { values: { tmin, tmax, hmin, hmax }, ...validation };
}
