import { describe, expect, it } from 'vitest';
import { calculateVariation, type Observation } from './calculate-variation.js';

function obs(date: string, value: number): Observation {
  return { referenceDate: new Date(`${date}T00:00:00.000Z`), value };
}

describe('calculateVariation', () => {
  it('calculates daily variation against 5 business days prior', () => {
    const observations: Observation[] = [
      obs('2026-01-02', 5.0),
      obs('2026-01-03', 5.1),
      obs('2026-01-06', 5.2),
      obs('2026-01-07', 5.3),
      obs('2026-01-08', 5.4),
      obs('2026-01-09', 5.5),
      obs('2026-01-12', 5.6),
    ];

    const result = calculateVariation(observations, 'DAILY');

    expect(result).not.toBeNull();
    expect(result!.value).toBe(5.6);
    expect(result!.comparisonDate.toISOString().slice(0, 10)).toBe('2026-01-03');
    expect(result!.percentChange).toBeCloseTo(9.804, 3);
  });

  it('skips weekends when searching for comparison date', () => {
    const observations: Observation[] = [
      obs('2026-01-02', 10),
      obs('2026-01-05', 10.5),
      obs('2026-01-12', 11),
    ];

    const result = calculateVariation(observations, 'DAILY');

    expect(result).not.toBeNull();
    expect(result!.comparisonDate.toISOString().slice(0, 10)).toBe('2026-01-05');
  });

  it('uses last available observation when holiday creates a gap', () => {
    const observations: Observation[] = [
      obs('2026-01-02', 4.9),
      obs('2026-01-03', 5.0),
      obs('2026-01-06', 5.1),
      obs('2026-01-07', 5.2),
      obs('2026-01-08', 5.3),
      obs('2026-01-09', 5.4),
      obs('2026-01-13', 5.5),
    ];

    const result = calculateVariation(observations, 'DAILY');

    expect(result).not.toBeNull();
    expect(result!.comparisonDate.toISOString().slice(0, 10)).toBe('2026-01-06');
  });

  it('calculates monthly variation against previous calendar month', () => {
    const observations: Observation[] = [
      obs('2025-10-31', 100),
      obs('2025-11-30', 110),
      obs('2025-12-31', 121),
    ];

    const result = calculateVariation(observations, 'MONTHLY');

    expect(result).not.toBeNull();
    expect(result!.value).toBe(121);
    expect(result!.comparisonDate.toISOString().slice(0, 10)).toBe('2025-11-30');
    expect(result!.percentChange).toBeCloseTo(10, 5);
  });

  it('returns null when monthly comparison month is missing', () => {
    const observations: Observation[] = [obs('2025-12-31', 121)];

    const result = calculateVariation(observations, 'MONTHLY');

    expect(result).toBeNull();
  });

  it('returns null when history is insufficient', () => {
    const observations: Observation[] = [obs('2026-01-12', 5.6)];

    const result = calculateVariation(observations, 'DAILY');

    expect(result).toBeNull();
  });
});
