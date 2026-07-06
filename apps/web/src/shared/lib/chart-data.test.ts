import { describe, expect, it } from 'vitest';
import { collapseFlatRuns } from './chart-data.js';

function point(value: number) {
  return { value };
}

describe('collapseFlatRuns', () => {
  it('keeps only the endpoints of a long run of repeated values', () => {
    const points = [10, 10, 10, 10, 10, 12, 12, 12, 9, 9].map(point);

    const result = collapseFlatRuns(points).map((p) => p.value);

    expect(result).toEqual([10, 10, 12, 12, 9, 9]);
  });

  it('keeps every point when every value changes', () => {
    const points = [1, 2, 3, 4].map(point);

    expect(collapseFlatRuns(points)).toEqual(points);
  });

  it('keeps first and last point even when the whole series is flat', () => {
    const points = [5, 5, 5, 5].map(point);

    const result = collapseFlatRuns(points).map((p) => p.value);

    expect(result).toEqual([5, 5]);
  });

  it('handles a single point without throwing', () => {
    const points = [point(7)];

    expect(collapseFlatRuns(points)).toEqual(points);
  });
});
