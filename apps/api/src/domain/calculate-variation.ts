export type Periodicity = 'DAILY' | 'MONTHLY';

export interface Observation {
  referenceDate: Date;
  value: number;
}

export interface VariationResult {
  value: number;
  percentChange: number;
  comparisonDate: Date;
}

const BUSINESS_DAYS_LOOKBACK = 5;

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function subtractBusinessDays(from: Date, businessDays: number): Date {
  const result = new Date(from);
  let remaining = businessDays;

  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() - 1);
    if (!isWeekend(result)) {
      remaining -= 1;
    }
  }

  return result;
}

function previousCalendarMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
}

function buildObservationMap(observations: Observation[]): Map<string, Observation> {
  const map = new Map<string, Observation>();

  for (const observation of observations) {
    map.set(toDateKey(observation.referenceDate), observation);
  }

  return map;
}

function findLatestOnOrBefore(
  observationMap: Map<string, Observation>,
  targetDate: Date,
): Observation | null {
  const cursor = new Date(targetDate);

  for (let i = 0; i < 366; i += 1) {
    const key = toDateKey(cursor);
    const match = observationMap.get(key);
    if (match) {
      return match;
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return null;
}

function findLatestObservation(observations: Observation[]): Observation | null {
  if (observations.length === 0) {
    return null;
  }

  return [...observations].sort(
    (a, b) => b.referenceDate.getTime() - a.referenceDate.getTime(),
  )[0]!;
}

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) {
    return 0;
  }
  return ((current - previous) / previous) * 100;
}

export function calculateVariation(
  observations: Observation[],
  periodicity: Periodicity,
  referenceDate?: Date,
): VariationResult | null {
  if (observations.length === 0) {
    return null;
  }

  const observationMap = buildObservationMap(observations);
  const latest = referenceDate
    ? findLatestOnOrBefore(observationMap, referenceDate) ?? findLatestObservation(observations)
    : findLatestObservation(observations);

  if (!latest) {
    return null;
  }

  let comparison: Observation | null = null;

  if (periodicity === 'DAILY') {
    const targetDate = subtractBusinessDays(latest.referenceDate, BUSINESS_DAYS_LOOKBACK);
    comparison = findLatestOnOrBefore(observationMap, targetDate);
  } else {
    const targetMonth = previousCalendarMonth(latest.referenceDate);
    const monthEnd = new Date(
      Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0),
    );
    comparison = findLatestOnOrBefore(observationMap, monthEnd);
  }

  if (!comparison) {
    return null;
  }

  if (toDateKey(comparison.referenceDate) === toDateKey(latest.referenceDate)) {
    return null;
  }

  return {
    value: latest.value,
    percentChange: calculatePercentChange(latest.value, comparison.value),
    comparisonDate: comparison.referenceDate,
  };
}

export function formatDateOnly(date: Date): string {
  return toDateKey(date);
}

export function parseDateOnly(value: string): Date {
  return parseDateKey(value);
}

export const VARIATION_RULES = {
  DAILY: `${BUSINESS_DAYS_LOOKBACK} business days lookback`,
  MONTHLY: '1 calendar month lookback',
} as const;
