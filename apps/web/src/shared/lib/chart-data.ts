interface ValuePoint {
  value: number;
}

// Some series (e.g. Selic, published daily by BCB SGS even though it only
// changes on Copom decisions) carry hundreds of points where the value just
// repeats. Feeding all of them to the chart is not just wasteful — cramming
// that many nearly-overlapping curve segments into a narrow viewport made
// the line visibly stop rendering partway through on some browsers/widths
// (verified: the underlying SVG path data was complete, but rendering that
// many points that close together degraded the actual pixels drawn).
// Keeping only the first/last point of every flat run reproduces the exact
// same shape — a flat run is fully described by its two endpoints — with a
// fraction of the points.
export function collapseFlatRuns<T extends ValuePoint>(points: T[]): T[] {
  return points.filter((point, index) => {
    if (index === 0 || index === points.length - 1) {
      return true;
    }
    return point.value !== points[index - 1]!.value || point.value !== points[index + 1]!.value;
  });
}
