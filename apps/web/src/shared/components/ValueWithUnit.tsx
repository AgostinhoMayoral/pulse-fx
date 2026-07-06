import { formatValue } from '../lib/format.js';

interface ValueWithUnitProps {
  value: number | null | undefined;
  periodicity: 'DAILY' | 'MONTHLY';
  prefix?: string | null;
  suffix?: string | null;
  className?: string;
}

// The unit (R$, % a.a., pts de índice, ...) rides alongside the number but
// must never compete with it visually — otherwise a long unit like "pts de
// índice" reads as loud as the number itself and, at the hero font size,
// overflows its column instead of wrapping. Rendering it as a smaller,
// muted span keeps the number the one thing the eye lands on first and
// gives the browser a natural word-break point to wrap on if space is tight.
export function ValueWithUnit({ value, periodicity, prefix, suffix, className }: ValueWithUnitProps) {
  const formatted = formatValue(value, periodicity);

  if (value === null || value === undefined) {
    return <strong className={className}>{formatted}</strong>;
  }

  return (
    <strong className={className}>
      {prefix ? <span className="value-unit">{prefix} </span> : null}
      {formatted}
      {suffix ? <span className="value-unit"> {suffix}</span> : null}
    </strong>
  );
}
