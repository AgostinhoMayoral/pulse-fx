import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatPercent, formatValue, variationClassName } from './format.js';

describe('format helpers', () => {
  it('formats positive and negative percentages with a direction glyph', () => {
    expect(formatPercent(1.234)).toBe('▲ +1.23%');
    expect(formatPercent(-2.5)).toBe('▼ -2.50%');
    expect(formatPercent(0)).toBe('– 0.00%');
    expect(formatPercent(null)).toBe('N/A');
  });

  it('formats values by periodicity', () => {
    expect(formatValue(5.1234, 'DAILY')).toContain('5,1234');
    expect(formatValue(10.5, 'MONTHLY')).toContain('10,50');
  });

  it('formats ISO dates to pt-BR', () => {
    expect(formatDate('2026-01-12')).toBe('12/01/2026');
  });

  it('formats ISO timestamps to pt-BR', () => {
    expect(formatDateTime('2026-01-12T15:30:00.000Z')).toMatch(/12\/01\/2026/);
  });

  it('returns css classes for variation direction', () => {
    expect(variationClassName(1)).toBe('variation-positive');
    expect(variationClassName(-1)).toBe('variation-negative');
    expect(variationClassName(null)).toBe('variation-neutral');
  });
});
