export type TrendDirection = 'up' | 'down' | 'neutral';

interface SparklineProps {
  values: number[];
  direction: TrendDirection;
}

const WIDTH = 88;
const HEIGHT = 30;

const DOT_COLOR_BY_DIRECTION: Record<TrendDirection, string> = {
  up: 'var(--status-good)',
  down: 'var(--status-critical)',
  neutral: 'var(--ink-muted)',
};

export function Sparkline({ values, direction }: SparklineProps) {
  if (values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = WIDTH / (values.length - 1);

  const coordinates = values.map((value, index) => ({
    x: index * step,
    y: HEIGHT - ((value - min) / range) * HEIGHT,
  }));

  const points = coordinates.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const last = coordinates.at(-1)!;

  return (
    <svg
      className="sparkline"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--ink-muted)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r="2.5" fill={DOT_COLOR_BY_DIRECTION[direction]} />
    </svg>
  );
}
