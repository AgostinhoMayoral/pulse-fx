export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  if (value > 0) {
    return `▲ +${value.toFixed(2)}%`;
  }
  if (value < 0) {
    return `▼ ${value.toFixed(2)}%`;
  }
  return `– ${value.toFixed(2)}%`;
}

export function formatValue(value: number | null | undefined, periodicity: 'DAILY' | 'MONTHLY'): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (periodicity === 'DAILY') {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// A bare "333.98" doesn't tell a non-finance reader whether that's money, a
// rate, or an index. Wrap the formatted number with the unit the backend
// attaches per series (R$, % a.a., pts de índice, ...) so it never reads as
// a naked number.
export function formatValueWithUnit(
  value: number | null | undefined,
  periodicity: 'DAILY' | 'MONTHLY',
  prefix?: string | null,
  suffix?: string | null,
): string {
  const formatted = formatValue(value, periodicity);

  if (value === null || value === undefined) {
    return formatted;
  }

  const withPrefix = prefix ? `${prefix} ${formatted}` : formatted;
  return suffix ? `${withPrefix} ${suffix}` : withPrefix;
}

const SOURCE_LABELS: Record<string, string> = {
  BCB_OLINDA: 'Banco Central (câmbio)',
  BCB_SGS: 'Banco Central (séries)',
  FRED: 'Fed (EUA)',
};

export function formatSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source.replace('_', ' ');
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day!).toLocaleDateString('pt-BR');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function variationClassName(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'variation-neutral';
  }
  if (value > 0) {
    return 'variation-positive';
  }
  if (value < 0) {
    return 'variation-negative';
  }
  return 'variation-neutral';
}
